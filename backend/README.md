# Team Task Manager

Full stack app: React + Vite + Tailwind (client) and Node.js + Express + PostgreSQL (server).
Auth: PassportJS (local) + express-session stored in PostgreSQL, HTTP-only cookies, bcrypt-hashed passwords.

## Local setup
1. Create a PostgreSQL database (local, or a free Neon project) and copy its connection string.
2. Backend:
   ```bash
   cd server
   cp .env.example .env      # fill DATABASE_URL and SESSION_SECRET
   npm install
   npm run migrate           # creates tables
   npm run dev               # http://localhost:5000
   ```
3. Frontend (new terminal):
   ```bash
   cd client
   cp .env.example .env
   npm install
   npm run dev               # http://localhost:5173
   ```

## API
| Route | Method | Notes |
|---|---|---|
| `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me` | POST/POST/POST/GET | public (except me/logout need a session) |
| `/teams` | GET, POST | my teams / create |
| `/teams/:id` | GET, PUT, DELETE | members only; PUT/DELETE owner only |
| `/teams/:id/members` | POST | add by email (any member) |
| `/teams/:id/members/:userId` | DELETE | owner only |
| `/tasks` | GET | filters: `teamId`, `assigneeId`, `status`, `search` |
| `/tasks`, `/tasks/:id` | POST, PUT, DELETE | team members; delete by creator or owner |

## Deploy (single service: Express serves the React build)
Environment variables: `NODE_ENV=production`, `DATABASE_URL`, `SESSION_SECRET`.

**Render (free web service) + Neon (free Postgres)**
- Build command: `npm --prefix client install && npm --prefix client run build && npm --prefix server install`
- Start command: `node server/src/server.js`
- Run `npm run migrate` once (from `server/`, with `DATABASE_URL` set) to create the tables.

**Google Cloud Run (+ Cloud SQL)**
```bash
gcloud run deploy team-task-manager --source . --region <region> \
  --allow-unauthenticated --set-env-vars NODE_ENV=production,SESSION_SECRET=<secret>,DATABASE_URL=<url>
```

## Git workflow
Feature branches (`feature/db-schema`, `feature/auth`, `feature/teams`, `feature/tasks`, `feature/frontend`, `feature/deployment`) merged to `main` through pull requests.
