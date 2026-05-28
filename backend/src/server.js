import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import { checkDatabaseConnection } from './db.js';
import './mqttService.js';           // side-effect: connects MQTT & starts watchdog
import router from './routes.js';

// ── Express app ───────────────────────────────────────────────────────────────

const app = express();

app.use(cors());
app.use(express.json());
app.use(router);

// ── Startup ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;

async function startServer() {
  await checkDatabaseConnection();

  app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
  });
}

startServer();