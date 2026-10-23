import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function App() {
  const [health, setHealth] = useState({ status: "checking..." });

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch((err) => setHealth({ status: "error", error: err.message }));
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
            <div className="eyebrow"><span className="eyebrow-dot" /> BUILD 2 · DATABASE</div>
            <h1>SQLite Database<br /><span>Connected.</span></h1>
            <p className="hero-description">
              Database initialized using better-sqlite3 in WAL mode. The users table is created with unique email constraints and role checks.
            </p>
            <div style={{ marginTop: "24px", padding: "16px", background: "#fff", borderRadius: "12px", border: "1px solid #e2e8e3" }}>
              <strong>Database Status:</strong> <span style={{ color: health.database === "connected" ? "#2e7d32" : "#c62828" }}>{health.database || health.status}</span>
              <div style={{ fontSize: "13px", color: "#555", marginTop: "6px" }}>Total Users Registered: <strong>{health.users ?? 0}</strong></div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-brand">
          <span className="brand-mark"><img src="/coursepulse-logo.png" alt="" /></span>
          <strong>course<span>Pulse</span></strong>
        </div>
        <span>Database Initialized · Build 2</span>
        <span>© {new Date().getFullYear()} coursePulse</span>
      </footer>
    </div>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);
