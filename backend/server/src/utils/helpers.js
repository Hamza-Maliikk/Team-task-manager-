import { query } from '../config/db.js';

// Lets route handlers throw / reject without try-catch boilerplate
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Returns 'owner' | 'member' | null
export async function getRole(teamId, userId) {
  const { rows: [row] } = await query('SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2', [teamId, userId]);
  return row?.role ?? null;
}

// Rejects non-numeric :params early
export const numericParam = (req, res, next, value) =>
  /^\d+$/.test(value) ? next() : res.status(400).json({ message: 'Invalid id' });
