import { useCallback, useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cmsApi } from "../api";
import DataTable from "../components/DataTable";

const RANGE_OPTIONS = [["7d", "7 days"], ["30d", "30 days"], ["90d", "90 days"]];
const AXIS_STROKE = "#D9D5CB";
const GRID_STROKE = "#EDEAE2";

export default function WebsiteAnalyticsPage() {
  const [range, setRange] = useState("30d");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async (r) => {
    setError("");
    try {
      const result = await cmsApi.get(`/analytics/summary/?range=${r}`);
      setData(result);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { load(range); }, [range, load]);

  if (error) return <div className="cms-alert error">{error}</div>;
  if (!data) return <div className="cms-empty">Loading website analytics...</div>;

  const topPage = (data.top_pages || [])[0];
  const cards = [
    { key: "total_pageviews", label: "Total pageviews", value: data.total_pageviews, icon: "◎" },
    { key: "unique_sessions", label: "Unique sessions", value: data.unique_sessions, icon: "◐" },
    { key: "pageviews_today", label: "Pageviews today", value: data.pageviews_today, icon: "↗" },
    { key: "top_page", label: "Top page", value: topPage ? `${topPage.page} (${topPage.count})` : "—", icon: "★" },
  ];
  const chartData = (data.pageviews_by_day || []).map((row) => ({ day: row.day, count: row.count }));

  return (
    <section>
      <div className="cms-page-head">
        <div>
          <span className="cms-eyebrow">Overview</span>
          <h1>Website Analytics</h1>
          <p>Pageviews and clicks recorded from the public site.</p>
        </div>
      </div>

      <div className="cms-pill-bar">
        {RANGE_OPTIONS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`cms-btn small ${range === value ? "" : "light"}`}
            onClick={() => setRange(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="cms-card-grid">
        {cards.map((c) => (
          <div className="cms-stat-card" key={c.key}>
            <span className="cms-stat-icon" aria-hidden="true">{c.icon}</span>
            <span className="cms-stat-label">{c.label}</span>
            <strong>{c.value ?? "—"}</strong>
          </div>
        ))}
      </div>

      <div className="cms-card">
        <div className="cms-card-heading">
          <div><span className="cms-eyebrow">Trend</span><h2>Pageviews by day</h2></div>
        </div>
        {chartData.length ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={{ stroke: AXIS_STROKE }} tickLine={{ stroke: AXIS_STROKE }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={{ stroke: AXIS_STROKE }} tickLine={{ stroke: AXIS_STROKE }} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#C97A12" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="cms-empty compact">No pageviews recorded yet in this range.</div>
        )}
      </div>

      <div className="cms-grid two">
        <div className="cms-card">
          <div className="cms-card-heading">
            <div><span className="cms-eyebrow">Traffic</span><h2>Top pages</h2></div>
            <span className="cms-count-badge">{(data.top_pages || []).length}</span>
          </div>
          <DataTable
            columns={[{ key: "page", label: "Page" }, { key: "count", label: "Views" }]}
            rows={(data.top_pages || []).map((row, i) => ({ id: i, page: row.page, count: row.count }))}
            empty="No pageviews recorded yet in this range."
          />
        </div>
        <div className="cms-card">
          <div className="cms-card-heading">
            <div><span className="cms-eyebrow">Engagement</span><h2>Top click events</h2></div>
            <span className="cms-count-badge">{(data.top_clicks || []).length}</span>
          </div>
          <DataTable
            columns={[{ key: "label", label: "Event" }, { key: "count", label: "Clicks" }]}
            rows={(data.top_clicks || []).map((row, i) => ({ id: i, label: row.label, count: row.count }))}
            empty="No click events recorded yet in this range."
          />
        </div>
      </div>
    </section>
  );
}
