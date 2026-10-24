import { getRole } from './helpers.js';

// Effective access for a user on a team: 'admin' | 'leader' | 'member' | null
export const getAccess = async (teamId, user) => (user.role === 'admin' ? 'admin' : getRole(teamId, user.id));

// Admins and team leaders can manage; members are view-only
export const canManage = (access) => access === 'admin' || access === 'leader';