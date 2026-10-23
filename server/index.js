import express from "express";

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "coursePulse", timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`coursePulse server running on http://localhost:${port}`);
});
