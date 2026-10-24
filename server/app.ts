import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { generalLimiter } from './middleware/rateLimiters.js';
import { csrfProtection } from './middleware/csrf.js';
import { errorHandler } from './middleware/errorHandler.js';

import { authRouter } from './routes/auth.routes.js';
import { dashboardRouter } from './routes/dashboard.routes.js';
import { dispatchRouter } from './routes/dispatch.routes.js';
import { collectionsRouter } from './routes/collections.routes.js';
import { driverRouter } from './routes/driver.routes.js';
import { complaintsRouter } from './routes/complaints.routes.js';
import { adminRouter } from './routes/admin.routes.js';

export function createApp(): Express {
  const app = express();

  // 1. HTTP Security Headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://unpkg.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org', 'https://tile.openstreetmap.org', 'https://unpkg.com'],
          connectSrc: ["'self'", 'https://router.project-osrm.org'],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false, // Permit Leaflet map tiles
    })
  );

  // 2. Strict Credentialed CORS
  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!requestOrigin) return callback(null, true);
        if (requestOrigin === env.CORS_ORIGIN || requestOrigin === 'http://localhost:3000' || requestOrigin === 'http://127.0.0.1:3000') {
          return callback(null, true);
        }
        // In non-production, permit any localhost / 127.0.0.1 port
        if (env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin)) {
          return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Protection'],
    })
  );

  // 3. Request Parsers
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 4. Rate Limiting & CSRF Protection
  app.use(generalLimiter);
  app.use(csrfProtection);

  // 5. Health Check Endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'operational',
      service: 'WasteWise Pune Decision-Support API',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    });
  });

  // 6. Mount Feature Routers
  app.use('/api/auth', authRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/dispatch', dispatchRouter);
  app.use('/api/collections', collectionsRouter);
  app.use('/api/driver', driverRouter);
  app.use('/api/complaints', complaintsRouter);
  app.use('/api/admin', adminRouter);

  // 7. Centralized Error Handler
  app.use(errorHandler);

  return app;
}
