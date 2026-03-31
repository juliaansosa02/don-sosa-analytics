import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { analyticsRouter } from './routes/analytics.js';

const app = express();
const webDistPath = fileURLToPath(new URL('../../web/dist', import.meta.url));
const hasWebBuild = existsSync(webDistPath);

app.use(cors({
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} not allowed by CORS`));
  }
}));
app.use(express.json({ limit: '2mb' }));

app.use('/api/health', healthRouter);
app.use('/api/analytics', analyticsRouter);

if (hasWebBuild) {
  app.use(express.static(webDistPath));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(fileURLToPath(new URL('../../web/dist/index.html', import.meta.url)));
  });
}

app.listen(env.PORT, () => {
  console.log(`Don Sosa API listening on http://localhost:${env.PORT}`);
});
