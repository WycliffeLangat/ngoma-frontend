import { useState } from "react";
import { cmsApi } from "../api";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const data = await cmsApi.login(username, password);
      onLogin(data.user);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally { setLoading(false); }
  }
  return (
    <main className="cms-login-page">
      <form className="cms-login-card" onSubmit={submit}>
        <div className="cms-logo">NGOMA</div>
        <h1>Admin/CMS Login</h1>
        <p>Control charts, uploads, artists, news, settings and publishing.</p>
        {error && <div className="cms-alert error">{error}</div>}
        <label><span>Username or email</span><input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus /></label>
        <label><span>Password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button className="cms-btn full" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
        <small>Use your Django admin/superuser account first, then create editor roles inside CMS.</small>
      </form>
    </main>
  );
}
