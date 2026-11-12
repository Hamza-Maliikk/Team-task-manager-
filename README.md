# Team Task Manager

A full stack web app for managing teams and their tasks. The admin creates users and teams, assigns tasks, and each user logs in to see the tasks assigned to them.

**Tech stack:** React + Vite + Tailwind CSS (frontend), Node.js + Express (backend), Supabase PostgreSQL (database), PassportJS + Express Session (authentication).

---

## Demo login

For demo and development only:

| | |
|---|---|
| **Email** | `admin@gmail.com` |
| **Password** | `admin12345` |

The admin account is created automatically when the server starts (see `ADMIN_EMAIL` and `ADMIN_PASSWORD` below). Change these values before using the app for real.

---

## Features

- Secure login and logout. There is no public sign-up
- Admin creates a user from an email address. A password is generated and emailed to that user
- Admin creates teams, adds or removes team members
- Admin creates, assigns, updates and deletes tasks inside teams
- Users see only the tasks assigned to them
- Dashboard with team list and task list, task modal (create / update)
- Search and filter tasks by team, assignee and status
- Clean, responsive UI

---

## Project structure

```
team-task-manager/
├── server/        Express API (routes, middleware, validators, config)
│   ├── schema.sql     database tables
│   └── src/
└── client/        React app (pages, components, api, context)
    └── src/
```

---

## Setup

### 1. Database
Create a project on [supabase.com](https://supabase.com), open **SQL Editor**, paste the contents of `server/schema.sql` and run it.

### 2. Backend
```bash
cd server
cp .env.example .env      # Windows: copy .env.example .env
npm install
npm run dev               # http://localhost:5000
```

`server/.env`:
```
PORT=5000
NODE_ENV=development
SESSION_SECRET=any-long-random-string
CLIENT_ORIGIN=http://localhost:5173

# Supabase (use the variable names from .env.example)
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# Admin account created on first start
ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=admin12345
ADMIN_NAME=Admin

# Email (optional, used to send passwords to new users)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-gmail-app-password
MAIL_FROM=Team Task Manager <you@gmail.com>
APP_URL=http://localhost:5173
```

### 3. Frontend
```bash
cd client
cp .env.example .env
npm install
npm run dev               # http://localhost:5173
```

Open `http://localhost:5173` and log in with the demo admin account.

---

## How users are added

1. Log in as admin and open **Users** in the navbar.
2. Enter a name and email, then click **Create user & send password**.
3. A random password is generated, saved as a bcrypt hash and emailed to the user.
4. Add the user to a team from the team panel. The user can now log in and see their assigned tasks.

If email is not configured or sending fails, the user is still created and the password is shown to the admin once on screen so it can be shared manually. A forgotten password can be replaced with **Reset password** in the Users list.

For Gmail, create an **App Password** (Google Account > Security > 2-Step Verification > App passwords) and use it as `SMTP_PASS`.

---

## API

| Route | Method | Description |
|---|---|---|
| `/auth/login` | POST | Log in |
| `/auth/logout` | POST | Log out |
| `/auth/me` | GET | Current user |
| `/users` | GET, POST | List users / create a user (admin) |
| `/teams` | GET, POST | List teams / create a team |
| `/teams/:id` | GET, PUT, DELETE | Team details, rename, delete |
| `/teams/:id/members` | POST | Add a member by email |
| `/teams/:id/members/:userId` | DELETE | Remove a member |
| `/tasks` | GET | List tasks. Filters: `teamId`, `assigneeId`, `status`, `search` |
| `/tasks` | POST | Create a task |
| `/tasks/:id` | PUT, DELETE | Update or delete a task |

All routes except `/auth/login` need a logged-in session.




- **Build Command:** `npm --prefix client install && npm --prefix client run build && npm --prefix server install`
- **Start Command:** `node server/src/server.js`
- **Environment variables:** the same as `server/.env`, with `NODE_ENV=production` and `APP_URL` set to your Render URL. Do not set `VITE_API_URL`.

Note: Render's free plan blocks outbound email ports (25, 465, 587), so emails will not be sent there. The app then shows the generated password to the admin on screen instead.
