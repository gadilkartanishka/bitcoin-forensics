import React, { useEffect, useMemo, useState } from "react";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import graphData from "../data/viz_export_real.json";

/* =========================================================
   CONSTANTS
========================================================= */

const NODE_WIDTH = 180;
const NODE_HEIGHT = 72;

const COLORS = {
  wallet: "#34d399",
  transaction: "#3b82f6",
  ip: "#f59e0b",
};

const EDGE_COLOR = "#94a3b8";

/* =========================================================
   HELPERS
========================================================= */

function cleanString(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}

/*
  Detect node type from:
  - node.type
  - node.nodeType
  - id prefix
  - common field names
*/
function getNodeType(id, node = {}) {
  const explicitType =
    node.type ??
    node.nodeType ??
    node.entity_type ??
    node.entityType ??
    node.kind;

  if (explicitType) {
    const type = String(explicitType).toLowerCase();

    if (
      type.includes("wallet") ||
      type.includes("address") ||
      type === "user"
    ) {
      return "wallet";
    }

    if (
      type.includes("transaction") ||
      type === "tx"
    ) {
      return "transaction";
    }

    if (
      type === "ip" ||
      type.includes("ip_address") ||
      type.includes("ipaddress")
    ) {
      return "ip";
    }
  }

  const value = String(id || "").toLowerCase();

  if (
    value.startsWith("wallet:") ||
    value.startsWith("address:")
  ) {
    return "wallet";
  }

  if (
    value.startsWith("tx:") ||
    value.startsWith("transaction:")
  ) {
    return "transaction";
  }

  if (value.startsWith("ip:")) {
    return "ip";
  }

  /*
    Detect Bitcoin-like wallet addresses.
  */
  const raw = value.replace(
    /^(wallet|address):/,
    ""
  );

  if (
    /^[13][a-z0-9]{25,40}$/i.test(raw) ||
    /^bc1[a-z0-9]{20,90}$/i.test(raw)
  ) {
    return "wallet";
  }

  /*
    Detect IPv4.
  */
  if (
    /^\d{1,3}(\.\d{1,3}){3}$/.test(raw)
  ) {
    return "ip";
  }

  /*
    Transaction IDs often start with tx or are
    64-character hexadecimal strings.
  */
  if (
    /^[a-f0-9]{64}$/i.test(raw)
  ) {
    return "transaction";
  }

  return "wallet";
}

/* =========================================================
   NODE LABEL
========================================================= */

function getDisplayLabel(node, type) {
  const label = cleanString(
    node?.label ??
      node?.name ??
      node?.address ??
      node?.txid ??
      node?.ip ??
      node?.id
  );

  if (type === "wallet") {
    const wallet = label
      .replace(/^wallet:/i, "")
      .replace(/^address:/i, "");

    if (wallet.length > 18) {
      return `${wallet.slice(0, 8)}...${wallet.slice(-6)}`;
    }

    return wallet;
  }

  if (type === "transaction") {
    return label
      .replace(/^tx:/i, "")
      .replace(/^transaction:/i, "");
  }

  if (type === "ip") {
    return label.replace(/^ip:/i, "");
  }

  return label;
}

/* =========================================================
   CANONICAL NODE ID
========================================================= */

function canonicalNodeId(id, node = {}) {
  const raw = cleanString(
    id ??
      node.id ??
      node.address ??
      node.txid ??
      node.ip
  );

  if (!raw) return "";

  const type = getNodeType(raw, node);

  /*
    If already prefixed, keep it.
  */
  if (
    raw.startsWith("wallet:") ||
    raw.startsWith("tx:") ||
    raw.startsWith("transaction:") ||
    raw.startsWith("ip:")
  ) {
    if (raw.startsWith("transaction:")) {
      return `tx:${raw.slice("transaction:".length)}`;
    }

    return raw;
  }

  /*
    Add a stable prefix so raw wallet addresses,
    tx ids and IPs do not collide.
  */
  if (type === "wallet") {
    return `wallet:${raw}`;
  }

  if (type === "transaction") {
    return `tx:${raw}`;
  }

  return `ip:${raw}`;
}

/* =========================================================
   NORMALIZE DATA
========================================================= */

