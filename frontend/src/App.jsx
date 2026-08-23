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
import { entities, heatmapData, volumeData, summaryStats } from "./data/mock";

function App() {
  const [currentView, setCurrentView] = useState("entry");
  const [activeNav, setActiveNav] = useState("overview");

  const topEntity = entities[0];

  if (currentView === "entry") {
    return <EntryScreen onLoadDataset={() => setCurrentView("overview")} />;
  }

  return (
    <div className="min-h-screen bg-bg flex">
      <Sidebar
        active={activeNav}
        onNavChange={setActiveNav}
        onBrandClick={() => setCurrentView("entry")}
      />
      <div className="ml-16 flex-1 flex flex-col min-h-screen bg-shell">
        <TopBar onLoadDataset={() => setCurrentView("entry")} />
        <div className="flex-1 p-5 lg:p-6 overflow-auto bg-bg rounded-tl-2xl">
          {/* row 1: top flagged + alerts + wallets */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-3">
            <div className="lg:col-span-2">
              <TopFlaggedCard entity={topEntity} />
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
          <EntityTable entities={entities} />
        </div>
      </div>
    </div>
  );
}

export default App;
