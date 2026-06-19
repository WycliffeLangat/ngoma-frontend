export const API_BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || "/api/v1").replace(/\/$/, "");
export const CMS_BASE = `${API_BASE}/cms`;

async function request(path, options = {}) {
  const headers = options.body instanceof FormData ? {} : { "Content-Type": "application/json" };
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
  return data;
}

export const cmsApi = {
  get: (path) => request(path),
  post: (path, body = {}) => request(path, { method: "POST", body: body instanceof FormData ? body : JSON.stringify(body) }),
  patch: (path, body = {}) => request(path, { method: "PATCH", body: JSON.stringify(body) }),
  put: (path, body = {}) => request(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: "DELETE" }),
  login: (username, password) => request("/auth/login/", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => request("/auth/logout/", { method: "POST", body: JSON.stringify({}) }),
  me: () => request("/auth/me/"),
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
