import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { tasksApi, teamsApi, errMsg } from '../api';
import Modal from './Modal.jsx';

const empty = { title: '', description: '', status: 'todo', priority: 'medium', due_date: '', team_id: '', assignee_id: '' };

export default function TaskModal({ task, teams, defaultTeamId, onClose, onSaved }) {
  const editing = Boolean(task);
  const [form, setForm] = useState(
    editing
      ? { ...empty, ...task, due_date: task.due_date ? task.due_date.slice(0, 10) : '', assignee_id: task.assignee_id ?? '' }
      : { ...empty, team_id: defaultTeamId || teams[0]?.id || '' }
  );
  const [members, setMembers] = useState([]);
  const [saving, setSaving] = useState(false);

  // Load members of the chosen team for the assignee dropdown
  useEffect(() => {
    if (!form.team_id) return setMembers([]);
    teamsApi.get(form.team_id).then((t) => setMembers(t.members || [])).catch(() => setMembers([]));
  }, [form.team_id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description,
      status: form.status,
      priority: form.priority,
      due_date: form.due_date || null,
      team_id: Number(form.team_id),
      assignee_id: form.assignee_id ? Number(form.assignee_id) : null,
    };
    try {
      editing ? await tasksApi.update(task.id, payload) : await tasksApi.create(payload);
      toast.success(editing ? 'Task updated' : 'Task created');
      onSaved();
    } catch (err) { toast.error(errMsg(err)); } finally { setSaving(false); }
  };

  return (
    <Modal title={editing ? 'Edit task' : 'Create task'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input className="field" placeholder="Task title" value={form.title} onChange={set('title')} required autoFocus />
        <textarea className="field" rows={3} placeholder="Description (optional)" value={form.description || ''} onChange={set('description')} />
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">Team
            <select className="field mt-1" value={form.team_id} onChange={(e) => setForm({ ...form, team_id: e.target.value, assignee_id: '' })} required disabled={editing}>
              <option value="" disabled>Select team</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Assignee
            <select className="field mt-1" value={form.assignee_id} onChange={set('assignee_id')}>
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Status
            <select className="field mt-1" value={form.status} onChange={set('status')}>
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </label>
          <label className="text-sm">Priority
            <select className="field mt-1" value={form.priority} onChange={set('priority')}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>
        <label className="block text-sm">Due date
          <input type="date" className="field mt-1" value={form.due_date} onChange={set('due_date')} />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create task'}</button>
        </div>
      </form>
    </Modal>
  );
}
