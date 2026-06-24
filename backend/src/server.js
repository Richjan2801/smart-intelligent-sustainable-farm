import express from 'express';
import cors from 'cors';
import { checkDatabaseConnection } from './db.js';
import './mqttService.js';
import router from './routes.js';

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