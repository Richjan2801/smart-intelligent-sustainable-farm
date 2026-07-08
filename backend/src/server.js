import express from 'express';
import cors from 'cors';
import { checkDatabaseConnection } from './db.js';
import './mqttService.js';
import router from './routes.js';

// ─────────────────────────────────────────────
// STARTUP GUARD — fail fast if JWT_SECRET missing
// ─────────────────────────────────────────────
if (!process.env.JWT_SECRET) {
  console.error('[Server] FATAL: JWT_SECRET is not set in environment variables.');
  console.error('[Server] Generate one with: node -e "require(\'crypto\').randomBytes(64).toString(\'hex\')" ');
  process.exit(1);
}

const app = express();

app.use(cors());
app.use(express.json());
app.use(router);

const PORT = process.env.PORT || 3000;

async function startServer() {
  await checkDatabaseConnection();

  app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
  });
}

startServer();