import NgomaCharts from "./NgomaCharts";
import NgomaAIWidget from "./components/NgomaAIWidget";
import ChartExportWidget from "./components/ChartExportWidget";

export default function App() {
  return (
    <>
      <NgomaCharts />
      <NgomaAIWidget />
      <ChartExportWidget />
    </>
  );
}