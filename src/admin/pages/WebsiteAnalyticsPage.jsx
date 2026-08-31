import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cmsApi } from "../api";
import DataTable from "../components/DataTable";

const RANGE_OPTIONS = [
  ["24h", "24 hours"],
  ["7d", "7 days"],
  ["30d", "30 days"],
  ["90d", "90 days"],
  ["365d", "1 year"],
  ["all", "All time"],
];

const AXIS_STROKE = "#D9D5CB";
const GRID_STROKE = "#EDEAE2";
const GOLD = "#C97A12";
const BLUE = "#1565C0";
const GREEN = "#1B7F3A";
const BAR_COLORS = [GOLD, BLUE, GREEN, "#7B5BB8", "#D24D57", "#00897B", "#6D4C41", "#455A64"];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstValue(row, keys, fallback = "") {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "") return row[key];
  }
  return fallback;
}

function formatNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat().format(n);
}

function formatPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return `${n >= 10 ? n.toFixed(0) : n.toFixed(1)}%`;
}

function formatMs(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "-";
  if (n < 1000) return `${Math.round(n)} ms`;
  return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}s`;
}

function formatDuration(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "-";
  if (n < 1000) return `${Math.round(n)} ms`;
  const seconds = n / 1000;
  if (seconds < 60) return `${seconds.toFixed(seconds >= 10 ? 0 : 1)} sec`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}m ${rest}s`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function percentOf(count, total) {
  const c = Number(count);
  const t = Number(total);
  if (!Number.isFinite(c) || !Number.isFinite(t) || t <= 0) return 0;
  return Math.max(0, Math.min(100, (c / t) * 100));
}

function topRows(rows, valueKeys = ["count"], labelKeys = ["label", "page", "path", "value", "name"], limit = 10) {
  return asArray(rows)
    .map((row, index) => ({
      ...row,
      id: row.id || `${firstValue(row, labelKeys, "row")}-${index}`,
      label: firstValue(row, labelKeys, "-"),
      count: firstValue(row, valueKeys, 0),
    }))
    .slice(0, limit);
}

