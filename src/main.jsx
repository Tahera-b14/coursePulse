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
            <div className="eyebrow"><span className="eyebrow-dot" /> BUILD 1 · SCAFFOLD</div>
            <h1>Course management,<br /><span>made simple.</span></h1>
            <p className="hero-description">
              Welcome to coursePulse. The application skeleton is running with React + Vite on the frontend and Express on the backend.
            </p>
            <div style={{ marginTop: "24px", padding: "16px", background: "#fff", borderRadius: "12px", border: "1px solid #e2e8e3" }}>
              <strong>API Health Status:</strong> <span style={{ color: health.status === "ok" ? "#2e7d32" : "#c62828" }}>{health.status}</span>
              {health.timestamp && <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>Checked at: {health.timestamp}</div>}
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-brand">
          <span className="brand-mark"><img src="/coursepulse-logo.png" alt="" /></span>
          <strong>course<span>Pulse</span></strong>
        </div>
        <span>Initial Scaffold · Build 1</span>
        <span>© {new Date().getFullYear()} coursePulse</span>
      </footer>
    </div>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);
