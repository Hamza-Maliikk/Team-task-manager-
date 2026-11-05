import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import passport from './config/passport.js';
import sessionMiddleware from './config/session.js';
import authRoutes from './routes/auth.js';
import teamRoutes from './routes/teams.js';
import userRoutes from './routes/user.js';
import taskRoutes from './routes/tasks.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();
app.set('trust proxy', 1);
const isProd = process.env.NODE_ENV === 'production';

if (isProd) app.set('trust proxy', 1); // needed for secure cookies behind Render / Cloud Run

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'upgrade-insecure-requests': null,
      },
    },
  })
);
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '100kb' }));
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/auth', authRoutes);
app.use('/teams', teamRoutes);
app.use('/tasks', taskRoutes);
app.use('/users', userRoutes);

// Production: serve the React build from the same origin (keeps the session cookie first-party)
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);

export default app;
