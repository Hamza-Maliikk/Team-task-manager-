import axios from 'axios';

// withCredentials sends the HTTP-only session cookie with every request
const http = axios.create({
  // Dev: backend on :5000. Production build: same origin (Express serves the React build).
  baseURL: import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:5000' : ''),
  withCredentials: true,
});

// Jab server kisi bhi (non-auth) request par 401 de, AuthContext user ko null kar deta hai
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

http.interceptors.response.use(
  (res) => res,
  (error) => {
    const isAuthCall = (error.config?.url || '').startsWith('/auth/');
    if (error.response?.status === 401 && !isAuthCall && onUnauthorized) onUnauthorized();
    return Promise.reject(error);
  }
);

export const errMsg = (e) =>
  e.response?.data?.message || e.response?.data?.error || e.message || 'Something went wrong';

export const authApi = {
  register: (d) => http.post('/auth/register', d).then((r) => r.data),
  login: (d) => http.post('/auth/login', d).then((r) => r.data),
  logout: () => http.post('/auth/logout'),
  // params._ browser cache ko todta hai, taake purana "logged in" jawab dobara na aaye
  me: () => http.get('/auth/me', { params: { _: Date.now() } }).then((r) => r.data),
};

export const teamsApi = {
  list: () => http.get('/teams').then((r) => r.data),
  get: (id) => http.get(`/teams/${id}`).then((r) => r.data),
  create: (d) => http.post('/teams', d).then((r) => r.data),
  update: (id, d) => http.put(`/teams/${id}`, d).then((r) => r.data),
  remove: (id) => http.delete(`/teams/${id}`),
  addMember: (id, email, role = 'member') => http.post(`/teams/${id}/members`, { email, role }).then((r) => r.data),
  removeMember: (id, userId) => http.delete(`/teams/${id}/members/${userId}`),
};

export const tasksApi = {
  list: (params) => http.get('/tasks', { params }).then((r) => r.data),
  create: (d) => http.post('/tasks', d).then((r) => r.data),
  update: (id, d) => http.put(`/tasks/${id}`, d).then((r) => r.data),
  remove: (id) => http.delete(`/tasks/${id}`),
};
export const usersApi = {
  list: () => http.get('/users').then((r) => r.data),
  create: (d) => http.post('/users', d).then((r) => r.data),
  resetPassword: (id) => http.post(`/users/${id}/reset-password`).then((r) => r.data),
};