function normalizeGraphData(data) {
  if (!data) {
    return {
      nodes: [],
      edges: [],
    };
  }

  /*
    Most likely format:

    {
      nodes: [],
      edges: []
    }
  */

  let rawNodes = [];
  let rawEdges = [];

  if (
    Array.isArray(data.nodes) ||
    Array.isArray(data.edges)
  ) {
    rawNodes = Array.isArray(data.nodes)
      ? data.nodes
      : [];

    rawEdges = Array.isArray(data.edges)
      ? data.edges
      : [];
  }

  /*
    Support nested graph format.
  */
  else if (data.graph) {
    rawNodes = Array.isArray(data.graph.nodes)
      ? data.graph.nodes
      : [];

    rawEdges = Array.isArray(data.graph.edges)
      ? data.graph.edges
      : [];
  }

  /*
    Support separate wallet / transaction / IP arrays.
  */
  else {
    const wallets = Array.isArray(data.wallets)
      ? data.wallets
      : [];

    const transactions = Array.isArray(
      data.transactions
    )
      ? data.transactions
      : [];

    const ips = Array.isArray(data.ips)
      ? data.ips
      : [];

    rawNodes = [
      ...wallets.map((item) => ({
        ...item,
        type: "wallet",
      })),

      ...transactions.map((item) => ({
        ...item,
        type: "transaction",
      })),

      ...ips.map((item) => ({
        ...item,
        type: "ip",
      })),
    ];

    if (Array.isArray(data.relationships)) {
      rawEdges = data.relationships;
    } else if (Array.isArray(data.links)) {
      rawEdges = data.links;
    }
  }

  /*
    Normalize nodes.
  */
  const nodes = [];
  const idMap = new Map();

  for (const original of rawNodes) {
    if (!original) continue;

    const originalId =
      original.id ??
      original.address ??
      original.txid ??
      original.ip ??
      original.wallet;

    if (!originalId) continue;

    const id = canonicalNodeId(
      originalId,
      original
    );

    if (!id) continue;

    const type = getNodeType(
      originalId,
      original
    );

    const normalized = {
      ...original,
      id,
      type,
    };

    nodes.push(normalized);

    /*
      Map all possible representations to the same
      canonical ID.
    */
    idMap.set(String(originalId), id);
    idMap.set(String(originalId).toLowerCase(), id);

    idMap.set(id, id);

    const label =
      original.label ??
      original.name ??
      original.address ??
      original.txid ??
      original.ip;

    if (label) {
      idMap.set(String(label), id);
      idMap.set(
        String(label).toLowerCase(),
        id
      );
    }
  }

  function resolveEndpoint(value) {
    if (
      value === undefined ||
      value === null
    ) {
      return "";
    }

    const raw = String(value);

    if (idMap.has(raw)) {
      return idMap.get(raw);
    }

    if (
      idMap.has(raw.toLowerCase())
    ) {
      return idMap.get(
        raw.toLowerCase()
      );
    }

    /*
      Try prefixed forms.
    */
    const possibilities = [
      `wallet:${raw}`,
      `tx:${raw}`,
      `ip:${raw}`,
    ];

    for (const candidate of possibilities) {
      if (idMap.has(candidate)) {
        return idMap.get(candidate);
      }
    }

    return canonicalNodeId(raw);
  }

  /*
    Normalize edges.
  */
  const edges = [];

  rawEdges.forEach((edge, index) => {
    if (!edge) return;

    const sourceRaw =
      edge.source ??
      edge.from ??
      edge.src ??
      edge.from_id ??
      edge.source_id;

    const targetRaw =
      edge.target ??
      edge.to ??
      edge.dst ??
      edge.to_id ??
      edge.target_id;

    if (
      sourceRaw === undefined ||
      targetRaw === undefined
    ) {
      return;
    }

    const source =
      resolveEndpoint(sourceRaw);

    const target =
      resolveEndpoint(targetRaw);

    if (!source || !target) {
      return;
    }

    /*
      Only create edges when both endpoints exist.
    */
    if (
      !nodes.some((node) => node.id === source) ||
      !nodes.some((node) => node.id === target)
    ) {
      return;
    }

    const relation =
      edge.relation ??
      edge.relationship ??
      edge.type ??
      edge.label ??
      "";

    edges.push({
      ...edge,

      id:
        edge.id ??
        `edge-${index}-${source}-${target}`,

      source,
      target,

      relation: String(relation),

      amount:
        edge.amount ??
        edge.value ??
        edge.amount_btc ??
        edge.btc ??
        null,
    });
  });

  return {
    nodes,
    edges,
  };
}

