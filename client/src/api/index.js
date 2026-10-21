import axios from 'axios';

// withCredentials sends the HTTP-only session cookie with every request
const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true,
});

export const errMsg = (e) =>
  e.response?.data?.message || e.response?.data?.error || e.message || 'Something went wrong';

export const authApi = {
  register: (d) => http.post('/auth/register', d).then((r) => r.data),
  login: (d) => http.post('/auth/login', d).then((r) => r.data),
  logout: () => http.post('/auth/logout'),
  me: () => http.get('/auth/me').then((r) => r.data),
};

export const teamsApi = {
  list: () => http.get('/teams').then((r) => r.data),
  get: (id) => http.get(`/teams/${id}`).then((r) => r.data),
  create: (d) => http.post('/teams', d).then((r) => r.data),
  update: (id, d) => http.put(`/teams/${id}`, d).then((r) => r.data),
  remove: (id) => http.delete(`/teams/${id}`),
  addMember: (id, email) => http.post(`/teams/${id}/members`, { email }).then((r) => r.data),
  removeMember: (id, userId) => http.delete(`/teams/${id}/members/${userId}`),
};

export const tasksApi = {
  list: (params) => http.get('/tasks', { params }).then((r) => r.data),
  create: (d) => http.post('/tasks', d).then((r) => r.data),
  update: (id, d) => http.put(`/tasks/${id}`, d).then((r) => r.data),
  remove: (id) => http.delete(`/tasks/${id}`),
};
