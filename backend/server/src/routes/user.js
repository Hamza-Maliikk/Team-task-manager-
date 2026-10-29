import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { supabase, unwrap } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, numericParam } from '../utils/helpers.js';
import { generatePassword } from '../utils/password.js';
import { sendCredentials } from '../utils/mailer.js';
import { createUserSchema } from '../validators.js';

const router = Router();
router.use(requireAuth);
router.use((req, res, next) =>
  req.user.role === 'admin' ? next() : res.status(403).json({ message: 'Only an admin can manage users' })
);
router.param('id', numericParam);

// Emails the login details. If email is not set up (or fails) the password is returned ONCE
// in the response so the admin can pass it on manually.
async function deliver(user, password, res, status = 200) {
  const emailSent = await sendCredentials({ to: user.email, name: user.name, password });
  res.status(status).json({ user, emailSent, ...(emailSent ? {} : { tempPassword: password }) });
}

router.get('/', asyncHandler(async (req, res) => {
  res.json(unwrap(await supabase
    .from('users')
    .select('id, name, email, role, created_at')
    .order('created_at', { ascending: false })));
}));

// Admin creates an account: a password is generated and emailed to the user
router.post('/', validate(createUserSchema), asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  const exists = unwrap(await supabase.from('users').select('id').eq('email', email).maybeSingle());
  if (exists) return res.status(409).json({ message: 'A user with this email already exists' });

  const password = generatePassword();
  const user = unwrap(await supabase
    .from('users')
    .insert({ name, email, password_hash: await bcrypt.hash(password, 12), role: 'user' })
    .select('id, name, email, role')
    .single());
  await deliver(user, password, res, 201);
}));

// Forgot password: admin generates a new one and it is emailed again
router.post('/:id/reset-password', asyncHandler(async (req, res) => {
  const user = unwrap(await supabase.from('users').select('id, name, email, role').eq('id', req.params.id).maybeSingle());
  if (!user) return res.status(404).json({ message: 'User not found' });

  const password = generatePassword();
  unwrap(await supabase.from('users').update({ password_hash: await bcrypt.hash(password, 12) }).eq('id', user.id));
  await deliver(user, password, res);
}));

export default router;