import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

async function api(url, options = {}) {
  const res = await fetch(`/api${url}`, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (res.status === 204) return null;
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error || "Request failed.");
  return payload;
}

function App() {
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    api("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setChecked(true));
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><img src="/coursepulse-logo.png" alt="" /></span>
          <span>course<span>Pulse</span></span>
        </div>
      </header>

      <main className="page-width">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> BUILD 3 · AUTH BACKEND</div>
            <h1>Authentication API<br /><span>Ready.</span></h1>
            <p className="hero-description">
              JWT session cookies and bcrypt password hashing are set up. Endpoints for register, login, logout, and me are now active.
            </p>
            <div style={{ marginTop: "24px", padding: "16px", background: "#fff", borderRadius: "12px", border: "1px solid #e2e8e3" }}>
              <strong>Auth Session Status:</strong> {checked ? (user ? `Logged in as ${user.name} (${user.role})` : "No active session") : "Checking session..."}
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-brand">
          <span className="brand-mark"><img src="/coursepulse-logo.png" alt="" /></span>
          <strong>course<span>Pulse</span></strong>
        </div>
        <span>Auth Endpoints Active · Build 3</span>
        <span>© {new Date().getFullYear()} coursePulse</span>
      </footer>
    </div>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);
