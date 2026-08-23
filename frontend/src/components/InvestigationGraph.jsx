import CytoscapeComponent from "react-cytoscapejs";
import { useState } from "react";

function InvestigationGraph() {
  const [selectedNode, setSelectedNode] = useState(null);

  const elements = [
    {
      data: {
        id: "ip1",
        label: "IP\n192.168.1.10",
        type: "ip",
      },
    },
    {
      data: {
        id: "tx1",
        label: "TX\n8f21...c3",
        type: "transaction",
      },
    },
    {
      data: {
        id: "wallet1",
        label: "Wallet A",
        type: "wallet",
        riskScore: 97,
        transactions: 382,
        countries: 4,
        received: 82,
        sent: 79,
      },
    },
    {
      data: {
        id: "wallet2",
        label: "Wallet B",
        type: "wallet",
        riskScore: 74,
        transactions: 96,
        countries: 2,
        received: 31,
        sent: 28,
      },
    },

    {
      data: {
        id: "edge1",
        source: "ip1",
        target: "tx1",
      },
    },
    {
      data: {
        id: "edge2",
        source: "tx1",
        target: "wallet1",
      },
    },
    {
      data: {
        id: "edge3",
        source: "tx1",
        target: "wallet2",
      },
    },
  ];

  const stylesheet = [
    {
      selector: "node",
      style: {
        label: "data(label)",
        "text-valign": "center",
        "text-halign": "center",
        "font-size": "12px",
        color: "#111827",
        "background-color": "#94a3b8",
        width: "55px",
        height: "55px",
        "border-width": 2,
        "border-color": "#ffffff",
      },
    },

    {
      selector: 'node[type="ip"]',
      style: {
        "background-color": "#60a5fa",
        shape: "ellipse",
      },
    },

    {
      selector: 'node[type="transaction"]',
      style: {
        "background-color": "#f59e0b",
        shape: "diamond",
      },
    },

    {
      selector: 'node[type="wallet"]',
      style: {
        "background-color": "#34d399",
        shape: "round-rectangle",
      },
    },

    {
      selector: "edge",
      style: {
        width: 2,
        "line-color": "#64748b",
        "target-arrow-color": "#64748b",
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
      },
    },

    {
      selector: ":selected",
      style: {
        "border-width": 4,
        "border-color": "#7c3aed",
      },
    },
  ];

  const handleNodeClick = (event) => {
    const node = event.target;

    setSelectedNode({
      id: node.id(),
      label: node.data("label"),
      type: node.data("type"),
      riskScore: node.data("riskScore"),
      transactions: node.data("transactions"),
      countries: node.data("countries"),
      received: node.data("received"),
      sent: node.data("sent"),
    });
  };

  return (
    <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold mb-3">
        Investigation Graph
      </h2>

      <div
        style={{
          width: "100%",
          height: "500px",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
        }}
      >
        <CytoscapeComponent
          elements={elements}
          stylesheet={stylesheet}
          layout={{
            name: "breadthfirst",
            directed: true,
            padding: 50,
            spacingFactor: 1.5,
          }}
          style={{
            width: "100%",
            height: "100%",
          }}
          cy={(cy) => {
            cy.removeListener("tap", "node");
            cy.on("tap", "node", handleNodeClick);
          }}
        />
      </div>

      {selectedNode && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-base font-semibold mb-3">
            Selected Entity
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="font-medium">Type:</span>{" "}
              {selectedNode.type}
            </div>

            <div>
              <span className="font-medium">ID:</span>{" "}
              {selectedNode.id}
            </div>

            <div>
              <span className="font-medium">Label:</span>{" "}
              {selectedNode.label}
            </div>

            {selectedNode.riskScore !== undefined && (
              <>
                <div>
                  <span className="font-medium">Risk Score:</span>{" "}
                  {selectedNode.riskScore}
                </div>

                <div>
                  <span className="font-medium">Transactions:</span>{" "}
                  {selectedNode.transactions}
                </div>

                <div>
                  <span className="font-medium">Countries:</span>{" "}
                  {selectedNode.countries}
                </div>

                <div>
                  <span className="font-medium">Received:</span>{" "}
                  {selectedNode.received} BTC
                </div>

                <div>
                  <span className="font-medium">Sent:</span>{" "}
                  {selectedNode.sent} BTC
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default InvestigationGraph;