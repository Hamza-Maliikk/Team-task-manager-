import { Router } from 'express';
import { supabase, unwrap } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, getRole, numericParam } from '../utils/helpers.js';
import { createTaskSchema, updateTaskSchema, taskQuerySchema } from '../validators.js';

const router = Router();
router.use(requireAuth);
router.param('id', numericParam);

const TASK_COLUMNS = `
  id, title, description, status, priority, due_date, team_id,
  teams!tasks_team_id_fkey(name),
  assignee_id, assignee:users!tasks_assignee_id_fkey(name),
  created_by, created_at, updated_at`;

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

router.get('/', validate(taskQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const { teamId, assigneeId, status, search } = req.query;
  const memberships = unwrap(await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', req.user.id));
  const teamIds = memberships.map(({ team_id }) => team_id);
  if (teamIds.length === 0) return res.json([]);

  let request = supabase
    .from('tasks')
    .select(TASK_COLUMNS)
    .in('team_id', teamIds)
    .order('created_at', { ascending: false });

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
  if (!(await getRole(b.team_id, req.user.id))) return res.status(403).json({ message: 'You are not a member of this team' });
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
  if (!task || !(await getRole(task.team_id, req.user.id))) return res.status(404).json({ message: 'Task not found' });

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
  const role = task && (await getRole(task.team_id, req.user.id));
  if (!role) return res.status(404).json({ message: 'Task not found' });
  if (role !== 'owner' && task.created_by !== req.user.id)
    return res.status(403).json({ message: 'Only the task creator or team owner can delete this task' });

  unwrap(await supabase.from('tasks').delete().eq('id', task.id));
  res.status(204).end();
}));

export default router;