function exportAnalyticsJson(data, range) {
  const payload = JSON.stringify(data || {}, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ngoma-website-analytics-${range}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function StatCard({ label, value, detail, tone = "" }) {
  return (
    <div className={`cms-stat-card ${tone}`}>
      <span className="cms-stat-icon" aria-hidden="true">{label.slice(0, 2).toUpperCase()}</span>
      <span className="cms-stat-label">{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

function InsightCard({ insight }) {
  return (
    <div className={`cms-analytics-insight ${insight.tone || ""}`}>
      <span>{insight.title || insight.label || "Insight"}</span>
      <strong>{insight.value || "-"}</strong>
      {insight.detail && <small>{insight.detail}</small>}
    </div>
  );
}

function EmptyBlock({ children = "No analytics recorded yet in this range." }) {
  return <div className="cms-empty compact">{children}</div>;
}

function SimpleBarList({ rows, total, valueLabel = "views", limit = 8 }) {
  const items = topRows(rows, ["count", "views", "pageviews", "sessions"], ["label", "page", "path", "value", "name"], limit);
  if (!items.length) return <EmptyBlock />;
  const max = Math.max(...items.map((item) => Number(item.count) || 0), 1);
  return (
    <div className="cms-analytics-bars">
      {items.map((item, index) => {
        const count = Number(item.count) || 0;
        return (
          <div className="cms-analytics-bar-row" key={item.id}>
            <div>
              <strong title={item.label}>{item.label}</strong>
              <small>{formatNumber(count)} {valueLabel}{total ? ` - ${formatPercent(percentOf(count, total))}` : ""}</small>
            </div>
            <span>
              <i style={{ width: `${Math.max(5, (count / max) * 100)}%`, background: BAR_COLORS[index % BAR_COLORS.length] }} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MiniMetricList({ rows, valueFormatter = formatNumber, limit = 8 }) {
  const items = topRows(rows, ["count", "value"], ["label", "device_type", "browser", "os", "language", "timezone", "screen", "viewport"], limit);
  if (!items.length) return <EmptyBlock />;
  return (
    <div className="cms-analytics-mini-list">
      {items.map((row, index) => (
        <div key={row.id}>
          <span><b style={{ background: BAR_COLORS[index % BAR_COLORS.length] }} />{row.label}</span>
          <strong>{valueFormatter(row.count)}</strong>
        </div>
      ))}
    </div>
  );
}

function ChartCard({ eyebrow, title, children }) {
  return (
    <div className="cms-card">
      <div className="cms-card-heading">
        <div><span className="cms-eyebrow">{eyebrow}</span><h2>{title}</h2></div>
      </div>
      {children}
    </div>
  );
}

export default function WebsiteAnalyticsPage() {
  const [range, setRange] = useState("30d");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (r) => {
    setError("");
    setLoading(true);
    try {
      const result = await cmsApi.get(`/analytics/summary/?range=${r}`, { skipCache: true });
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(range); }, [range, load]);

  const analytics = data || {};
  const totals = analytics.totals || {};
  const engagement = analytics.engagement || {};
  const performance = analytics.performance || {};
  const acquisition = analytics.acquisition || {};
  const devices = analytics.devices || {};
  const topPages = asArray(analytics.top_pages);
  const topPage = topPages[0];
  const totalPageviews = totals.pageviews ?? analytics.total_pageviews ?? 0;
  const totalSessions = totals.unique_sessions ?? analytics.unique_sessions ?? 0;
  const totalEvents = totals.events ?? totalPageviews;
  const totalClicks = totals.clicks ?? analytics.total_clicks ?? 0;

  const fallbackInsights = useMemo(() => {
    const source = asArray(acquisition.referrer_domains)[0] || asArray(analytics.top_referrers)[0];
    const device = asArray(devices.device_types)[0];
    return [
      {
        title: "Most viewed page",
        value: firstValue(topPage, ["page", "path"], "-"),
        detail: topPage ? `${formatNumber(firstValue(topPage, ["count", "views"], 0))} views in this range` : "No pageviews recorded yet.",
      },
      {
        title: "Best traffic source",
        value: firstValue(source, ["label", "referrer_domain", "referrer"], "Direct or unknown"),
        detail: source ? `${formatNumber(firstValue(source, ["count"], 0))} visits came from here.` : "Most visits did not include referrer data.",
      },
      {
        title: "Main device",
        value: firstValue(device, ["label", "device_type"], "-"),
        detail: device ? `${formatNumber(firstValue(device, ["count"], 0))} events from this device type.` : "Device data starts filling from new visits.",
      },
      {
        title: "Average load speed",
        value: formatMs(performance.avg_load_ms),
        detail: "Lower is better. This comes from browser navigation timing.",
      },
    ];
  }, [acquisition.referrer_domains, analytics.top_referrers, devices.device_types, performance.avg_load_ms, topPage]);

  const insights = asArray(analytics.insights).length ? analytics.insights : fallbackInsights;
  const chartData = asArray(analytics.pageviews_by_day).map((row) => ({
    day: String(row.day || row.date || "").slice(0, 10),
    count: Number(row.count || row.pageviews || 0),
    unique_sessions: Number(row.unique_sessions || 0),
  }));
  const hourData = asArray(analytics.pageviews_by_hour).map((row) => ({
    hour: row.hour_label || `${row.hour}:00`,
    count: Number(row.count || 0),
    unique_sessions: Number(row.unique_sessions || 0),
  }));
  const weekdayData = asArray(analytics.pageviews_by_weekday).map((row) => ({
    day: row.weekday || row.day || row.label,
    count: Number(row.count || 0),
    unique_sessions: Number(row.unique_sessions || 0),
  }));

  if (error) {
    return (
      <section>
        <div className="cms-alert error">{error}</div>
        <button className="cms-btn small" type="button" onClick={() => load(range)}>Retry</button>
      </section>
    );
  }

  if (!data && loading) return <div className="cms-empty">Loading website analytics...</div>;

  const cards = [
    { label: "Pageviews", value: formatNumber(totalPageviews), detail: "Every page load or route change." },
    { label: "Visitors", value: formatNumber(totalSessions), detail: "Anonymous browser IDs, not people names." },
    { label: "Events", value: formatNumber(totalEvents), detail: "Views, clicks, scroll, speed and engagement." },
    { label: "Clicks", value: formatNumber(totalClicks), detail: `${formatPercent(engagement.click_rate)} click rate.`, tone: totalClicks ? "good" : "" },
    { label: "Today", value: formatNumber(totals.pageviews_today ?? analytics.pageviews_today ?? 0), detail: "Pageviews since local midnight." },
    { label: "Unique today", value: formatNumber(totals.unique_sessions_today ?? 0), detail: "Distinct anonymous visitors today." },
    { label: "Engaged", value: formatPercent(engagement.engagement_rate), detail: "Multi-view, click, deep scroll, or 10 sec visit.", tone: Number(engagement.engagement_rate) >= 50 ? "good" : "" },
    { label: "Bounce", value: formatPercent(engagement.bounce_rate), detail: "Single-view sessions with no strong action.", tone: Number(engagement.bounce_rate) >= 65 ? "warn" : "" },
    { label: "Avg depth", value: formatPercent(engagement.avg_scroll_depth), detail: "How far visitors usually scroll." },
    { label: "Avg time", value: formatDuration(engagement.avg_engagement_time_ms), detail: "Tracked when visitors leave a page." },
    { label: "Avg load", value: formatMs(performance.avg_load_ms), detail: `P90 ${formatMs(performance.p90_load_ms)}.`, tone: Number(performance.avg_load_ms) > 3500 ? "warn" : "" },
    { label: "Pages/session", value: Number(engagement.avg_pageviews_per_session || 0).toFixed(2), detail: "Higher means stronger browsing depth." },
    { label: "Returning", value: formatPercent(engagement.returning_session_rate), detail: `${formatNumber(engagement.returning_sessions || 0)} returning visitors.` },
  ];

  return (
    <section className="cms-website-analytics">
      <div className="cms-page-head">
        <div>
          <span className="cms-eyebrow">Deep analytics</span>
          <h1>Website Analytics</h1>
          <p>Simple readouts for traffic, acquisition, engagement, clicks, devices, page speed and raw diagnostic events.</p>
        </div>
        <div className="cms-analytics-actions">
          <button className="cms-btn light small" type="button" onClick={() => load(range)} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button className="cms-btn small" type="button" onClick={() => exportAnalyticsJson(analytics, range)} disabled={!data}>
            Export JSON
          </button>
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
        {analytics.generated_at && <span className="cms-analytics-stamp">Updated {formatDateTime(analytics.generated_at)}</span>}
      </div>

      <div className="cms-card-grid cms-analytics-stat-grid">
        {cards.map((card) => <StatCard key={card.label} {...card} />)}
      </div>

      <div className="cms-analytics-insights">
        {insights.map((insight, index) => <InsightCard key={`${insight.title || insight.label}-${index}`} insight={insight} />)}
      </div>

      <div className="cms-grid two">
        <ChartCard eyebrow="Daily" title="Daily views and unique access">
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={{ stroke: AXIS_STROKE }} tickLine={{ stroke: AXIS_STROKE }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={{ stroke: AXIS_STROKE }} tickLine={{ stroke: AXIS_STROKE }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Pageviews" radius={[4, 4, 0, 0]} fill={GOLD} />
                <Bar dataKey="unique_sessions" name="Unique access" radius={[4, 4, 0, 0]} fill={GREEN} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyBlock />}
        </ChartCard>

        <ChartCard eyebrow="Hourly" title="Hourly views and unique access">
          {hourData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={hourData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} axisLine={{ stroke: AXIS_STROKE }} tickLine={{ stroke: AXIS_STROKE }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={{ stroke: AXIS_STROKE }} tickLine={{ stroke: AXIS_STROKE }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Pageviews" radius={[4, 4, 0, 0]} fill={BLUE} />
                <Bar dataKey="unique_sessions" name="Unique access" radius={[4, 4, 0, 0]} fill={GREEN} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyBlock />}
        </ChartCard>
      </div>

      <div className="cms-grid two">
        <ChartCard eyebrow="Pages" title="Most viewed pages">
          <DataTable
            columns={[
              { key: "page", label: "Page", render: (row) => <strong title={row.path}>{row.page}</strong> },
              { key: "count", label: "Views" },
              { key: "unique_sessions", label: "Visitors" },
              { key: "clicks", label: "Clicks" },
              { key: "avg_scroll_depth", label: "Depth", render: (row) => formatPercent(row.avg_scroll_depth) },
              { key: "avg_load_ms", label: "Load", render: (row) => formatMs(row.avg_load_ms) },
            ]}
            rows={topRows(topPages, ["count", "views"], ["page", "path"], 20)}
            empty="No pageviews recorded yet in this range."
          />
        </ChartCard>

        <ChartCard eyebrow="Clicks" title="Top actions">
          <DataTable
            columns={[
              { key: "label", label: "Event" },
              { key: "count", label: "Clicks" },
              { key: "unique_sessions", label: "Visitors" },
              { key: "share", label: "Share", render: (row) => formatPercent(row.share) },
            ]}
            rows={topRows(analytics.top_clicks, ["count"], ["label"], 20).map((row) => ({
              ...row,
              share: percentOf(row.count, totalClicks),
            }))}
            empty="No click events recorded yet in this range."
          />
        </ChartCard>
      </div>

      <div className="cms-grid two">
        <ChartCard eyebrow="Acquisition" title="Where visitors came from">
          <SimpleBarList rows={acquisition.referrer_domains || analytics.top_referrers} total={totalPageviews} valueLabel="visits" />
        </ChartCard>
        <ChartCard eyebrow="Campaigns" title="UTM tracking">
          <div className="cms-analytics-mini-grid">
            <div><h3>Sources</h3><MiniMetricList rows={acquisition.utm_sources} /></div>
            <div><h3>Campaigns</h3><MiniMetricList rows={acquisition.utm_campaigns} /></div>
          </div>
        </ChartCard>
      </div>

      <div className="cms-grid two">
        <ChartCard eyebrow="Journey" title="Landing pages">
          <SimpleBarList rows={analytics.landing_pages} total={totalSessions} valueLabel="starts" />
        </ChartCard>
        <ChartCard eyebrow="Journey" title="Exit pages">
          <SimpleBarList rows={analytics.exit_pages} total={totalSessions} valueLabel="exits" />
        </ChartCard>
      </div>

      <div className="cms-grid two">
        <ChartCard eyebrow="Engagement" title="Scroll depth">
          <div className="cms-analytics-mini-grid">
            <div>
              <h3>Depth bands</h3>
              <MiniMetricList rows={engagement.scroll_distribution} />
            </div>
            <div>
              <h3>Deepest pages</h3>
              <MiniMetricList rows={engagement.page_depth} valueFormatter={formatPercent} />
            </div>
          </div>
        </ChartCard>
        <ChartCard eyebrow="Week" title="Weekday views and unique access">
          {weekdayData.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={weekdayData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={{ stroke: AXIS_STROKE }} tickLine={{ stroke: AXIS_STROKE }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={{ stroke: AXIS_STROKE }} tickLine={{ stroke: AXIS_STROKE }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Pageviews" radius={[4, 4, 0, 0]} fill={GOLD} />
                <Bar dataKey="unique_sessions" name="Unique access" radius={[4, 4, 0, 0]} fill={GREEN} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyBlock />}
        </ChartCard>
      </div>

      <div className="cms-grid two">
        <ChartCard eyebrow="Devices" title="Device and browser mix">
          <div className="cms-analytics-mini-grid">
            <div><h3>Devices</h3><MiniMetricList rows={devices.device_types} /></div>
            <div><h3>Browsers</h3><MiniMetricList rows={devices.browsers} /></div>
            <div><h3>Operating systems</h3><MiniMetricList rows={devices.operating_systems || devices.os} /></div>
            <div><h3>Languages</h3><MiniMetricList rows={devices.languages} /></div>
          </div>
        </ChartCard>
        <ChartCard eyebrow="Screens" title="Viewport, screen and network">
          <div className="cms-analytics-mini-grid">
            <div><h3>Viewports</h3><MiniMetricList rows={devices.viewports} /></div>
            <div><h3>Screens</h3><MiniMetricList rows={devices.screens} /></div>
            <div><h3>Time zones</h3><MiniMetricList rows={devices.timezones} /></div>
            <div><h3>Connections</h3><MiniMetricList rows={devices.connections} /></div>
          </div>
        </ChartCard>
      </div>

      <div className="cms-grid two">
        <ChartCard eyebrow="Speed" title="Slowest pages">
          <DataTable
            columns={[
              { key: "page", label: "Page" },
              { key: "avg_load_ms", label: "Avg load", render: (row) => formatMs(row.avg_load_ms) },
              { key: "p90_load_ms", label: "P90", render: (row) => formatMs(row.p90_load_ms) },
              { key: "samples", label: "Samples" },
            ]}
            rows={topRows(performance.by_page, ["avg_load_ms"], ["page", "path"], 12)}
            empty="Page speed data starts filling from new pageviews."
          />
        </ChartCard>
        <ChartCard eyebrow="Events" title="Event mix">
          <SimpleBarList rows={analytics.event_mix} total={totalEvents} valueLabel="events" />
        </ChartCard>
      </div>

      <ChartCard eyebrow="Diagnostics" title="Latest events">
        <DataTable
          columns={[
            { key: "created_at", label: "Time", render: (row) => formatDateTime(row.created_at) },
            { key: "event_type", label: "Type" },
            { key: "page", label: "Page" },
            { key: "label", label: "Label" },
            { key: "device", label: "Device" },
            { key: "source", label: "Source" },
          ]}
          rows={asArray(analytics.latest_events).map((row, index) => ({
            id: row.id || index,
            created_at: row.created_at,
            event_type: row.event_type,
            page: row.page || row.path || "-",
            label: row.label || "-",
            device: [row.device_type, row.browser, row.os].filter(Boolean).join(" / ") || "-",
            source: row.referrer_domain || row.utm_source || "direct",
          }))}
          empty="No raw events recorded yet."
        />
      </ChartCard>

      <p className="cms-analytics-note">
        Analytics are anonymous and designed for editorial decisions: what content is working, where visitors arrive from, what they click, and whether pages are fast and readable.
      </p>
    </section>
  );
}