/* =========================================================
   BUILD GRAPH
========================================================= */

function buildGraph(
  data,
  selectedId,
  depth,
  top
) {
  if (
    !data ||
    !Array.isArray(data.nodes)
  ) {
    return {
      nodes: [],
      edges: [],
    };
  }

  const allNodes = data.nodes;
  const allEdges = Array.isArray(data.edges)
    ? data.edges
    : [];

  if (!allNodes.length) {
    return {
      nodes: [],
      edges: [],
    };
  }

  const nodeMap = new Map();

  allNodes.forEach((node) => {
    if (node?.id) {
      nodeMap.set(node.id, node);
    }
  });

  /*
    Find root.
  */
  let rootId =
    selectedId &&
    nodeMap.has(selectedId)
      ? selectedId
      : null;

  /*
    If selected ID is not found, choose first wallet.
  */
  if (!rootId) {
    const wallet = allNodes.find(
      (node) =>
        getNodeType(node.id, node) ===
        "wallet"
    );

    if (wallet) {
      rootId = wallet.id;
    }
  }

  /*
    Last fallback: first node.
  */
  if (!rootId) {
    rootId = allNodes[0]?.id;
  }

  if (!rootId) {
    return {
      nodes: [],
      edges: [],
    };
  }

  /* -------------------------------------------------------
     Build undirected adjacency map.

     We deliberately traverse both directions because
     investigation should be able to move through:

       wallet -> transaction
       transaction -> wallet
       transaction -> IP
       IP -> transaction

  ------------------------------------------------------- */

  const adjacency = new Map();

  function addConnection(a, b) {
    if (!a || !b) return;

    if (!adjacency.has(a)) {
      adjacency.set(a, []);
    }

    adjacency.get(a).push(b);
  }

  allEdges.forEach((edge) => {
    if (
      !edge?.source ||
      !edge?.target
    ) {
      return;
    }

    addConnection(
      edge.source,
      edge.target
    );

    addConnection(
      edge.target,
      edge.source
    );
  });

  /* -------------------------------------------------------
     BFS
  ------------------------------------------------------- */

  const visited = new Set([rootId]);

  const levelMap = new Map();

  levelMap.set(rootId, 0);

  const queue = [
    {
      id: rootId,
      level: 0,
    },
  ];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) continue;

    if (current.level >= depth) {
      continue;
    }

    const neighbors =
      adjacency.get(current.id) || [];

    for (const neighbor of neighbors) {
      if (!nodeMap.has(neighbor)) {
        continue;
      }

      if (visited.has(neighbor)) {
        continue;
      }

      const nextLevel =
        current.level + 1;

      visited.add(neighbor);

      levelMap.set(
        neighbor,
        nextLevel
      );

      queue.push({
        id: neighbor,
        level: nextLevel,
      });
    }
  }

  /* -------------------------------------------------------
     Limit nodes.
  ------------------------------------------------------- */

  let visibleIds = Array.from(
    visited
  );

  if (visibleIds.length > top) {
    visibleIds = [
      rootId,
      ...visibleIds
        .filter(
          (id) => id !== rootId
        )
        .slice(
          0,
          Math.max(0, top - 1)
        ),
    ];
  }

  const visibleSet =
    new Set(visibleIds);

  /* -------------------------------------------------------
     Visible edges
  ------------------------------------------------------- */

  const visibleEdges =
    allEdges.filter(
      (edge) =>
        visibleSet.has(
          edge.source
        ) &&
        visibleSet.has(
          edge.target
        )
    );

  /* -------------------------------------------------------
     Group nodes by BFS level.
  ------------------------------------------------------- */

  const columns = new Map();

  visibleIds.forEach((id) => {
    const level =
      levelMap.get(id) ?? 0;

    if (!columns.has(level)) {
      columns.set(level, []);
    }

    columns
      .get(level)
      .push(id);
  });

  /* -------------------------------------------------------
     Calculate positions.
  ------------------------------------------------------- */

  const positions = new Map();

  const COLUMN_GAP = 360;
  const ROW_GAP = 150;

  const sortedLevels =
    Array.from(columns.keys()).sort(
      (a, b) => a - b
    );

  sortedLevels.forEach((level) => {
    const ids =
      columns.get(level) || [];

    const totalHeight =
      Math.max(
        0,
        (ids.length - 1) *
          ROW_GAP
      );

    ids.forEach(
      (id, index) => {
        positions.set(id, {
          x:
            120 +
            level *
              COLUMN_GAP,

          y:
            420 -
            totalHeight / 2 +
            index * ROW_GAP,
        });
      }
    );
  });

  /*
    Put root in the middle.
  */
  positions.set(rootId, {
    x: 120,
    y: 420,
  });

  /* -------------------------------------------------------
     React Flow nodes
  ------------------------------------------------------- */

  const flowNodes = visibleIds
    .map((id) => {
      const original =
        nodeMap.get(id);

      if (!original) {
        return null;
      }

      const type =
        getNodeType(
          id,
          original
        );

      const label =
        getDisplayLabel(
          original,
          type
        );

      const selected =
        id === rootId;

      return {
        id,

        type: "default",

        position:
          positions.get(id) || {
            x: 120,
            y: 420,
          },

        draggable: true,

        selectable: true,

        style: {
          width: NODE_WIDTH,

          minHeight:
            NODE_HEIGHT,

          borderRadius:
            type === "ip"
              ? "50%"
              : "12px",

          border: selected
            ? "4px solid #111827"
            : "2px solid white",

          background:
            COLORS[type] ||
            COLORS.wallet,

          color: "#111827",

          display: "flex",

          alignItems:
            "center",

          justifyContent:
            "center",

          padding: "10px",

          fontSize: 13,

          fontWeight: 600,

          boxShadow: selected
            ? "0 0 0 6px rgba(59,130,246,0.20)"
            : "0 3px 10px rgba(0,0,0,0.12)",

          textAlign: "center",

          wordBreak:
            "break-word",
        },

        data: {
          label,

          fullLabel:
            original.label ??
            original.name ??
            original.address ??
            original.txid ??
            original.ip ??
            original.id,

          nodeType: type,

          riskScore:
            original.risk_score ??
            original.riskScore,

          communityId:
            original.community_id ??
            original.communityId,

          timestamp:
            original.timestamp ??
            original.time ??
            original.date,

          fee:
            original.fee,

          scriptType:
            original.script_type ??
            original.scriptType,
        },
      };
    })
    .filter(Boolean);

  /* -------------------------------------------------------
     React Flow edges
  ------------------------------------------------------- */

  const flowEdges =
    visibleEdges.map(
      (edge, index) => {
        const relation =
          edge.relation || "";

        return {
          id:
            edge.id ??
            `edge-${index}-${edge.source}-${edge.target}`,

          source:
            edge.source,

          target:
            edge.target,

          type: "smoothstep",

          animated: false,

          markerEnd: {
            type:
              MarkerType.ArrowClosed,

            width: 18,

            height: 18,

            color:
              EDGE_COLOR,
          },

          style: {
            stroke:
              EDGE_COLOR,

            strokeWidth: 2,
          },

          label: relation,

          labelStyle: {
            fontSize: 11,

            fill: "#475569",

            fontWeight: 600,
          },

          labelBgStyle: {
            fill: "#ffffff",

            fillOpacity: 0.95,
          },

          labelBgPadding: [
            4,
            3,
          ],

          labelBgBorderRadius: 4,

          data: {
            relation,

            amount:
              edge.amount,
          },
        };
      }
    );

  return {
    nodes: flowNodes,
    edges: flowEdges,
  };
}

