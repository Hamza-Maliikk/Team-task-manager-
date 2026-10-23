import { supabase, unwrap } from '../config/db.js';

// Lets route handlers throw / reject without try-catch boilerplate
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Returns 'owner' | 'member' | null
export async function getRole(teamId, userId) {
  const row = unwrap(await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .maybeSingle());
  return row?.role ?? null;
}

// Rejects non-numeric :params early
export const numericParam = (req, res, next, value) =>
  /^\d+$/.test(value) ? next() : res.status(400).json({ message: 'Invalid id' });
