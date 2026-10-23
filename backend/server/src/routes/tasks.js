import { Router } from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, getRole, numericParam } from '../utils/helpers.js';
import { createTaskSchema, updateTaskSchema, taskQuerySchema } from '../validators.js';

const router = Router();
router.use(requireAuth);
router.param('id', numericParam);

const SELECT = `
  SELECT t.id, t.title, t.description, t.status, t.priority,
         to_char(t.due_date, 'YYYY-MM-DD') AS due_date,
         t.team_id, tm.name AS team_name,
         t.assignee_id, a.name AS assignee_name,
         t.created_by, t.created_at, t.updated_at
    FROM tasks t
    JOIN teams tm ON tm.id = t.team_id
    LEFT JOIN users a ON a.id = t.assignee_id`;

const findTask = async (id) => (await query(`${SELECT} WHERE t.id = $1`, [id])).rows[0];

// Returns an error message if the assignee is not part of the team
async function checkAssignee(teamId, assigneeId) {
  if (assigneeId && !(await getRole(teamId, assigneeId))) return 'Assignee must be a member of the team';
  return null;
}

router.get('/', validate(taskQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const { teamId, assigneeId, status, search } = req.query;
  const params = [req.user.id];
  // Only tasks from teams the user belongs to
  const where = ['t.team_id IN (SELECT team_id FROM team_members WHERE user_id = $1)'];
  const add = (sql, value) => { params.push(value); where.push(sql.replaceAll('?', `$${params.length}`)); };

  if (teamId) add('t.team_id = ?', teamId);
  if (assigneeId) add('t.assignee_id = ?', assigneeId);
  if (status) add('t.status = ?', status);
  if (search) add('(t.title ILIKE ? OR t.description ILIKE ?)', `%${search.replace(/[\\%_]/g, '\\$&')}%`);

  const { rows } = await query(`${SELECT} WHERE ${where.join(' AND ')} ORDER BY t.created_at DESC`, params);
  res.json(rows);
}));

router.post('/', validate(createTaskSchema), asyncHandler(async (req, res) => {
  const b = req.body;
  if (!(await getRole(b.team_id, req.user.id))) return res.status(403).json({ message: 'You are not a member of this team' });
  const problem = await checkAssignee(b.team_id, b.assignee_id);
  if (problem) return res.status(400).json({ message: problem });

  const { rows: [{ id }] } = await query(
    `INSERT INTO tasks (title, description, status, priority, due_date, team_id, assignee_id, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [b.title, b.description, b.status, b.priority, b.due_date || null, b.team_id, b.assignee_id ?? null, req.user.id]
  );
  res.status(201).json(await findTask(id));
}));

router.put('/:id', validate(updateTaskSchema), asyncHandler(async (req, res) => {
  const task = await findTask(req.params.id);
  if (!task || !(await getRole(task.team_id, req.user.id))) return res.status(404).json({ message: 'Task not found' });

  const b = req.body;
  const problem = await checkAssignee(task.team_id, b.assignee_id);
  if (problem) return res.status(400).json({ message: problem });

  await query(
    `UPDATE tasks SET title = $1, description = $2, status = $3, priority = $4, due_date = $5,
                      assignee_id = $6, updated_at = now() WHERE id = $7`,
    [b.title, b.description, b.status, b.priority, b.due_date || null, b.assignee_id ?? null, task.id]
  );
  res.json(await findTask(task.id));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const task = await findTask(req.params.id);
  const role = task && (await getRole(task.team_id, req.user.id));
  if (!role) return res.status(404).json({ message: 'Task not found' });
  if (role !== 'owner' && task.created_by !== req.user.id)
    return res.status(403).json({ message: 'Only the task creator or team owner can delete this task' });

  await query('DELETE FROM tasks WHERE id = $1', [task.id]);
  res.status(204).end();
}));

export default router;
