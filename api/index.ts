// Vercel serverless function entry point
// Load environment variables first
import 'dotenv/config';

import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { type Request, Response, NextFunction } from 'express';
import { registerRoutes } from '../server/routes';
import { log } from '../server/vite';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (path.startsWith('/api')) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + '…';
      }

      log(logLine);
    }
  });

  next();
});

let isInitialized = false;

async function initializeApp() {
  if (!isInitialized) {
    await registerRoutes(app);
    
    // API 404 handler
    app.use('/api/*', (_req: Request, res: Response) => {
      res.status(404).json({ message: 'API endpoint not found' });
    });

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || 'Internal Server Error';
      res.status(status).json({ message });
      console.error('API Error:', err);
    });
    
    isInitialized = true;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await initializeApp();
    
    // Pass request to Express app
    app(req as any, res as any);
  } catch (error) {
    console.error('API Handler Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
