// Loads .env BEFORE any other module reads process.env.
// ESM evaluates imports top-to-bottom, so this must be the FIRST import in
// server.js — otherwise routes/middleware that read process.env at module load
// (JWT_SECRET, GOOGLE_CLIENT_ID, ADMIN_EMAILS, …) get undefined.
import dotenv from 'dotenv';

dotenv.config();
