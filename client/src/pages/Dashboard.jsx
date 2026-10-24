import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { teamsApi, tasksApi, errMsg } from '../api';
import { useAuth } from '../context/AuthContext.jsx';
import Navbar from '../components/Navbar.jsx';
import TeamPanel from '../components/TeamPanel.jsx';
import TaskFilters from '../components/TaskFilters.jsx';
import TaskCard from '../components/TaskCard.jsx';
import TaskModal from '../components/TaskModal.jsx';

const MANAGER_ROLES = ['admin', 'leader'];

// Guard: the dashboard (and its API calls) never run without a logged-in user,
// even if the route is not wrapped in ProtectedRoute.
export default function Dashboard() {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid h-screen place-items-center text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <DashboardContent user={user} />;
}

function DashboardContent({ user }) {
  const [teams, setTeams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [teamId, setTeamId] = useState('');
  const [filters, setFilters] = useState({ search: '', assigneeId: '', status: '' });
  const [members, setMembers] = useState([]);
  const [modal, setModal] = useState(null); // null | { task? }
  const [loading, setLoading] = useState(true);

  const isAdmin = user.role === 'admin';
  const roleOf = (id) => teams.find((t) => String(t.id) === String(id))?.role;
  const canManage = (id) => MANAGER_ROLES.includes(roleOf(id));
  const manageableTeams = teams.filter((t) => MANAGER_ROLES.includes(t.role));
  const roleLabel = isAdmin ? 'Admin' : manageableTeams.length ? 'Team Leader' : 'Team Member';

  const loadTeams = useCallback(() => teamsApi.list().then(setTeams).catch((e) => toast.error(errMsg(e))), []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    const params = Object.fromEntries(
      Object.entries({ teamId, ...filters }).filter(([, v]) => v !== '')
    );
    try { setTasks(await tasksApi.list(params)); } catch (e) { toast.error(errMsg(e)); } finally { setLoading(false); }
  }, [teamId, filters]);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  // Debounce so search does not fire a request on every keystroke
  useEffect(() => {
    const t = setTimeout(loadTasks, 250);
    return () => clearTimeout(t);
  }, [loadTasks]);

  // Assignee filter options follow the selected team
  useEffect(() => {
    setFilters((f) => ({ ...f, assigneeId: '' }));
    if (!teamId) return setMembers([]);
    teamsApi.get(teamId).then((t) => setMembers(t.members || [])).catch(() => setMembers([]));
  }, [teamId]);

  const remove = async (task) => {
    if (!confirm(`Delete "${task.title}"?`)) return;
    try { await tasksApi.remove(task.id); toast.success('Task deleted'); loadTasks(); } catch (e) { toast.error(errMsg(e)); }
  };

  const emptyText = teams.length === 0
    ? (isAdmin ? 'Create a team first, then add tasks.' : 'You are not in any team yet. Ask your admin or team leader to add you.')
    : 'No tasks match. Clear the filters or ask your team leader to add tasks.';

  return (
    <>
      <Navbar roleLabel={roleLabel} />
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[280px_1fr]">
        <TeamPanel teams={teams} selectedId={teamId} onSelect={setTeamId} onChanged={() => { loadTeams(); loadTasks(); }} currentUser={user} />

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-extrabold tracking-tight">
              {teamId ? teams.find((t) => String(t.id) === teamId)?.name : 'All tasks'}
            </h1>
            {manageableTeams.length > 0 ? (
              <button className="btn-primary" onClick={() => setModal({})}>New task</button>
            ) : (
              teams.length > 0 && <span className="text-sm text-slate-500">View only</span>
            )}
          </div>

          <TaskFilters filters={filters} setFilters={setFilters} members={members} />

          {loading ? (
            <p className="py-10 text-center text-slate-500">Loading tasks…</p>
          ) : tasks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-slate-500">{emptyText}</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {tasks.map((t) => (
                <TaskCard key={t.id} task={t} canEdit={canManage(t.team_id)} onEdit={(task) => setModal({ task })} onDelete={remove} />
              ))}
            </div>
          )}
        </section>
      </main>

      {modal && (
        <TaskModal task={modal.task} teams={manageableTeams} defaultTeamId={canManage(teamId) ? teamId : ''}
          onClose={() => setModal(null)} onSaved={() => { setModal(null); loadTasks(); }} />
      )}
    </>
  );
}