const STATUS = {
  todo: { label: 'To do', cls: 'bg-slate-100 text-slate-700' },
  in_progress: { label: 'In progress', cls: 'bg-amber-100 text-amber-800' },
  done: { label: 'Done', cls: 'bg-emerald-100 text-emerald-800' },
};
const PRIORITY = { low: 'border-l-slate-300', medium: 'border-l-amber-400', high: 'border-l-red-500' };

export default function TaskCard({ task, onEdit, onDelete }) {
  const s = STATUS[task.status] || STATUS.todo;
  return (
    <article className={`rounded-xl border border-slate-200 border-l-4 bg-white p-4 ${PRIORITY[task.priority] || ''}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold">{task.title}</h3>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>
      </div>
      {task.description && <p className="mt-1 text-sm text-slate-600">{task.description}</p>}
      <p className="mt-3 text-xs text-slate-500">
        {task.team_name && <>Team: {task.team_name} · </>}
        Assigned to: {task.assignee_name || 'Unassigned'}
        {task.due_date && <> · Due {new Date(task.due_date).toLocaleDateString()}</>}
      </p>
      <div className="mt-3 flex gap-2">
        <button onClick={() => onEdit(task)} className="btn-ghost !px-3 !py-1">Edit</button>
        <button onClick={() => onDelete(task)} className="btn-danger !px-3 !py-1">Delete</button>
      </div>
    </article>
  );
}
