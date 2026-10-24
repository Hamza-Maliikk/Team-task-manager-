import { Router } from 'express';
import { supabase, unwrap } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, getRole, numericParam } from '../utils/helpers.js';
import { getAccess, canManage } from '../utils/access.js';
import { createTaskSchema, updateTaskSchema, taskQuerySchema } from '../validators.js';

const router = Router();
router.use(requireAuth);
router.param('id', numericParam);

const TASK_COLUMNS = `
  id, title, description, status, priority, due_date, team_id,
  teams!tasks_team_id_fkey(name),
  assignee_id, assignee:users!tasks_assignee_id_fkey(name),
  created_by, created_at, updated_at`;

const VIEW_ONLY = { message: 'Team members have view-only access' };

const formatTask = (task) => {
  if (!task) return task;
  const { teams, assignee, ...fields } = task;
  return {
    ...fields,
    team_name: teams?.name ?? null,
    assignee_name: assignee?.name ?? null,
  };
};

const findTask = async (id) => formatTask(unwrap(await supabase
  .from('tasks')
  .select(TASK_COLUMNS)
  .eq('id', id)
  .maybeSingle()));

// Returns an error message if the assignee is not part of the team
async function checkAssignee(teamId, assigneeId) {
  if (assigneeId && !(await getRole(teamId, assigneeId))) return 'Assignee must be a member of the team';
  return null;
}

// Everyone can view: admin sees all tasks, others see tasks of their teams
router.get('/', validate(taskQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const { teamId, assigneeId, status, search } = req.query;

  let request = supabase
    .from('tasks')
    .select(TASK_COLUMNS)
    .order('created_at', { ascending: false });

  if (req.user.role !== 'admin') {
    const memberships = unwrap(await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', req.user.id));
    const teamIds = memberships.map(({ team_id }) => team_id);
    if (teamIds.length === 0) return res.json([]);
    request = request.in('team_id', teamIds);
  }

  if (teamId) request = request.eq('team_id', teamId);
  if (assigneeId) request = request.eq('assignee_id', assigneeId);
  if (status) request = request.eq('status', status);
  if (search) {
    const pattern = search
      .replace(/[\\%_]/g, '\\$&')
      .replace(/"/g, '\\"');
    request = request.or(`title.ilike."%${pattern}%",description.ilike."%${pattern}%"`);
  }

  res.json(unwrap(await request).map(formatTask));
}));

router.post('/', validate(createTaskSchema), asyncHandler(async (req, res) => {
  const b = req.body;
  const access = await getAccess(b.team_id, req.user);
  if (!access) return res.status(403).json({ message: 'You are not a member of this team' });
  if (!canManage(access)) return res.status(403).json(VIEW_ONLY);

  const problem = await checkAssignee(b.team_id, b.assignee_id);
  if (problem) return res.status(400).json({ message: problem });

  const { id } = unwrap(await supabase
    .from('tasks')
    .insert({
      title: b.title,
      description: b.description,
      status: b.status,
      priority: b.priority,
      due_date: b.due_date || null,
      team_id: b.team_id,
      assignee_id: b.assignee_id ?? null,
      created_by: req.user.id,
    })
    .select('id')
    .single());
  res.status(201).json(await findTask(id));
}));

router.put('/:id', validate(updateTaskSchema), asyncHandler(async (req, res) => {
  const task = await findTask(req.params.id);
  const access = task && (await getAccess(task.team_id, req.user));
  if (!access) return res.status(404).json({ message: 'Task not found' });
  if (!canManage(access)) return res.status(403).json(VIEW_ONLY);

  const b = req.body;
  const problem = await checkAssignee(task.team_id, b.assignee_id);
  if (problem) return res.status(400).json({ message: problem });

  unwrap(await supabase
    .from('tasks')
    .update({
      title: b.title,
      description: b.description,
      status: b.status,
      priority: b.priority,
      due_date: b.due_date || null,
      assignee_id: b.assignee_id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', task.id));
  res.json(await findTask(task.id));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const task = await findTask(req.params.id);
  const access = task && (await getAccess(task.team_id, req.user));
  if (!access) return res.status(404).json({ message: 'Task not found' });
  if (!canManage(access)) return res.status(403).json(VIEW_ONLY);

  unwrap(await supabase.from('tasks').delete().eq('id', task.id));
  res.status(204).end();
}));

export default router;