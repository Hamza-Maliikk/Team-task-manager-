import bcrypt from 'bcryptjs';
import { supabase, unwrap } from '../config/db.js';

// Creates the first admin from .env (ADMIN_EMAIL + ADMIN_PASSWORD). Safe to run on every start:
// an existing account is never given a new password, it is only promoted to admin.
export async function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const existing = unwrap(await supabase.from('users').select('id, role').eq('email', email).maybeSingle());
  if (existing) {
    if (existing.role !== 'admin') unwrap(await supabase.from('users').update({ role: 'admin' }).eq('id', existing.id));
    return;
  }

  const password_hash = await bcrypt.hash(password, 12);
  unwrap(await supabase.from('users').insert({ name: process.env.ADMIN_NAME || 'Admin', email, password_hash, role: 'admin' }));
  console.log(`Admin account created for ${email}`);
}