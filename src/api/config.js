// Single source of truth for the backend API base URL.
// All files in the app that need to call the API should import from here.
//
// Set VITE_API_BASE_URL in your Netlify environment variables:
//   https://your-app.railway.app/api/v1
//
// Falls back to a relative path so local dev with a proxy still works.
export const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "/api/v1"
).replace(/\/$/, "");
