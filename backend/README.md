# Team Task Manager

Full stack app: React + Vite + Tailwind (client) and Node.js + Express (server). The server uses the Supabase JavaScript client for database access and stores login sessions in Supabase. Passwords are bcrypt-hashed.

## Supabase setup
1. Create a Supabase project.
2. Open the project's **SQL Editor**, paste the contents of [`server/supabase/schema.sql`](./server/supabase/schema.sql), and run it once to create the tables.
3. In the Supabase project settings, copy the project URL and the **service role** key. The service role key is a server secret: never put it in the client app or commit it.

## Local setup
1. Backend:
   ```bash
   cd backend/server
   cp .env.example .env
   ```
   Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and a unique `SESSION_SECRET` in `.env`, then run:
   ```bash
   npm install
   npm run dev               # http://localhost:5000
   ```
2. Frontend (new terminal, from the repository root):
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
Set `NODE_ENV=production`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SESSION_SECRET` in the hosting provider's server environment.

**Render**
- Build command: `npm --prefix client install && npm --prefix client run build && npm --prefix backend/server install`
- Start command: `node backend/server/src/server.js`
- Use the same Supabase project and schema as above; no database connection string or server-side migration command is needed.

**Docker** (build from the repository root with `backend/Dockerfile`):
```bash
docker build -f backend/Dockerfile -t team-task-manager .
docker run -p 8080:8080 -e NODE_ENV=production -e SUPABASE_URL=<url> \
  -e SUPABASE_SERVICE_ROLE_KEY=<service-role-key> -e SESSION_SECRET=<secret> team-task-manager
```

## Git workflow
Feature branches (`feature/db-schema`, `feature/auth`, `feature/teams`, `feature/tasks`, `feature/frontend`, `feature/deployment`) merged to `main` through pull requests.
