import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import passport from '../config/passport.js';
import { validate } from '../middleware/validate.js';
import { loginSchema } from '../validators.js';

const router = Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Try again later.' },
});

// No public sign-up: accounts are created by the admin (see routes/users.js)
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
        path: '/',
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