import cors from "cors";
import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "sisf-backend"
  });
});

app.get("/api/telemetry/latest", (_req, res) => {
  res.json({
    temperature: 28.5,
    humidity: 67.0,
    source: "placeholder"
  });
});

app.listen(PORT, () => {
  console.log(`SISF backend listening on http://localhost:${PORT}`);
});
