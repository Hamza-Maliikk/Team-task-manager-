import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

// Dev: http://localhost:5000  |  Production build: same origin
const API =  'http://localhost:5000';

export default function AuthForm({ mode }) {
  const isRegister = mode === 'register';
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const url = isRegister ? `${API}/auth/register` : `${API}/auth/login`;
      const body = isRegister
        ? { name: form.name, email: form.email, password: form.password }
        : { email: form.email, password: form.password };

      // withCredentials: true => session cookie browser mein save hoti hai
      await axios.post(url, body, { withCredentials: true });

      toast.success(isRegister ? 'Account created' : 'Logged in');
      // Full reload taake app naya session (cookie) utha le
      window.location.assign('/');
    } catch (err) {
      const msg = err.response
        ? err.response.data?.message || 'Request failed'
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
          <h1 className="text-2xl font-extrabold tracking-tight">{isRegister ? 'Create your account' : 'Log in'}</h1>
          <p className="text-sm text-slate-500">{isRegister ? 'Start organising work with your team.' : 'Pick up where your team left off.'}</p>
        </div>

        {isRegister && (
          <input className="field" placeholder="Full name" value={form.name} onChange={set('name')} required minLength={2} />
        )}
        <input className="field" type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
        <input className="field" type="password" placeholder="Password (min 8 characters)" value={form.password} onChange={set('password')} required minLength={8} />

        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
        </button>

        <p className="text-center text-sm text-slate-600">
          {isRegister ? (
            <>Already registered? <Link className="font-semibold text-brand" to="/login">Log in</Link></>
          ) : (
            <>New here? <br/> <Link className="font-semibold text-brand" to="/register">Create an account</Link></>
          )}
          
        </p>
      </form>
    </main>
  );
}