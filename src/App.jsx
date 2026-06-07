import "./styles/ngomaTheme.css";

import NgomaCharts from "./NgomaCharts";
// import NgomaAIWidget from "./components/NgomaAIWidget"; // AI — re-enable when ready
import ChartExportWidget from "./components/ChartExportWidget";

export default function App() {
  return (
    <>
      <NgomaCharts />
      {/* <NgomaAIWidget /> — re-enable when ready */}
      <ChartExportWidget />
    </>
  );
}
