import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { usersApi, errMsg } from '../api';
import Modal from './Modal.jsx';

export default function UsersModal({ onClose }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '' });
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState(null); // shown only when the email could not be sent

  const load = () => usersApi.list().then(setUsers).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); }, []);

  const handleResult = (result) => {
    if (result.emailSent) {
      toast.success(`Login details emailed to ${result.user.email}`);
      setManual(null);
    } else {
      toast('Email could not be sent. Share the password below manually.', { icon: '⚠️' });
      setManual({ email: result.user.email, password: result.tempPassword });
    }
  };

  const addUser = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      handleResult(await usersApi.create(form));
      setForm({ name: '', email: '' });
      load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const reset = async (u) => {
    if (!confirm(`Generate a new password for ${u.email} and send it?`)) return;
    try { handleResult(await usersApi.resetPassword(u.id)); } catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <Modal title="Users" onClose={onClose}>
      <form onSubmit={addUser} className="mb-4 space-y-2">
        <p className="text-sm text-slate-600">Add a user. A password is generated and emailed to them.</p>
        <input className="field" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
        <input className="field" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Create user & send password'}</button>
      </form>

      {manual && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="font-semibold text-amber-900">Email not sent. Give these details to the user (shown only once):</p>
          <p className="mt-1 select-all break-all">Email: {manual.email}</p>
          <p className="select-all break-all">Password: <code>{manual.password}</code></p>
        </div>
      )}

      <h3 className="mb-2 text-sm font-semibold">All users</h3>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {users.map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
            <span className="min-w-0">
              <span className="block truncate">{u.name} {u.role === 'admin' && <span className="ml-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-dark">Admin</span>}</span>
              <span className="block truncate text-slate-500">{u.email}</span>
            </span>
            <button className="btn-ghost shrink-0 !px-2 !py-1" onClick={() => reset(u)}>Reset password</button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}