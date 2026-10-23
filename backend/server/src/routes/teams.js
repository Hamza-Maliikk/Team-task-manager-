import { Router } from 'express';
import pool, { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, getRole, numericParam } from '../utils/helpers.js';
import { teamSchema, memberSchema } from '../validators.js';

const router = Router();
router.use(requireAuth);
router.param('id', numericParam);
router.param('userId', numericParam);

// Access guards. Non-members get 404 so team existence is not leaked.
const member = asyncHandler(async (req, res, next) => {
  req.role = await getRole(req.params.id, req.user.id);
  return req.role ? next() : res.status(404).json({ message: 'Team not found' });
});
const owner = (req, res, next) =>
  req.role === 'owner' ? next() : res.status(403).json({ message: 'Only the team owner can do this' });

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT t.id, t.name, t.owner_id, m.role,
            (SELECT COUNT(*)::int FROM team_members WHERE team_id = t.id) AS member_count
       FROM teams t JOIN team_members m ON m.team_id = t.id AND m.user_id = $1
      ORDER BY t.name`,
    [req.user.id]
  );
  res.json(rows);
}));

router.post('/', validate(teamSchema), asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [team] } = await client.query('INSERT INTO teams (name, owner_id) VALUES ($1, $2) RETURNING *', [req.body.name, req.user.id]);
    await client.query("INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'owner')", [team.id, req.user.id]);
    await client.query('COMMIT');
    res.status(201).json(team);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

router.get('/:id', member, asyncHandler(async (req, res) => {
  const { rows: [team] } = await query('SELECT id, name, owner_id, created_at FROM teams WHERE id = $1', [req.params.id]);
  const { rows: members } = await query(
    `SELECT u.id, u.name, u.email, m.role FROM team_members m JOIN users u ON u.id = m.user_id
      WHERE m.team_id = $1 ORDER BY u.name`,
    [req.params.id]
  );
  res.json({ ...team, members });
}));

router.put('/:id', member, owner, validate(teamSchema), asyncHandler(async (req, res) => {
  const { rows: [team] } = await query('UPDATE teams SET name = $1 WHERE id = $2 RETURNING *', [req.body.name, req.params.id]);
  res.json(team);
}));

router.delete('/:id', member, owner, asyncHandler(async (req, res) => {
  await query('DELETE FROM teams WHERE id = $1', [req.params.id]);
  res.status(204).end();
}));

router.post('/:id/members', member, validate(memberSchema), asyncHandler(async (req, res) => {
  const { rows: [user] } = await query('SELECT id, name, email FROM users WHERE email = $1', [req.body.email]);
  if (!user) return res.status(404).json({ message: 'No user with that email. They need to register first.' });
  if (await getRole(req.params.id, user.id)) return res.status(409).json({ message: 'User is already in this team' });
  await query("INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'member')", [req.params.id, user.id]);
  res.status(201).json(user);
}));

router.delete('/:id/members/:userId', member, owner, asyncHandler(async (req, res) => {
  if (Number(req.params.userId) === req.user.id) return res.status(400).json({ message: 'The owner cannot be removed' });
  await query('DELETE FROM team_members WHERE team_id = $1 AND user_id = $2', [req.params.id, req.params.userId]);
  await query('UPDATE tasks SET assignee_id = NULL WHERE team_id = $1 AND assignee_id = $2', [req.params.id, req.params.userId]);
  res.status(204).end();
}));

export default router;
