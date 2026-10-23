import session from 'express-session';
import connectPg from 'connect-pg-simple';
import pool from './db.js';

const isProd = process.env.NODE_ENV === 'production';
if (isProd && !process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is required in production');

// Sessions live in PostgreSQL; SESSION_STORE=memory is the dev fallback
const PgStore = connectPg(session);
const store = process.env.SESSION_STORE === 'memory' ? undefined : new PgStore({ pool, createTableIfMissing: true });

export default session({
  store,
  name: 'ttm.sid',
  secret: process.env.SESSION_SECRET || 'dev-only-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
});
