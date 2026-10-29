import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

// Dev: http://localhost:5000  |  Production build: same origin
const API = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:5000' : '');

// Login only. Accounts are created by the admin, there is no sign-up.
export default function AuthForm() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      // withCredentials: true => session cookie is saved by the browser
      await axios.post(`${API}/auth/login`, form, { withCredentials: true });
      window.location.assign('/'); // full reload so the app picks up the new session
    } catch (err) {
      const msg = err.response
        ? err.response.data?.message || 'Login failed'
        : 'Cannot reach the server. Is the backend running on port 5000?';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Log in</h1>
          <p className="text-sm text-slate-500">Use the email and password you received from your admin.</p>
        </div>
        <input className="field" type="email" placeholder="Email" value={form.email} onChange={set('email')} required autoFocus />
        <input className="field" type="password" placeholder="Password" value={form.password} onChange={set('password')} required />
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Please wait…' : 'Log in'}</button>
        <p className="text-center text-xs text-slate-500">No account? Ask your admin to create one for you.</p>
      </form>
    </main>
  );
}