export const API_BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || "/api/v1").replace(/\/$/, "");
export const CMS_BASE = `${API_BASE}/cms`;

let csrfToken = null;

function setCsrfToken(token) { if (token) csrfToken = token; }

async function fetchCsrfToken() {
  try {
    const res = await fetch(`${CMS_BASE}/csrf/`, { credentials: "include" });
    const data = await res.json();
    setCsrfToken(data?.csrfToken);
  } catch {}
}

async function request(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const isMutation = ["POST", "PATCH", "PUT", "DELETE"].includes(method);
  const headers = options.body instanceof FormData ? {} : { "Content-Type": "application/json" };
  if (isMutation && csrfToken) headers["X-CSRFToken"] = csrfToken;
  const response = await fetch(`${CMS_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const detail = data?.detail || data?.error || `Request failed (${response.status})`;
    const err = new Error(detail);
    err.data = data;
    throw err;
  }
  if (isMutation && typeof window !== "undefined") {
    try { window.localStorage.setItem("ngoma-cms-revision", String(Date.now())); } catch {}
  }
  return data;
}

export const cmsApi = {
  get: (path) => request(path),
  post: (path, body = {}) => request(path, { method: "POST", body: body instanceof FormData ? body : JSON.stringify(body) }),
  patch: (path, body = {}) => request(path, { method: "PATCH", body: JSON.stringify(body) }),
  put: (path, body = {}) => request(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: "DELETE" }),
  login: async (username, password) => {
    const data = await request("/auth/login/", { method: "POST", body: JSON.stringify({ username, password }) });
    setCsrfToken(data?.csrfToken);
    return data;
  },
  logout: () => request("/auth/logout/", { method: "POST", body: JSON.stringify({}) }),
  me: async () => {
    const [data] = await Promise.all([
      request("/auth/me/"),
      csrfToken ? Promise.resolve() : fetchCsrfToken(),
    ]);
    return data;
  },
};

export function getResults(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.results || [];
}

export function qs(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") q.set(key, value);
  });
  const value = q.toString();
  return value ? `?${value}` : "";
}
