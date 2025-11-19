// Vercel serverless function entry point
// This handles all API routes for the application

import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import { registerRoutes } from '../server/routes';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

let isInitialized = false;

async function initializeApp() {
  if (!isInitialized) {
    await registerRoutes(app);
    isInitialized = true;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await initializeApp();
    
    // Convert Vercel request to Express-compatible format
    const expressReq = req as any;
    const expressRes = res as any;
    
    app(expressReq, expressRes);
  } catch (error) {
    console.error('API Handler Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
