import express from 'express';
import cors from 'cors';
import { checkDatabaseConnection } from './db.js';
import './mqttService.js';
import router from './routes.js';
import { loadPermissions } from './middleware/permissionCache.js';

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

// ─────────────────────────────────────────────
// HTTP REQUEST LOGGER
// ─────────────────────────────────────────────
app.use((req, res, next) => {
  // Skip noisy health-check polls
  if (req.path === '/health') return next();

  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`);
  });
  next();
});

app.use(router);

const PORT = process.env.PORT || 3000;

async function startServer() {
  await checkDatabaseConnection();
  await loadPermissions();

  app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
  });
}

startServer();