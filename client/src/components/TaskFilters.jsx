export default function TaskFilters({ filters, setFilters, members }) {
  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <input className="field" type="search" placeholder="Search tasks" value={filters.search} onChange={set('search')} />
      <select className="field" value={filters.assigneeId} onChange={set('assigneeId')}>
        <option value="">Any assignee</option>
        {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      <select className="field" value={filters.status} onChange={set('status')}>
        <option value="">Any status</option>
        <option value="todo">To do</option>
        <option value="in_progress">In progress</option>
        <option value="done">Done</option>
      </select>
    </div>
  );
}