/* =========================================================
   TOOLTIP
========================================================= */

function NodeTooltip({ node }) {
  if (!node) return null;

  const data =
    node.data || {};

  return (
    <div
      style={{
        position: "absolute",

        left: 20,

        bottom: 20,

        zIndex: 50,

        width: 310,

        padding: 16,

        background: "#ffffff",

        border:
          "1px solid #e2e8f0",

        borderRadius: 12,

        boxShadow:
          "0 10px 30px rgba(0,0,0,0.15)",

        fontSize: 13,

        color: "#0f172a",
      }}
    >
      <div
        style={{
          fontWeight: 700,

          marginBottom: 8,

          fontSize: 15,

          textTransform:
            "capitalize",
        }}
      >
        {data.nodeType}
      </div>

      <div
        style={{
          wordBreak:
            "break-all",

          marginBottom: 8,
        }}
      >
        <strong>ID:</strong>{" "}
        {data.fullLabel}
      </div>

      {data.riskScore !==
        undefined &&
        data.riskScore !==
          null &&
        data.riskScore !==
          "" && (
          <div
            style={{
              marginTop: 5,
            }}
          >
            <strong>
              Risk:
            </strong>{" "}
            {data.riskScore}
          </div>
        )}

      {data.communityId !==
        undefined &&
        data.communityId !==
          null && (
          <div
            style={{
              marginTop: 5,
            }}
          >
            <strong>
              Community:
            </strong>{" "}
            {data.communityId}
          </div>
        )}

      {data.timestamp && (
        <div
          style={{
            marginTop: 5,
          }}
        >
          <strong>
            Time:
          </strong>{" "}
          {data.timestamp}
        </div>
      )}

      {data.fee !==
        undefined &&
        data.fee !== null && (
          <div
            style={{
              marginTop: 5,
            }}
          >
            <strong>
              Fee:
            </strong>{" "}
            {data.fee}
          </div>
        )}

      {data.scriptType && (
        <div
          style={{
            marginTop: 5,
          }}
        >
          <strong>
            Script:
          </strong>{" "}
          {data.scriptType}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function InvestigationGraph() {
  /*
    Normalize JSON once.
  */
  const normalizedData =
    useMemo(
      () =>
        normalizeGraphData(
          graphData
        ),
      []
    );

  /*
    Get available wallets.
  */
  const walletOptions =
    useMemo(() => {
      return normalizedData.nodes
        .filter(
          (node) =>
            getNodeType(
              node.id,
              node
            ) === "wallet"
        )
        .slice(0, 100);
    }, [normalizedData]);

  /*
    Start with the first real wallet
    instead of hard-coding an ID.
  */
  const firstWalletId =
    walletOptions[0]?.id || "";

  const [selectedId, setSelectedId] =
    useState(firstWalletId);

  const [depth, setDepth] =
    useState(1);

  const [top, setTop] =
    useState(20);

  const [selectedNode, setSelectedNode] =
    useState(null);

  /*
    If JSON loads/changes and the old
    selected wallet no longer exists,
    automatically select the first wallet.
  */
  useEffect(() => {
    if (!walletOptions.length) {
      return;
    }

    const exists =
      walletOptions.some(
        (wallet) =>
          wallet.id ===
          selectedId
      );

    if (!exists) {
      setSelectedId(
        walletOptions[0].id
      );
    }
  }, [
    walletOptions,
    selectedId,
  ]);

  /*
    Build graph according to:
      selected wallet
      depth
      top
  */
  const graph = useMemo(
    () =>
      buildGraph(
        normalizedData,

        selectedId,

        Number(depth),

        Number(top)
      ),
    [
      normalizedData,

      selectedId,

      depth,

      top,
    ]
  );

  const [
    nodes,
    setNodes,
    onNodesChange,
  ] = useNodesState(
    graph.nodes
  );

  const [
    edges,
    setEdges,
    onEdgesChange,
  ] = useEdgesState(
    graph.edges
  );

  /*
    Update React Flow whenever
    depth / wallet / top changes.
  */
  useEffect(() => {
    setNodes(graph.nodes);

    setEdges(graph.edges);

    setSelectedNode(null);
  }, [
    graph.nodes,
    graph.edges,
    setNodes,
    setEdges,
  ]);

  /* =======================================================
     NO DATA MESSAGE
  ======================================================= */

  if (!normalizedData.nodes.length) {
    return (
      <div
        style={{
          padding: 30,

          margin: 20,

          border:
            "1px solid #fecaca",

          borderRadius: 12,

          background: "#fef2f2",

          color: "#991b1b",

          fontFamily:
            "Arial, sans-serif",
        }}
      >
        <h3
          style={{
            marginTop: 0,
          }}
        >
          Investigation graph
          data unavailable
        </h3>

        <p>
          No usable nodes were
          found in:
        </p>

        <code>
          frontend/src/data/viz_export_real.json
        </code>

        <p>
          Make sure that file
          contains a graph with
          nodes.
        </p>
      </div>
    );
  }

  /* =======================================================
     MAIN UI
  ======================================================= */

  return (
    <div
      style={{
        width: "100%",

        height:
          "calc(100vh - 120px)",

        minHeight: 650,

        display: "flex",

        flexDirection:
          "column",

        background: "#ffffff",
      }}
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <div
        style={{
          padding:
            "20px 24px 12px",

          background:
            "#ffffff",
        }}
      >
        <div
          style={{
            display: "flex",

            justifyContent:
              "space-between",

            alignItems:
              "center",

            gap: 20,
          }}
        >
          {/* TITLE */}

          <div>
            <h2
              style={{
                margin: 0,

                fontSize: 24,

                color: "#0f172a",
              }}
            >
              Investigation Graph
            </h2>

            <div
              style={{
                marginTop: 5,

                color: "#64748b",

                fontSize: 15,
              }}
            >
              Explore wallet,
              transaction and IP
              relationships
            </div>
          </div>

          {/* CONTROLS */}

          <div
            style={{
              display: "flex",

              alignItems:
                "center",

              gap: 16,
            }}
          >
            {/* DEPTH */}

            <label
              style={{
                display: "flex",

                alignItems:
                  "center",

                gap: 8,

                color: "#0f172a",
              }}
            >
              <strong>
                Depth
              </strong>

              <select
                value={depth}
                onChange={(event) =>
                  setDepth(
                    Number(
                      event.target
                        .value
                    )
                  )
                }
                style={{
                  padding:
                    "9px 14px",

                  borderRadius: 8,

                  border:
                    "1px solid #cbd5e1",

                  background:
                    "#ffffff",

                  fontSize: 14,

                  cursor:
                    "pointer",
                }}
              >
                <option value={1}>
                  1
                </option>

                <option value={2}>
                  2
                </option>

                <option value={3}>
                  3
                </option>

                <option value={4}>
                  4
                </option>
              </select>
            </label>

            {/* TOP */}

            <label
              style={{
                display: "flex",

                alignItems:
                  "center",

                gap: 8,

                color: "#0f172a",
              }}
            >
              <strong>
                Top
              </strong>

              <select
                value={top}
                onChange={(event) =>
                  setTop(
                    Number(
                      event.target
                        .value
                    )
                  )
                }
                style={{
                  padding:
                    "9px 14px",

                  borderRadius: 8,

                  border:
                    "1px solid #cbd5e1",

                  background:
                    "#ffffff",

                  fontSize: 14,

                  cursor:
                    "pointer",
                }}
              >
                <option value={10}>
                  10
                </option>

                <option value={20}>
                  20
                </option>

                <option value={50}>
                  50
                </option>

                <option value={100}>
                  100
                </option>
              </select>
            </label>
          </div>
        </div>

        {/* =================================================
            LEGEND
        ================================================= */}

        <div
          style={{
            display: "flex",

            gap: 24,

            marginTop: 18,

            fontSize: 14,

            color: "#0f172a",
          }}
        >
          <span
            style={{
              display: "flex",

              alignItems:
                "center",

              gap: 8,
            }}
          >
            <span
              style={{
                width: 14,

                height: 14,

                borderRadius:
                  "50%",

                background:
                  COLORS.wallet,
              }}
            />

            Wallet
          </span>

          <span
            style={{
              display: "flex",

              alignItems:
                "center",

              gap: 8,
            }}
          >
            <span
              style={{
                width: 14,

                height: 14,

                borderRadius:
                  "50%",

                background:
                  COLORS.transaction,
              }}
            />

            Transaction
          </span>

          <span
            style={{
              display: "flex",

              alignItems:
                "center",

              gap: 10,
            }}
          >
            <span
              style={{
                width: 14,

                height: 14,

                transform:
                  "rotate(45deg)",

                background:
                  COLORS.ip,
              }}
            />

            IP
          </span>
        </div>

        {/* =================================================
            WALLET SELECTOR
        ================================================= */}

        {walletOptions.length >
          0 && (
          <div
            style={{
              marginTop: 16,

              display: "flex",

              alignItems:
                "center",

              gap: 10,
            }}
          >
            <label
              style={{
                fontSize: 13,

                fontWeight: 600,

                color:
                  "#475569",
              }}
            >
              Investigation
              starting wallet
            </label>

            <select
              value={selectedId}
              onChange={(
                event
              ) => {
                setSelectedId(
                  event.target
                    .value
                );

                setSelectedNode(
                  null
                );
              }}
              style={{
                minWidth: 395,

                padding:
                  "9px 12px",

                borderRadius: 8,

                border:
                  "1px solid #cbd5e1",

                background:
                  "#ffffff",

                fontSize: 14,

                color:
                  "#0f172a",

                cursor:
                  "pointer",
              }}
            >
              {walletOptions.map(
                (wallet) => (
                  <option
                    key={
                      wallet.id
                    }
                    value={
                      wallet.id
                    }
                  >
                    {wallet.label ??
                      wallet.address ??
                      wallet.id}
                  </option>
                )
              )}
            </select>
          </div>
        )}
      </div>

      {/* =================================================
          GRAPH
      ================================================= */}

      <div
        style={{
          flex: 1,

          minHeight: 500,

          margin:
            "0 20px 20px",

          border:
            "1px solid #e2e8f0",

          borderRadius: 14,

          overflow: "hidden",

          position:
            "relative",

          background:
            "#f8fafc",
        }}
      >
        {nodes.length === 0 ? (
          <div
            style={{
              position:
                "absolute",

              inset: 0,

              display: "flex",

              alignItems:
                "center",

              justifyContent:
                "center",

              color:
                "#64748b",

              fontSize: 16,
            }}
          >
            No investigation
            relationships found
            for this wallet at
            depth {depth}.
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={
              onNodesChange
            }
            onEdgesChange={
              onEdgesChange
            }
            onNodeClick={(
              event,
              node
            ) => {
              setSelectedNode(
                node
              );
            }}
            fitView
            fitViewOptions={{
              padding: 0.25,

              maxZoom: 1.15,

              minZoom: 0.35,
            }}
            minZoom={0.15}
            maxZoom={2}
            nodesDraggable
            nodesConnectable={
              false
            }
            elementsSelectable
            proOptions={{
              hideAttribution:
                true,
            }}
          >
            <Background
              gap={25}
              size={1}
              color="#cbd5e1"
            />

            <Controls />

            <MiniMap
              pannable
              zoomable
              nodeColor={(
                node
              ) => {
                const type =
                  node?.data
                    ?.nodeType;

                return (
                  COLORS[type] ||
                  COLORS.wallet
                );
              }}
            />
          </ReactFlow>
        )}

        {/* =================================================
            NODE DETAILS
        ================================================= */}

        <NodeTooltip
          node={
            selectedNode
          }
        />

        {/* =================================================
            GRAPH STATISTICS
        ================================================= */}

        <div
          style={{
            position:
              "absolute",

            right: 15,

            bottom: 15,

            zIndex: 20,

            padding:
              "10px 14px",

            background:
              "rgba(255,255,255,0.96)",

            border:
              "1px solid #e2e8f0",

            borderRadius: 10,

            fontSize: 12,

            color: "#475569",

            boxShadow:
              "0 4px 15px rgba(0,0,0,0.08)",
          }}
        >
          <div>
            <strong>
              Nodes:
            </strong>{" "}
            {nodes.length}
          </div>

          <div
            style={{
              marginTop: 3,
            }}
          >
            <strong>
              Edges:
            </strong>{" "}
            {edges.length}
          </div>

          <div
            style={{
              marginTop: 3,
            }}
          >
            <strong>
              Depth:
            </strong>{" "}
            {depth}
          </div>
        </div>
      </div>
    </div>
  );
}