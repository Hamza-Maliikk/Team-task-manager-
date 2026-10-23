import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import { query } from './db.js';

passport.use(
  new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
      const { rows: [user] } = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
      const ok = user && (await bcrypt.compare(password, user.password_hash));
      return ok ? done(null, user) : done(null, false, { message: 'Invalid email or password' });
    } catch (err) {
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const { rows: [user] } = await query('SELECT id, name, email FROM users WHERE id = $1', [id]);
    done(null, user || false);
  } catch (err) {
    done(err);
  }
});

export default passport;
