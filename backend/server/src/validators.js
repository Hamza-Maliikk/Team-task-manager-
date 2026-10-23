import Joi from 'joi';

// Trim + strip HTML tags from free text (React also escapes on output)
const text = (max) => Joi.string().trim().max(max).custom((v) => v.replace(/<[^>]*>/g, '').trim());
const email = Joi.string().trim().lowercase().email().max(255);
const id = Joi.number().integer().positive();

export const registerSchema = Joi.object({
  name: text(100).min(2).required(),
  email: email.required(),
  password: Joi.string().min(8).max(72).required(), // bcrypt only uses the first 72 bytes
});

export const loginSchema = Joi.object({ email: email.required(), password: Joi.string().max(72).required() });
export const teamSchema = Joi.object({ name: text(100).min(2).required() });
export const memberSchema = Joi.object({ email: email.required() });

const taskFields = {
  title: text(200).min(1).required(),
  description: text(2000).allow('').default(''),
  status: Joi.string().valid('todo', 'in_progress', 'done').default('todo'),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
  due_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(null, ''),
  assignee_id: id.allow(null),
};
export const createTaskSchema = Joi.object({ ...taskFields, team_id: id.required() });
export const updateTaskSchema = Joi.object(taskFields);

export const taskQuerySchema = Joi.object({
  teamId: id,
  assigneeId: id,
  status: Joi.string().valid('todo', 'in_progress', 'done'),
  search: text(100).allow(''),
});
