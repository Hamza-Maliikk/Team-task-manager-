import { useState } from 'react';
import toast from 'react-hot-toast';
import { teamsApi, errMsg } from '../api';
import Modal from './Modal.jsx';

export default function TeamPanel({ teams, selectedId, onSelect, onChanged, currentUser }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [detail, setDetail] = useState(null);

  const selected = teams.find((t) => String(t.id) === String(selectedId));

  const createTeam = async (e) => {
    e.preventDefault();
    try {
      await teamsApi.create({ name });
      toast.success('Team created');
      setName(''); setCreating(false); onChanged();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const openManage = async () => {
    try { setDetail(await teamsApi.get(selected.id)); } catch (err) { toast.error(errMsg(err)); }
  };

  const addMember = async (e) => {
    e.preventDefault();
    try {
      await teamsApi.addMember(detail.id, email);
      toast.success('Member added');
      setEmail(''); setDetail(await teamsApi.get(detail.id)); onChanged();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const removeMember = async (userId) => {
    try {
      await teamsApi.removeMember(detail.id, userId);
      setDetail(await teamsApi.get(detail.id)); onChanged();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const deleteTeam = async () => {
    if (!confirm(`Delete "${detail.name}" and all its tasks?`)) return;
    try {
      await teamsApi.remove(detail.id);
      toast.success('Team deleted'); setDetail(null); onSelect(''); onChanged();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const isOwner = detail && String(detail.owner_id) === String(currentUser?.id);

  return (
    <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold">Teams</h2>
        <button onClick={() => setCreating(true)} className="btn-primary !px-3 !py-1.5">New team</button>
      </div>

      <ul className="space-y-1">
        <li>
          <button onClick={() => onSelect('')}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm ${!selectedId ? 'bg-brand-soft font-semibold text-brand-dark' : 'hover:bg-slate-50'}`}>
            All teams
          </button>
        </li>
        {teams.map((t) => (
          <li key={t.id}>
            <button onClick={() => onSelect(String(t.id))}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${String(selectedId) === String(t.id) ? 'bg-brand-soft font-semibold text-brand-dark' : 'hover:bg-slate-50'}`}>
              {t.name}
            </button>
          </li>
        ))}
      </ul>
      {teams.length === 0 && <p className="mt-3 text-sm text-slate-500">No teams yet. Create one to start adding tasks.</p>}
      {selected && <button onClick={openManage} className="btn-ghost mt-3 w-full">Manage {selected.name}</button>}

      {creating && (
        <Modal title="Create team" onClose={() => setCreating(false)}>
          <form onSubmit={createTeam} className="space-y-4">
            <input className="field" placeholder="Team name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoFocus />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
              <button className="btn-primary">Create team</button>
            </div>
          </form>
        </Modal>
      )}

      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)}>
          <h3 className="mb-2 text-sm font-semibold">Members</h3>
          <ul className="mb-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {(detail.members || []).map((m) => (
              <li key={m.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{m.name} <span className="text-slate-500">({m.email})</span></span>
                {isOwner && String(m.id) !== String(currentUser.id) && (
                  <button className="btn-danger !px-2 !py-1" onClick={() => removeMember(m.id)}>Remove</button>
                )}
              </li>
            ))}
          </ul>
          <form onSubmit={addMember} className="flex gap-2">
            <input type="email" className="field" placeholder="Member email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <button className="btn-primary shrink-0">Add member</button>
          </form>
          {isOwner && <button onClick={deleteTeam} className="btn-danger mt-5">Delete team</button>}
        </Modal>
      )}
    </aside>
  );
}
