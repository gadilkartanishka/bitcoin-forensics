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

const SEARCH_RESULT_COLOR = "#facc15";
const CONNECTED_COLOR = "#60a5fa";

/* =========================================================
   HELPERS
========================================================= */

function cleanString(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value);
}

/* =========================================================
   GET NODE TYPE
========================================================= */

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

  const raw = value.replace(
    /^(wallet|address):/,
    ""
  );

  /* Bitcoin wallet */
  if (
    /^[13][a-z0-9]{25,40}$/i.test(raw) ||
    /^bc1[a-z0-9]{20,90}$/i.test(raw)
  ) {
    return "wallet";
  }

  /* IPv4 */
  if (
    /^\d{1,3}(\.\d{1,3}){3}$/.test(raw)
  ) {
    return "ip";
  }

  /* Transaction hash */
  if (
    /^[a-f0-9]{64}$/i.test(raw)
  ) {
    return "transaction";
  }

  return "wallet";
}

/* =========================================================
   DISPLAY LABEL
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
    const tx = label
      .replace(/^tx:/i, "")
      .replace(/^transaction:/i, "");

    if (tx.length > 30) {
      return `${tx.slice(0, 12)}...${tx.slice(-10)}`;
    }

    return tx;
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

  if (!raw) {
    return "";
  }

  const type = getNodeType(raw, node);

  if (
    raw.startsWith("wallet:") ||
    raw.startsWith("tx:") ||
    raw.startsWith("transaction:") ||
    raw.startsWith("ip:")
  ) {
    if (
      raw.startsWith("transaction:")
    ) {
      return `tx:${raw.slice(
        "transaction:".length
      )}`;
    }

    return raw;
  }

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

  let rawNodes = [];
  let rawEdges = [];

  /* =======================================================
     FORMAT 1

     {
       nodes: [],
       edges: []
     }
  ======================================================= */

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

  /* =======================================================
     FORMAT 2

     {
       graph: {
         nodes: [],
         edges: []
       }
     }
  ======================================================= */

  else if (data.graph) {
    rawNodes = Array.isArray(
      data.graph.nodes
    )
      ? data.graph.nodes
      : [];

    rawEdges = Array.isArray(
      data.graph.edges
    )
      ? data.graph.edges
      : [];
  }

  /* =======================================================
     FORMAT 3

     {
       wallets: [],
       transactions: [],
       ips: []
     }
  ======================================================= */

  else {
    const wallets = Array.isArray(
      data.wallets
    )
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

    if (
      Array.isArray(data.relationships)
    ) {
      rawEdges = data.relationships;
    } else if (
      Array.isArray(data.links)
    ) {
      rawEdges = data.links;
    }
  }

  /* =======================================================
     NORMALIZE NODES
  ======================================================= */

  const nodes = [];
  const idMap = new Map();

  for (const original of rawNodes) {
    if (!original) {
      continue;
    }

    const originalId =
      original.id ??
      original.address ??
      original.txid ??
      original.ip ??
      original.wallet;

    if (!originalId) {
      continue;
    }

    const id = canonicalNodeId(
      originalId,
      original
    );

    if (!id) {
      continue;
    }

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

    idMap.set(
      String(originalId),
      id
    );

    idMap.set(
      String(originalId).toLowerCase(),
      id
    );

    idMap.set(id, id);

    const label =
      original.label ??
      original.name ??
      original.address ??
      original.txid ??
      original.ip;

    if (label) {
      idMap.set(
        String(label),
        id
      );

      idMap.set(
        String(label).toLowerCase(),
        id
      );
    }
  }

  /* =======================================================
     RESOLVE EDGE ENDPOINT
  ======================================================= */

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
      idMap.has(
        raw.toLowerCase()
      )
    ) {
      return idMap.get(
        raw.toLowerCase()
      );
    }

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

  /* =======================================================
     NORMALIZE EDGES
  ======================================================= */

  const edges = [];

  rawEdges.forEach(
    (edge, index) => {
      if (!edge) {
        return;
      }

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

      const sourceExists =
        nodes.some(
          (node) =>
            node.id === source
        );

      const targetExists =
        nodes.some(
          (node) =>
            node.id === target
        );

      if (
        !sourceExists ||
        !targetExists
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

        relation:
          String(relation),

        amount:
          edge.amount ??
          edge.value ??
          edge.amount_btc ??
          edge.btc ??
          null,
      });
    }
  );

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
  top,
  searchedId
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

  const allEdges = Array.isArray(
    data.edges
  )
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
      nodeMap.set(
        node.id,
        node
      );
    }
  });

  /* =======================================================
     FIND ROOT
  ======================================================= */

  let rootId =
    selectedId &&
    nodeMap.has(selectedId)
      ? selectedId
      : null;

  if (!rootId) {
    const wallet =
      allNodes.find(
        (node) =>
          getNodeType(
            node.id,
            node
          ) === "wallet"
      );

    if (wallet) {
      rootId = wallet.id;
    }
  }

  if (!rootId) {
    rootId =
      allNodes[0]?.id;
  }

  if (!rootId) {
    return {
      nodes: [],
      edges: [],
    };
  }

  /* =======================================================
     ADJACENCY MAP
  ======================================================= */

  const adjacency =
    new Map();

  function addConnection(
    a,
    b
  ) {
    if (!a || !b) {
      return;
    }

    if (
      !adjacency.has(a)
    ) {
      adjacency.set(
        a,
        []
      );
    }

    adjacency
      .get(a)
      .push(b);
  }

  allEdges.forEach(
    (edge) => {
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
    }
  );

  /* =======================================================
     BFS
  ======================================================= */

  const visited =
    new Set([rootId]);

  const levelMap =
    new Map();

  levelMap.set(
    rootId,
    0
  );

  const queue = [
    {
      id: rootId,
      level: 0,
    },
  ];

  while (
    queue.length > 0
  ) {
    const current =
      queue.shift();

    if (!current) {
      continue;
    }

    if (
      current.level >=
      depth
    ) {
      continue;
    }

    const neighbors =
      adjacency.get(
        current.id
      ) || [];

    for (
      const neighbor of neighbors
    ) {
      if (
        !nodeMap.has(
          neighbor
        )
      ) {
        continue;
      }

      if (
        visited.has(
          neighbor
        )
      ) {
        continue;
      }

      const nextLevel =
        current.level + 1;

      visited.add(
        neighbor
      );

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

  /* =======================================================
     LIMIT NODES
  ======================================================= */

  let visibleIds =
    Array.from(visited);

  if (
    visibleIds.length >
    top
  ) {
    visibleIds = [
      rootId,

      ...visibleIds
        .filter(
          (id) =>
            id !== rootId
        )
        .slice(
          0,
          Math.max(
            0,
            top - 1
          )
        ),
    ];
  }

  const visibleSet =
    new Set(
      visibleIds
    );

  /* =======================================================
     VISIBLE EDGES
  ======================================================= */

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

  /* =======================================================
     SEARCH CONNECTIONS
  ======================================================= */

  const connectedToSearch =
    new Set();

  if (searchedId) {
    const searchNeighbors =
      adjacency.get(
        searchedId
      ) || [];

    searchNeighbors.forEach(
      (id) => {
        if (
          visibleSet.has(id)
        ) {
          connectedToSearch.add(
            id
          );
        }
      }
    );
  }

  /* =======================================================
     COLUMNS
  ======================================================= */

  const columns =
    new Map();

  visibleIds.forEach(
    (id) => {
      const level =
        levelMap.get(id) ??
        0;

      if (
        !columns.has(level)
      ) {
        columns.set(
          level,
          []
        );
      }

      columns
        .get(level)
        .push(id);
    }
  );

  /* =======================================================
     POSITIONS
  ======================================================= */

  const positions =
    new Map();

  const COLUMN_GAP = 360;
  const ROW_GAP = 150;

  const sortedLevels =
    Array.from(
      columns.keys()
    ).sort(
      (a, b) =>
        a - b
    );

  sortedLevels.forEach(
    (level) => {
      const ids =
        columns.get(
          level
        ) || [];

      const totalHeight =
        Math.max(
          0,
          (ids.length - 1) *
            ROW_GAP
        );

      ids.forEach(
        (id, index) => {
          positions.set(
            id,
            {
              x:
                120 +
                level *
                  COLUMN_GAP,

              y:
                420 -
                totalHeight /
                  2 +
                index *
                  ROW_GAP,
            }
          );
        }
      );
    }
  );

  positions.set(
    rootId,
    {
      x: 120,
      y: 420,
    }
  );

  /* =======================================================
     FLOW NODES
  ======================================================= */

  const flowNodes =
    visibleIds
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

        const isSearchResult =
          id === searchedId;

        const isConnected =
          connectedToSearch.has(
            id
          );

        const isRoot =
          id === rootId;

        const isUnrelated =
          searchedId &&
          !isSearchResult &&
          !isConnected;

        let background =
          COLORS[type] ||
          COLORS.wallet;

        let border =
          "2px solid white";

        let boxShadow =
          "0 3px 10px rgba(0,0,0,0.12)";

        let opacity = 1;

        if (
          isSearchResult
        ) {
          background =
            SEARCH_RESULT_COLOR;

          border =
            "4px solid #92400e";

          boxShadow =
            "0 0 0 8px rgba(250,204,21,0.35), 0 0 30px rgba(250,204,21,0.85)";
        } else if (
          isConnected
        ) {
          border =
            "4px solid #2563eb";

          boxShadow =
            "0 0 0 6px rgba(96,165,250,0.30), 0 0 20px rgba(96,165,250,0.55)";
        } else if (
          isUnrelated
        ) {
          opacity = 0.3;

          boxShadow =
            "0 2px 6px rgba(0,0,0,0.08)";
        } else if (
          isRoot
        ) {
          border =
            "4px solid #111827";

          boxShadow =
            "0 0 0 6px rgba(59,130,246,0.20)";
        }

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
            width:
              NODE_WIDTH,

            minHeight:
              NODE_HEIGHT,

            borderRadius:
              type === "ip"
                ? "50%"
                : "12px",

            border,

            background,

            color: "#111827",

            display: "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            padding: "10px",

            fontSize: 13,

            fontWeight: 600,

            boxShadow,

            textAlign:
              "center",

            wordBreak:
              "break-word",

            opacity,

            transition:
              "all 0.25s ease",

            zIndex:
              isSearchResult
                ? 20
                : isConnected
                ? 10
                : 1,
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

            wallet:
              original.wallet,

            address:
              original.address,

            txid:
              original.txid,

            timestamp:
              original.timestamp ??
              original.time ??
              original.date,

            fee:
              original.fee,

            scriptType:
              original.script_type ??
              original.scriptType,

            flag_amount_mismatch:
              original.flag_amount_mismatch,

            amount_mismatch_delta:
              original.amount_mismatch_delta,

            amount:
              original.amount,

            amount_btc:
              original.amount_btc,

            value:
              original.value,

            riskScore:
              original.risk_score ??
              original.riskScore,

            communityId:
              original.community_id ??
              original.communityId,

            country:
              original.country,

            asn:
              original.asn,

            city:
              original.city,

            isp:
              original.isp,

            organization:
              original.organization,

            script_type:
              original.script_type,

            original,
          },
        };
      })
      .filter(Boolean);

  /* =======================================================
     FLOW EDGES
  ======================================================= */

  const flowEdges =
    visibleEdges.map(
      (edge, index) => {
        const relation =
          edge.relation || "";

        const searchEdge =
          searchedId &&
          (
            edge.source ===
              searchedId ||
            edge.target ===
              searchedId
          );

        const unrelatedEdge =
          searchedId &&
          !searchEdge;

        return {
          id:
            edge.id ??
            `edge-${index}-${edge.source}-${edge.target}`,

          source:
            edge.source,

          target:
            edge.target,

          type:
            "smoothstep",

          animated:
            Boolean(
              searchEdge
            ),

          markerEnd: {
            type:
              MarkerType.ArrowClosed,

            width: 18,

            height: 18,

            color:
              searchEdge
                ? "#2563eb"
                : EDGE_COLOR,
          },

          style: {
            stroke:
              searchEdge
                ? "#2563eb"
                : EDGE_COLOR,

            strokeWidth:
              searchEdge
                ? 4
                : 2,

            opacity:
              unrelatedEdge
                ? 0.2
                : 1,

            transition:
              "all 0.25s ease",
          },

          label:
            relation,

          labelStyle: {
            fontSize: 11,

            fill:
              searchEdge
                ? "#1d4ed8"
                : "#475569",

            fontWeight: 600,

            opacity:
              unrelatedEdge
                ? 0.3
                : 1,
          },

          labelBgStyle: {
            fill:
              "#ffffff",

            fillOpacity:
              unrelatedEdge
                ? 0.5
                : 0.95,
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
   NODE DETAILS PANEL
========================================================= */

function NodeTooltip({
  node,
  onInvestigate,
  onClose,
}) {
  if (!node) {
    return null;
  }

  const data =
    node.data || {};

  const isWallet =
    data.nodeType === "wallet";

  return (
    <div
      style={{
        position:
          "absolute",

        left: 20,

        bottom: 20,

        zIndex: 50,

        width: 330,

        maxHeight: 470,

        overflowY:
          "auto",

        padding: 16,

        background:
          "#ffffff",

        border:
          "1px solid #e2e8f0",

        borderRadius: 12,

        boxShadow:
          "0 10px 30px rgba(0,0,0,0.15)",

        fontSize: 13,

        color:
          "#0f172a",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          display: "flex",

          justifyContent:
            "space-between",

          alignItems:
            "center",

          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontWeight: 700,

            fontSize: 15,

            textTransform:
              "capitalize",

            color:
              data.nodeType ===
              "transaction"
                ? "#2563eb"
                : data.nodeType ===
                  "ip"
                ? "#d97706"
                : "#059669",
          }}
        >
          {data.nodeType}
        </div>

        <button
          onClick={onClose}
          style={{
            border: "none",

            background:
              "transparent",

            cursor:
              "pointer",

            fontSize: 20,

            color:
              "#64748b",

            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* DISPLAY ID */}

      <div
        style={{
          wordBreak:
            "break-all",

          marginBottom: 8,
        }}
      >
        <strong>
          ID:
        </strong>{" "}
        {data.fullLabel}
      </div>

      {/* INVESTIGATE WALLET */}

      {isWallet && (
        <button
          onClick={() =>
            onInvestigate(node)
          }
          style={{
            width: "100%",

            marginTop: 10,

            marginBottom: 12,

            padding:
              "10px 12px",

            border: "none",

            borderRadius: 8,

            background:
              "#2563eb",

            color:
              "#ffffff",

            fontWeight: 700,

            cursor:
              "pointer",
          }}
        >
          Investigate from this wallet
        </button>
      )}

      {/* ADDRESS */}

      {data.address && (
        <div
          style={{
            marginTop: 5,

            wordBreak:
              "break-all",
          }}
        >
          <strong>
            Address:
          </strong>{" "}
          {data.address}
        </div>
      )}

      {/* WALLET */}

      {data.wallet && (
        <div
          style={{
            marginTop: 5,

            wordBreak:
              "break-all",
          }}
        >
          <strong>
            Wallet:
          </strong>{" "}
          {data.wallet}
        </div>
      )}

      {/* TRANSACTION */}

      {data.txid && (
        <div
          style={{
            marginTop: 5,

            wordBreak:
              "break-all",
          }}
        >
          <strong>
            Transaction ID:
          </strong>{" "}
          {data.txid}
        </div>
      )}

      {/* TIME */}

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

      {/* FEE */}

      {data.fee !==
        undefined &&
        data.fee !==
          null &&
        data.fee !== "" && (
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

      {/* SCRIPT */}

      {(data.scriptType ||
        data.script_type) && (
        <div
          style={{
            marginTop: 5,
          }}
        >
          <strong>
            Script:
          </strong>{" "}
          {data.scriptType ||
            data.script_type}
        </div>
      )}

      {/* AMOUNT */}

      {(data.amount !==
        undefined ||
        data.amount_btc !==
          undefined ||
        data.value !==
          undefined) && (
        <div
          style={{
            marginTop: 5,
          }}
        >
          <strong>
            Amount:
          </strong>{" "}
          {data.amount ??
            data.amount_btc ??
            data.value}
        </div>
      )}

      {/* AMOUNT MISMATCH */}

      {data.flag_amount_mismatch !==
        undefined &&
        data.flag_amount_mismatch !==
          null && (
          <div
            style={{
              marginTop: 5,

              color:
                data.flag_amount_mismatch
                  ? "#dc2626"
                  : "#059669",
            }}
          >
            <strong>
              Amount Mismatch:
            </strong>{" "}
            {data.flag_amount_mismatch
              ? "Yes"
              : "No"}
          </div>
        )}

      {data.amount_mismatch_delta !==
        undefined &&
        data.amount_mismatch_delta !==
          null &&
        data.amount_mismatch_delta !==
          "" && (
          <div
            style={{
              marginTop: 5,
            }}
          >
            <strong>
              Mismatch Delta:
            </strong>{" "}
            {
              data.amount_mismatch_delta
            }{" "}
            BTC
          </div>
        )}

      {/* RISK */}

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

      {/* COMMUNITY */}

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

      {/* COUNTRY */}

      {data.country && (
        <div
          style={{
            marginTop: 5,
          }}
        >
          <strong>
            Country:
          </strong>{" "}
          {data.country}
        </div>
      )}

      {/* CITY */}

      {data.city && (
        <div
          style={{
            marginTop: 5,
          }}
        >
          <strong>
            City:
          </strong>{" "}
          {data.city}
        </div>
      )}

      {/* ASN */}

      {data.asn && (
        <div
          style={{
            marginTop: 5,
          }}
        >
          <strong>
            ASN:
          </strong>{" "}
          {data.asn}
        </div>
      )}

      {/* ISP */}

      {data.isp && (
        <div
          style={{
            marginTop: 5,
          }}
        >
          <strong>
            ISP:
          </strong>{" "}
          {data.isp}
        </div>
      )}

      {/* ORGANIZATION */}

      {data.organization && (
        <div
          style={{
            marginTop: 5,
          }}
        >
          <strong>
            Organization:
          </strong>{" "}
          {data.organization}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function InvestigationGraph() {
  /* =======================================================
     NORMALIZE JSON
  ======================================================= */

  const normalizedData =
    useMemo(
      () =>
        normalizeGraphData(
          graphData
        ),
      []
    );

  /* =======================================================
     WALLET OPTIONS
  ======================================================= */

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

  const firstWalletId =
    walletOptions[0]?.id ||
    "";

  /* =======================================================
     STATES
  ======================================================= */

  const [
    selectedId,
    setSelectedId,
  ] = useState(
    firstWalletId
  );

  const [
    depth,
    setDepth,
  ] = useState(1);

  const [
    top,
    setTop,
  ] = useState(20);

  const [
    selectedNode,
    setSelectedNode,
  ] = useState(null);

  /* =======================================================
     SEARCH
  ======================================================= */

  const [
    searchText,
    setSearchText,
  ] = useState("");

  const [
    searchedId,
    setSearchedId,
  ] = useState("");

  /* =======================================================
     SEARCH RESULTS
  ======================================================= */

  const searchResults =
    useMemo(() => {
      const query =
        searchText
          .trim()
          .toLowerCase();

      if (!query) {
        return [];
      }

      return normalizedData.nodes
        .filter((node) => {
          const type =
            getNodeType(
              node.id,
              node
            );

          const label =
            getDisplayLabel(
              node,
              type
            );

          const fullLabel =
            cleanString(
              node.label ??
                node.name ??
                node.address ??
                node.txid ??
                node.ip ??
                node.id
            );

          const id =
            cleanString(
              node.id
            );

          const txid =
            cleanString(
              node.txid
            );

          const address =
            cleanString(
              node.address
            );

          const ip =
            cleanString(
              node.ip
            );

          return [
            label,
            fullLabel,
            id,
            txid,
            address,
            ip,
            type,
          ].some(
            (value) =>
              value
                .toLowerCase()
                .includes(query)
          );
        })
        .slice(0, 10);
    }, [
      searchText,
      normalizedData,
    ]);

  /* =======================================================
     EXECUTE SEARCH
  ======================================================= */

  function executeSearch(node) {
    if (!node) {
      return;
    }

    setSearchedId(
      node.id
    );

    setSelectedNode({
      id: node.id,

      data: {
        label:
          getDisplayLabel(
            node,
            getNodeType(
              node.id,
              node
            )
          ),

        fullLabel:
          node.label ??
          node.name ??
          node.address ??
          node.txid ??
          node.ip ??
          node.id,

        nodeType:
          getNodeType(
            node.id,
            node
          ),

        wallet:
          node.wallet,

        address:
          node.address,

        txid:
          node.txid,

        timestamp:
          node.timestamp ??
          node.time ??
          node.date,

        fee:
          node.fee,

        scriptType:
          node.script_type ??
          node.scriptType,

        flag_amount_mismatch:
          node.flag_amount_mismatch,

        amount_mismatch_delta:
          node.amount_mismatch_delta,

        amount:
          node.amount,

        amount_btc:
          node.amount_btc,

        value:
          node.value,

        riskScore:
          node.risk_score ??
          node.riskScore,

        communityId:
          node.community_id ??
          node.communityId,

        country:
          node.country,

        asn:
          node.asn,

        city:
          node.city,

        isp:
          node.isp,

        organization:
          node.organization,

        script_type:
          node.script_type,

        original:
          node,
      },
    });

    setSearchText(
      getDisplayLabel(
        node,
        getNodeType(
          node.id,
          node
        )
      )
    );
  }

  /* =======================================================
     CLEAR SEARCH
  ======================================================= */

  function clearSearch() {
    setSearchText("");
    setSearchedId("");
  }

  /* =======================================================
     SEARCH KEYBOARD
  ======================================================= */

  function handleSearchKeyDown(
    event
  ) {
    if (
      event.key ===
      "Enter"
    ) {
      if (
        searchResults.length >
        0
      ) {
        executeSearch(
          searchResults[0]
        );
      }
    }

    if (
      event.key ===
      "Escape"
    ) {
      clearSearch();
    }
  }

  /* =======================================================
     INVESTIGATE FROM WALLET
  ======================================================= */

  function investigateFromWallet(
    node
  ) {
    if (!node) {
      return;
    }

    if (
      node.data?.nodeType !==
      "wallet"
    ) {
      return;
    }

    setSelectedId(
      node.id
    );

    setSelectedNode(
      null
    );

    setSearchText(
      ""
    );

    setSearchedId(
      ""
    );
  }

  /* =======================================================
     KEEP VALID ROOT
  ======================================================= */

  useEffect(() => {
    if (
      !walletOptions.length
    ) {
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

  /* =======================================================
     BUILD GRAPH
  ======================================================= */

  const graph =
    useMemo(
      () =>
        buildGraph(
          normalizedData,
          selectedId,
          Number(depth),
          Number(top),
          searchedId
        ),
      [
        normalizedData,
        selectedId,
        depth,
        top,
        searchedId,
      ]
    );

  /* =======================================================
     REACT FLOW STATE
  ======================================================= */

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

  /* =======================================================
     UPDATE GRAPH
  ======================================================= */

  useEffect(() => {
    setNodes(
      graph.nodes
    );

    setEdges(
      graph.edges
    );
  }, [
    graph.nodes,
    graph.edges,
    setNodes,
    setEdges,
  ]);

  /* =======================================================
     NO DATA
  ======================================================= */

  if (
    !normalizedData.nodes.length
  ) {
    return (
      <div
        style={{
          padding: 30,

          margin: 20,

          border:
            "1px solid #fecaca",

          borderRadius: 12,

          background:
            "#fef2f2",

          color:
            "#991b1b",

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
          contains graph nodes.
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

        background:
          "#ffffff",
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
        {/* TITLE + CONTROLS */}

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
          <div>
            <h2
              style={{
                margin: 0,

                fontSize: 24,

                color:
                  "#0f172a",
              }}
            >
              Investigation Graph
            </h2>

            <div
              style={{
                marginTop: 5,

                color:
                  "#64748b",

                fontSize: 15,
              }}
            >
              Explore wallet,
              transaction and IP
              relationships
            </div>
          </div>

          {/* DEPTH + TOP */}

          <div
            style={{
              display: "flex",

              alignItems:
                "center",

              gap: 16,
            }}
          >
            <label
              style={{
                display: "flex",

                alignItems:
                  "center",

                gap: 8,

                color:
                  "#0f172a",
              }}
            >
              <strong>
                Depth
              </strong>

              <select
                value={depth}
                onChange={(
                  event
                ) =>
                  setDepth(
                    Number(
                      event
                        .target
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

            <label
              style={{
                display: "flex",

                alignItems:
                  "center",

                gap: 8,

                color:
                  "#0f172a",
              }}
            >
              <strong>
                Top
              </strong>

              <select
                value={top}
                onChange={(
                  event
                ) =>
                  setTop(
                    Number(
                      event
                        .target
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
            SEARCH
        ================================================= */}

        <div
          style={{
            marginTop: 18,

            position:
              "relative",

            maxWidth: 650,
          }}
        >
          <div
            style={{
              display: "flex",

              gap: 8,
            }}
          >
            <div
              style={{
                position:
                  "relative",

                flex: 1,
              }}
            >
              <span
                style={{
                  position:
                    "absolute",

                  left: 12,

                  top: "50%",

                  transform:
                    "translateY(-50%)",

                  fontSize: 18,

                  zIndex: 2,
                }}
              >
                🔎
              </span>

              <input
                type="text"
                value={
                  searchText
                }
                onChange={(
                  event
                ) =>
                  setSearchText(
                    event.target
                      .value
                  )
                }
                onKeyDown={
                  handleSearchKeyDown
                }
                placeholder="Search wallet / transaction / IP..."
                style={{
                  width:
                    "100%",

                  boxSizing:
                    "border-box",

                  padding:
                    "11px 42px",

                  borderRadius: 9,

                  border:
                    "1px solid #cbd5e1",

                  outline:
                    "none",

                  fontSize: 14,

                  color:
                    "#0f172a",

                  background:
                    "#ffffff",
                }}
              />

              {searchText && (
                <button
                  onClick={
                    clearSearch
                  }
                  style={{
                    position:
                      "absolute",

                    right: 8,

                    top: "50%",

                    transform:
                      "translateY(-50%)",

                    border:
                      "none",

                    background:
                      "transparent",

                    cursor:
                      "pointer",

                    fontSize: 18,

                    color:
                      "#64748b",
                  }}
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <button
              onClick={() => {
                if (
                  searchResults.length >
                  0
                ) {
                  executeSearch(
                    searchResults[0]
                  );
                }
              }}
              disabled={
                searchResults.length ===
                0
              }
              style={{
                padding:
                  "10px 18px",

                borderRadius: 9,

                border:
                  "none",

                background:
                  searchResults.length >
                  0
                    ? "#2563eb"
                    : "#cbd5e1",

                color:
                  "#ffffff",

                fontWeight: 600,

                cursor:
                  searchResults.length >
                  0
                    ? "pointer"
                    : "not-allowed",
              }}
            >
              Search
            </button>
          </div>

          {/* SEARCH RESULTS */}

          {searchText &&
            searchResults.length >
              0 && (
              <div
                style={{
                  position:
                    "absolute",

                  top:
                    "calc(100% + 5px)",

                  left: 0,

                  right: 80,

                  zIndex: 100,

                  background:
                    "#ffffff",

                  border:
                    "1px solid #e2e8f0",

                  borderRadius: 10,

                  boxShadow:
                    "0 10px 30px rgba(0,0,0,0.15)",

                  overflow:
                    "hidden",
                }}
              >
                {searchResults.map(
                  (result) => {
                    const type =
                      getNodeType(
                        result.id,
                        result
                      );

                    return (
                      <button
                        key={
                          result.id
                        }
                        onClick={() =>
                          executeSearch(
                            result
                          )
                        }
                        style={{
                          width:
                            "100%",

                          padding:
                            "10px 14px",

                          display:
                            "flex",

                          alignItems:
                            "center",

                          gap: 10,

                          border:
                            "none",

                          borderBottom:
                            "1px solid #f1f5f9",

                          background:
                            "#ffffff",

                          cursor:
                            "pointer",

                          textAlign:
                            "left",
                        }}
                      >
                        <span
                          style={{
                            padding:
                              "4px 7px",

                            borderRadius: 6,

                            background:
                              COLORS[
                                type
                              ],

                            color:
                              "#111827",

                            fontSize: 11,

                            fontWeight:
                              700,

                            textTransform:
                              "uppercase",
                          }}
                        >
                          {type}
                        </span>

                        <span
                          style={{
                            color:
                              "#0f172a",

                            fontSize:
                              13,

                            wordBreak:
                              "break-all",
                          }}
                        >
                          {getDisplayLabel(
                            result,
                            type
                          )}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            )}

          {searchText &&
            searchResults.length ===
              0 && (
              <div
                style={{
                  position:
                    "absolute",

                  top:
                    "calc(100% + 5px)",

                  left: 0,

                  right: 80,

                  zIndex: 100,

                  padding: 14,

                  background:
                    "#ffffff",

                  border:
                    "1px solid #e2e8f0",

                  borderRadius: 10,

                  boxShadow:
                    "0 10px 30px rgba(0,0,0,0.12)",

                  color:
                    "#64748b",

                  fontSize: 13,
                }}
              >
                No wallet,
                transaction or IP
                found.
              </div>
            )}
        </div>

        {/* SEARCH STATUS */}

        {searchedId && (
          <div
            style={{
              marginTop: 10,

              display: "flex",

              alignItems:
                "center",

              gap: 10,

              fontSize: 13,

              color:
                "#475569",
            }}
          >
            <span>
              🎯 Search highlighting
              active
            </span>

            <button
              onClick={
                clearSearch
              }
              style={{
                border:
                  "none",

                background:
                  "#fee2e2",

                color:
                  "#b91c1c",

                padding:
                  "5px 10px",

                borderRadius: 6,

                cursor:
                  "pointer",

                fontWeight: 600,
              }}
            >
              Clear search
            </button>
          </div>
        )}

        {/* =================================================
            LEGEND
        ================================================= */}

        <div
          style={{
            display: "flex",

            flexWrap:
              "wrap",

            gap: 24,

            marginTop: 18,

            fontSize: 14,

            color:
              "#0f172a",
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
                  SEARCH_RESULT_COLOR,

                border:
                  "2px solid #92400e",

                boxShadow:
                  "0 0 8px rgba(250,204,21,0.8)",
              }}
            />

            Search result
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
                  COLORS.wallet,

                border:
                  "3px solid #2563eb",
              }}
            />

            Direct connection
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
              value={
                selectedId
              }
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

                clearSearch();
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

          overflow:
            "hidden",

          position:
            "relative",

          background:
            "#f8fafc",
        }}
      >
        {nodes.length ===
        0 ? (
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

              /*
                IMPORTANT:

                Clicking a wallet DOES NOT
                automatically change the graph.

                The user must click:
                "Investigate from this wallet"
              */
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
          onInvestigate={
            investigateFromWallet
          }
          onClose={() =>
            setSelectedNode(
              null
            )
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

            color:
              "#475569",

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

          {searchedId && (
            <div
              style={{
                marginTop: 3,

                color:
                  "#2563eb",
              }}
            >
              <strong>
                Search:
              </strong>{" "}
              Active
            </div>
          )}

          <div
            style={{
              marginTop: 3,
            }}
          >
            <strong>
              Root:
            </strong>{" "}
            {selectedId
              ? getDisplayLabel(
                  normalizedData.nodes.find(
                    (n) =>
                      n.id ===
                      selectedId
                  ) || {},
                  "wallet"
                )
              : "None"}
          </div>
        </div>
      </div>
    </div>
  );
}