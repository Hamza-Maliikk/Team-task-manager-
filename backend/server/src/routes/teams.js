import { Router } from 'express';
import { supabase, unwrap } from '../config/db.js';
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
  const memberships = unwrap(await supabase
    .from('team_members')
    .select('team_id, role, teams!inner(id, name, owner_id)')
    .eq('user_id', req.user.id));
  if (memberships.length === 0) return res.json([]);

  const teamIds = memberships.map(({ team_id }) => team_id);
  const memberRows = unwrap(await supabase
    .from('team_members')
    .select('team_id')
    .in('team_id', teamIds));
  const memberCounts = new Map();
  for (const { team_id } of memberRows) {
    memberCounts.set(team_id, (memberCounts.get(team_id) || 0) + 1);
  }

  res.json(memberships
    .map(({ team_id, role, teams }) => ({
      ...teams,
      role,
      member_count: memberCounts.get(team_id) || 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name)));
}));

router.post('/', validate(teamSchema), asyncHandler(async (req, res) => {
  const team = unwrap(await supabase
    .from('teams')
    .insert({ name: req.body.name, owner_id: req.user.id })
    .select()
    .single());

  try {
    unwrap(await supabase
      .from('team_members')
      .insert({ team_id: team.id, user_id: req.user.id, role: 'owner' }));
  } catch (err) {
    const cleanup = await supabase.from('teams').delete().eq('id', team.id);
    if (cleanup.error) console.error('Failed to remove team after owner membership creation failed:', cleanup.error);
    throw err;
  }

  res.status(201).json(team);
}));

router.get('/:id', member, asyncHandler(async (req, res) => {
  const team = unwrap(await supabase
    .from('teams')
    .select('id, name, owner_id, created_at')
    .eq('id', req.params.id)
    .single());
  const members = unwrap(await supabase
    .from('team_members')
    .select('role, users!inner(id, name, email)')
    .eq('team_id', req.params.id));

  res.json({
    ...team,
    members: members
      .map(({ role, users }) => ({ ...users, role }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  });
}));

router.put('/:id', member, owner, validate(teamSchema), asyncHandler(async (req, res) => {
  const team = unwrap(await supabase
    .from('teams')
    .update({ name: req.body.name })
    .eq('id', req.params.id)
    .select()
    .single());
  res.json(team);
}));

router.delete('/:id', member, owner, asyncHandler(async (req, res) => {
  unwrap(await supabase.from('teams').delete().eq('id', req.params.id));
  res.status(204).end();
}));

router.post('/:id/members', member, validate(memberSchema), asyncHandler(async (req, res) => {
  const user = unwrap(await supabase
    .from('users')
    .select('id, name, email')
    .eq('email', req.body.email)
    .maybeSingle());
  if (!user) return res.status(404).json({ message: 'No user with that email. They need to register first.' });
  if (await getRole(req.params.id, user.id)) return res.status(409).json({ message: 'User is already in this team' });

  unwrap(await supabase
    .from('team_members')
    .insert({ team_id: req.params.id, user_id: user.id, role: 'member' }));
  res.status(201).json(user);
}));

router.delete('/:id/members/:userId', member, owner, asyncHandler(async (req, res) => {
  if (Number(req.params.userId) === req.user.id) return res.status(400).json({ message: 'The owner cannot be removed' });

  unwrap(await supabase
    .from('team_members')
    .delete()
    .eq('team_id', req.params.id)
    .eq('user_id', req.params.userId));
  unwrap(await supabase
    .from('tasks')
    .update({ assignee_id: null })
    .eq('team_id', req.params.id)
    .eq('assignee_id', req.params.userId));
  res.status(204).end();
}));

export default router;
