import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Settings
export const getSettings = () => api.get('/settings');
export const updateSettings = (data) => api.put('/settings', data);

// Posts
export const getPosts = (status) => api.get('/posts', { params: { status } });
export const getPost = (id) => api.get(`/posts/${id}`);
export const createPost = (data) => api.post('/posts', data);
export const updatePost = (id, data) => api.put(`/posts/${id}`, data);
export const deletePost = (id) => api.delete(`/posts/${id}`);

// Calendar
export const getWeekCalendar = (weekOffset = 0) => api.get('/calendar/week', { params: { week_offset: weekOffset } });

// AI
export const generateContent = (data) => api.post('/ai/generate-content', data);
export const suggestTopics = (context) => api.post('/ai/suggest-topics', null, { params: { context } });
export const improveHook = (hook) => api.post('/ai/improve-hook', { hook });

// Hook Validation
export const validateHook = (hook) => api.post('/validate-hook', { hook });

export default api;
