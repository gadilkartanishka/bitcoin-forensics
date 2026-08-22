import CytoscapeComponent from "react-cytoscapejs";

function InvestigationGraph() {
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
      },
    },
    {
      data: {
        id: "wallet2",
        label: "Wallet B",
        type: "wallet",
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
  ];

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
        />
      </div>
    </div>
  );
}

export default InvestigationGraph;