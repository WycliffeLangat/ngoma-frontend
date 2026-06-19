import "./styles/ngomaTheme.css";

import NgomaCharts from "./NgomaCharts";
import AdminApp from "./admin/AdminApp";

export default function App() {
  const path = window.location.pathname.toLowerCase();
  if (path.startsWith("/cms") || path.startsWith("/admin-cms")) {
    return <AdminApp />;
  }
  return <NgomaCharts />;
}
