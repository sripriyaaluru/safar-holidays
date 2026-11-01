// Builds the Express application (kept separate from index.js so tests can use it).
import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import bookingRoutes from './routes/bookings.js';
import enquiryRoutes from './routes/enquiries.js';
import packageRoutes from './routes/packages.js';
import wishlistRoutes from './routes/wishlist.js';
import { errorHandler } from './utils/http.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({ origin: config.clientOrigin.split(',') }));
  app.use(express.json({ limit: '1mb' }));

  // REST API
  app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
  app.use('/api/auth', authRoutes);
  app.use('/api/packages', packageRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/wishlist', wishlistRoutes);
  app.use('/api/enquiries', enquiryRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));

  // In production, serve the built React app from client/dist on the same port.
  const clientDist = path.resolve(config.serverRoot, '..', 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('/{*page}', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
