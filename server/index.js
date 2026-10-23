import express from "express";
import { db } from "./database.js";

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(express.json());

app.get("/api/health", (_req, res) => {
  try {
    const userCount = db.prepare("SELECT COUNT(*) AS total FROM users").get().total;
    res.json({ status: "ok", database: "connected", users: userCount });
  } catch (error) {
    res.status(500).json({ status: "error", error: error.message });
  }
});

app.listen(port, () => {
  console.log(`coursePulse server running on http://localhost:${port}`);
});
