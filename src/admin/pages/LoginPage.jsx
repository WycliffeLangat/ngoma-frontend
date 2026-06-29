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
      <div className="cms-login-shell">
        <section className="cms-login-intro">
          <a href="/" className="cms-login-home">← Back to Ngoma Charts</a>
          <div>
            <div className="cms-login-wordmark"><span>N</span> NGOMA CHARTS</div>
            <h1>Kenya's music charts,<br />managed with clarity.</h1>
            <p>One workspace for chart publishing, catalogue quality, editorial content, and team activity.</p>
          </div>
          <small>Official admin workspace</small>
        </section>
        <form className="cms-login-card" onSubmit={submit}>
          <div className="cms-login-card-head">
            <span className="cms-eyebrow">Secure access</span>
            <h2>Sign in to the CMS</h2>
            <p>Use your Ngoma Charts administrator or editor account.</p>
          </div>
          {error && <div className="cms-alert error" role="alert">{error}</div>}
          <label><span>Username or email</span><input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus /></label>
          <label><span>Password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
          <button className="cms-btn full" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
          <small className="cms-login-help">Access is limited to approved Ngoma Charts team members.</small>
        </form>
      </div>
    </main>
  );
}
