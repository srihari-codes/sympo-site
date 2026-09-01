import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDb } from './db.js';
import authRouter from './routes/auth.js';
import userRouter from './routes/user.js';
import eventsRouter from './routes/events.js';
import teamsRouter from './routes/teams.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5050;

// Initialize SQLite database
initDb();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount API Routes
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/events', eventsRouter);
app.use('/api/teams', teamsRouter);

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
