import { useState } from "react";
import { EntryScreen } from "./components/EntryScreen";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { TopFlaggedCard } from "./components/TopFlaggedCard";
import { AlertsCard } from "./components/AlertsCard";
import { WalletsCard } from "./components/WalletsCard";
import { Heatmap } from "./components/Heatmap";
import { VolumeChart } from "./components/VolumeChart";
import { EntityTable } from "./components/EntityTable";
import { InvestigationScreen } from "./components/InvestigationScreen";
import {
  entities,
  heatmapData,
  volumeData,
  summaryStats,
  investigationDetails,
} from "./data/mock";

function App() {
  const [currentView, setCurrentView] = useState("entry");
  const [activeNav, setActiveNav] = useState("overview");
  const [selectedEntityId, setSelectedEntityId] = useState("bc1q...a92f");
  const [previousNav, setPreviousNav] = useState("overview");

  const topEntity = entities[0];

  const handleSelectEntity = (id) => {
    setSelectedEntityId(id);
    setPreviousNav(activeNav === "investigate" ? previousNav : activeNav);
    setActiveNav("investigate");
  };

  // Resolve investigation data (lookup or fallback synthesizer)
  const currentEntityData =
    investigationDetails[selectedEntityId] ||
    (() => {
      const match = entities.find((e) => e.id === selectedEntityId);
      if (!match) return investigationDetails["bc1q...a92f"];
      return {
        id: match.id,
        fullId: match.fullId || `${match.id}...extended_hash`,
        type: match.type || "wallet",
        risk_score: match.risk_score || 50,
        stats: {
          transactions: match.txn_count || 12,
          received_btc: match.received_btc || 2.5,
          sent_btc: match.sent_btc || 2.1,
          unique_ips: 3,
          countries: match.country_count || 1,
          hops_20min: match.hops_20min || 2,
        },
        evidence: [
          { text: "Correlated activity in flagged cluster", weight: 65 },
          { text: "Direct transaction connection to known anomaly node", weight: 58 },
          { text: "Unusual temporal clustering detected", weight: 45 },
        ],
        related_entities: [
          { id: "bc1q...a92f", type: "wallet", risk_score: 97, role: "Primary Hub" },
          { id: "bc1q...7e1c", type: "wallet", risk_score: 94, role: "Relay Node" },
        ],
        transactions: [
          {
            id: `tx_${selectedEntityId.slice(0, 4)}...01`,
            timestamp: "2026-08-23 15:10:22 UTC",
            direction: "in",
            amount_btc: match.received_btc || 1.5,
            counterparty: "bc1q...a92f",
          },
        ],
      };
    })();

  if (currentView === "entry") {
    return <EntryScreen onLoadDataset={() => setCurrentView("overview")} />;
  }

  return (
    <div className="min-h-screen bg-bg flex">
      <Sidebar
        active={activeNav}
        onNavChange={(nav) => {
          setActiveNav(nav);
        }}
        onBrandClick={() => setCurrentView("entry")}
      />
      <div className="ml-16 flex-1 flex flex-col min-h-screen bg-shell">
        <TopBar onLoadDataset={() => setCurrentView("entry")} />
        <div className="flex-1 p-5 lg:p-6 overflow-auto bg-bg rounded-tl-2xl">
          {activeNav === "investigate" ? (
            <InvestigationScreen
              entity={currentEntityData}
              previousViewTitle={previousNav === "alerts" ? "Alerts" : "Overview"}
              onBack={() => setActiveNav(previousNav || "overview")}
              onSelectEntity={handleSelectEntity}
            />
          ) : (
            <>
              {/* row 1: top flagged + alerts + wallets */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-3">
                <div className="lg:col-span-2">
                  <TopFlaggedCard
                    entity={topEntity}
                    onSelectEntity={handleSelectEntity}
                  />
                </div>
                <AlertsCard
                  count={summaryStats.alertsOpen}
                  trend={summaryStats.alertsTrend}
                />
                <WalletsCard
                  wallets={summaryStats.walletsScanned}
                  transactions={summaryStats.transactionsScanned}
                />
              </div>

              {/* row 2: heatmap + volume chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
                <Heatmap data={heatmapData} />
                <VolumeChart data={volumeData} />
              </div>

              {/* row 3: entity table */}
              <EntityTable
                entities={entities}
                onSelectEntity={handleSelectEntity}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
