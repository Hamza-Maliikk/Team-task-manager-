import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import passport from '../config/passport.js';
import { supabase, unwrap } from '../config/db.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/helpers.js';
import { registerSchema, loginSchema } from '../validators.js';

const router = Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Try again later.' },
});

router.post('/register', limiter, validate(registerSchema), asyncHandler(async (req, res, next) => {
  const { name, email, password } = req.body;
  const hash = await bcrypt.hash(password, 12);
  // The account registered with ADMIN_EMAIL becomes the Admin
  const role = process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL.trim().toLowerCase() === email ? 'admin' : 'user';
  let user;
  try {
    user = unwrap(await supabase
      .from('users')
      .insert({ name, email, password_hash: hash, role })
      .select('id, name, email, role')
      .single());
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Email is already registered' });
    throw err;
  }
  req.login(user, (err) => (err ? next(err) : res.status(201).json(user)));
}));

router.post('/login', limiter, validate(loginSchema), (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ message: info?.message || 'Invalid email or password' });
    req.login(user, (e) => (e ? next(e) : res.json({ id: user.id, name: user.name, email: user.email, role: user.role })));
  })(req, res, next);
});

router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((destroyErr) => {
      if (destroyErr) return next(destroyErr);
      res.clearCookie('ttm.sid', {
        path: '/login',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
      res.json({ message: 'Logged out' });
    });
  });
});

router.get('/me', (req, res) =>
  req.isAuthenticated() ? res.json(req.user) : res.status(401).json({ message: 'Not logged in' })
);

export default router;