import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import { supabase, unwrap } from './db.js';

passport.use(
  new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
      const user = unwrap(await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle());
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
    const user = unwrap(await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', id)
      .maybeSingle());
    done(null, user || false);
  } catch (err) {
    done(err);
  }
});

export default passport;
