// Builds and parses the query-param scheme used to deep-link directly to a
// song/album or artist detail panel, or to a particular page's current view
// (chart type/month/platform, a head-to-head pairing, ...), so a copied
// share link reopens the same thing instead of just landing on the charts
// homepage.
const SHARE_BASE_PATH = "/charts";

function originPath(path) {
  return typeof window === "undefined" ? "" : `${window.location.origin}${path}`;
}

export function buildReleaseShareUrl(entry = {}) {
  if (typeof window === "undefined") return "";
  const title = entry.title || "";
  if (!title) return "";
  const artist = entry.artist || entry.primary_artist || "";
  const type = String(entry.type || "single").toLowerCase().includes("album") ? "album" : "single";
  const params = new URLSearchParams({ share: "release", type, title, artist });
  return `${originPath(SHARE_BASE_PATH)}?${params.toString()}`;
}

export function buildArtistShareUrl(name = "") {
  if (typeof window === "undefined" || !name) return "";
  const params = new URLSearchParams({ share: "artist", artist: name });
  return `${originPath(SHARE_BASE_PATH)}?${params.toString()}`;
}

export function buildChartsShareUrl({ chartType = "singles", platform = "Combined", month = "" } = {}) {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams({ share: "charts", type: chartType, platform, month });
  return `${originPath("/charts")}?${params.toString()}`;
}

export function buildYearEndShareUrl({ chartType = "singles" } = {}) {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams({ share: "year-end", type: chartType });
  return `${originPath("/year-end")}?${params.toString()}`;
}

export function buildHeadToHeadShareUrl({ chartType = "singles", title1 = "", artist1 = "", title2 = "", artist2 = "" } = {}) {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams({ share: "head-to-head", type: chartType, title1, artist1, title2, artist2 });
  return `${originPath("/head-to-head")}?${params.toString()}`;
}

export function buildCertificationsShareUrl() {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams({ share: "certifications" });
  return `${originPath("/certifications")}?${params.toString()}`;
}

export function buildAnalyticsShareUrl({ chartType = "singles", month = "" } = {}) {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams({ share: "analytics", type: chartType, ...(month ? { month } : {}) });
  return `${originPath("/analytics")}?${params.toString()}`;
}

export function parseShareParamsFromLocation() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const kind = params.get("share");
  if (kind === "release") {
    const title = params.get("title") || "";
    if (!title) return null;
    const artist = params.get("artist") || "";
    const type = params.get("type") === "album" ? "album" : "single";
    return { kind, title, artist, type };
  }
  if (kind === "artist") {
    const artist = params.get("artist") || "";
    if (!artist) return null;
    return { kind, artist };
  }
  if (kind === "charts") {
    return {
      kind,
      chartType: params.get("type") || "singles",
      platform: params.get("platform") || "Combined",
      month: params.get("month") || "",
    };
  }
  if (kind === "year-end") {
    return { kind, chartType: params.get("type") || "singles" };
  }
  if (kind === "head-to-head") {
    return {
      kind,
      chartType: params.get("type") || "singles",
      title1: params.get("title1") || "",
      artist1: params.get("artist1") || "",
      title2: params.get("title2") || "",
      artist2: params.get("artist2") || "",
    };
  }
  if (kind === "certifications") {
    return { kind };
  }
  if (kind === "analytics") {
    return { kind, chartType: params.get("type") || "singles", month: params.get("month") || "" };
  }
  return null;
}
