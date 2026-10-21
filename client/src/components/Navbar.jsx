import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <span className="text-lg font-extrabold tracking-tight">Team Task Manager</span>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-600 sm:block">{user?.name}</span>
          <button onClick={logout} className="btn-ghost">Log out</button>
        </div>
      </div>
    </header>
  );
}
