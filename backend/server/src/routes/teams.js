import { Router } from 'express';
import { supabase, unwrap } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, getRole, numericParam } from '../utils/helpers.js';
import { getAccess } from '../utils/access.js';
import { teamSchema, createTeamSchema, memberSchema } from '../validators.js';

const router = Router();
router.use(requireAuth);
router.param('id', numericParam);
router.param('userId', numericParam);

// Loads the caller's access on the team: 'admin' | 'leader' | 'member'. Outsiders get 404.
const loadAccess = asyncHandler(async (req, res, next) => {
  const team = unwrap(await supabase.from('teams').select('id').eq('id', req.params.id).maybeSingle());
  req.access = team ? await getAccess(team.id, req.user) : null;
  return req.access ? next() : res.status(404).json({ message: 'Team not found' });
});
const allow = (...roles) => (req, res, next) =>
  roles.includes(req.access) ? next() : res.status(403).json({ message: 'You do not have permission to do this' });
const adminOnly = (req, res, next) =>
  req.user.role === 'admin' ? next() : res.status(403).json({ message: 'Only an admin can do this' });

// Admin sees every team; others see the teams they belong to (with their role)
router.get('/', asyncHandler(async (req, res) => {
  let list;
  if (req.user.role === 'admin') {
    list = unwrap(await supabase.from('teams').select('id, name, owner_id')).map((t) => ({ ...t, role: 'admin' }));
  } else {
    const memberships = unwrap(await supabase
      .from('team_members')
      .select('team_id, role, teams!inner(id, name, owner_id)')
      .eq('user_id', req.user.id));
    list = memberships.map(({ role, teams }) => ({ ...teams, role }));
  }
  if (list.length === 0) return res.json([]);

  const memberRows = unwrap(await supabase
    .from('team_members')
    .select('team_id')
    .in('team_id', list.map((t) => t.id)));
  const memberCounts = new Map();
  for (const { team_id } of memberRows) {
    memberCounts.set(team_id, (memberCounts.get(team_id) || 0) + 1);
  }

  res.json(list
    .map((t) => ({ ...t, member_count: memberCounts.get(t.id) || 0 }))
    .sort((a, b) => a.name.localeCompare(b.name)));
}));

// Admin creates a team and can name its leader
router.post('/', adminOnly, validate(createTeamSchema), asyncHandler(async (req, res) => {
  let leader = null;
  if (req.body.leader_email) {
    leader = unwrap(await supabase.from('users').select('id').eq('email', req.body.leader_email).maybeSingle());
    if (!leader) return res.status(404).json({ message: 'No user with the leader email. They need to register first.' });
  }

  const team = unwrap(await supabase
    .from('teams')
    .insert({ name: req.body.name, owner_id: req.user.id })
    .select()
    .single());

  if (leader) {
    try {
      unwrap(await supabase.from('team_members').insert({ team_id: team.id, user_id: leader.id, role: 'leader' }));
    } catch (err) {
      const cleanup = await supabase.from('teams').delete().eq('id', team.id);
      if (cleanup.error) console.error('Failed to remove team after leader membership creation failed:', cleanup.error);
      throw err;
    }
  }

  res.status(201).json(team);
}));

router.get('/:id', loadAccess, asyncHandler(async (req, res) => {
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
    my_role: req.access,
    members: members
      .map(({ role, users }) => ({ ...users, role }))
      .sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === 'leader' ? -1 : 1)),
  });
}));

router.put('/:id', loadAccess, allow('admin', 'leader'), validate(teamSchema), asyncHandler(async (req, res) => {
  const team = unwrap(await supabase
    .from('teams')
    .update({ name: req.body.name })
    .eq('id', req.params.id)
    .select()
    .single());
  res.json(team);
}));

router.delete('/:id', loadAccess, allow('admin'), asyncHandler(async (req, res) => {
  unwrap(await supabase.from('teams').delete().eq('id', req.params.id));
  res.status(204).end();
}));

// Admin or leader adds members. Only the admin can add another leader.
router.post('/:id/members', loadAccess, allow('admin', 'leader'), validate(memberSchema), asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  if (role === 'leader' && req.access !== 'admin') return res.status(403).json({ message: 'Only an admin can add a team leader' });

  const user = unwrap(await supabase
    .from('users')
    .select('id, name, email')
    .eq('email', email)
    .maybeSingle());
  if (!user) return res.status(404).json({ message: 'No user with that email. They need to register first.' });
  if (await getRole(req.params.id, user.id)) return res.status(409).json({ message: 'User is already in this team' });

  unwrap(await supabase
    .from('team_members')
    .insert({ team_id: req.params.id, user_id: user.id, role }));
  res.status(201).json({ ...user, role });
}));

router.delete('/:id/members/:userId', loadAccess, allow('admin', 'leader'), asyncHandler(async (req, res) => {
  const target = await getRole(req.params.id, req.params.userId);
  if (!target) return res.status(404).json({ message: 'Member not found' });
  if (target === 'leader' && req.access !== 'admin') return res.status(403).json({ message: 'Only an admin can remove a team leader' });

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