import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import UsersModal from './UserModal.jsx';

export default function Navbar({ roleLabel }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUsers, setShowUsers] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      toast.error('Logout failed. Please try again.');
    }
  };

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <span className="text-lg font-extrabold tracking-tight">Team Task Manager</span>
        <div className="flex items-center gap-3">
          {roleLabel && (
            <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand-dark">{roleLabel}</span>
          )}
          <span className="hidden text-sm text-slate-600 sm:block">{user?.name}</span>
          {user?.role === 'admin' && <button onClick={() => setShowUsers(true)} className="btn-ghost">Users</button>}
          <button onClick={handleLogout} className="btn-ghost">Log out</button>
        </div>
      </div>
      {showUsers && <UsersModal onClose={() => setShowUsers(false)} />}
    </header>
  );
}