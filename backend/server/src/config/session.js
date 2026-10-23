import session from 'express-session';
import { supabase, unwrap } from './db.js';

class SupabaseSessionStore extends session.Store {
  get(sid, callback) {
    supabase
      .from('sessions')
      .select('sess, expire')
      .eq('sid', sid)
      .gt('expire', new Date().toISOString())
      .maybeSingle()
      .then((result) => callback(null, unwrap(result)?.sess))
      .catch(callback);
  }

  set(sid, sess, callback = () => {}) {
    const expiration = sess.cookie?.expires
      ? new Date(sess.cookie.expires).toISOString()
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    supabase
      .from('sessions')
      .upsert({ sid, sess, expire: expiration }, { onConflict: 'sid' })
      .then((result) => {
        unwrap(result);
        callback();
      })
      .catch(callback);
  }

  destroy(sid, callback = () => {}) {
    supabase
      .from('sessions')
      .delete()
      .eq('sid', sid)
      .then((result) => {
        unwrap(result);
        callback();
      })
      .catch(callback);
  }

  touch(sid, sess, callback = () => {}) {
    const expiration = sess.cookie?.expires
      ? new Date(sess.cookie.expires).toISOString()
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    supabase
      .from('sessions')
      .update({ expire: expiration })
      .eq('sid', sid)
      .then((result) => {
        unwrap(result);
        callback();
      })
      .catch(callback);
  }
}

const isProd = process.env.NODE_ENV === 'production';
if (isProd && !process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is required in production');

const store = process.env.SESSION_STORE === 'memory' ? undefined : new SupabaseSessionStore();

export default session({
  store,
  name: 'ttm.sid',
  secret: process.env.SESSION_SECRET || 'dev-only-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
});
