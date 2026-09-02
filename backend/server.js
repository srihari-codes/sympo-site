import './env.js'; // must be first — loads .env before anything reads process.env

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDb } from './db.js';
import authRouter from './routes/auth.js';
import userRouter from './routes/user.js';
import eventsRouter from './routes/events.js';
import adminRouter from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5050;

// Behind the nginx reverse proxy in production — trust X-Forwarded-* headers.
app.set('trust proxy', 1);

// Initialize SQLite database
initDb();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images statically
app.use(
  '/uploads',
  express.static(process.env.UPLOAD_DIR || path.join(__dirname, 'uploads'))
);

// Mount API Routes
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/events', eventsRouter);
app.use('/api/admin', adminRouter);

// Admin console (static page; auth happens client-side against /api/admin/*)
app.get('/admin', (req, res) => {
  const html = fs
    .readFileSync(path.join(__dirname, 'admin', 'index.html'), 'utf8')
    .replace(/__GOOGLE_CLIENT_ID__/g, process.env.GOOGLE_CLIENT_ID || '');
  res.type('html').send(html);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Zyverse 2026 Backend Server is running smoothly.',
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Zyverse Backend Server running on http://localhost:${PORT}`);
});

export default app;
