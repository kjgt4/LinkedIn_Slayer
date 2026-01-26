import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 second timeout for AI calls
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

// Post Scheduling
export const schedulePost = (id, date, slot, time) => 
  api.post(`/posts/${id}/schedule`, null, { params: { scheduled_date: date, scheduled_slot: slot, scheduled_time: time } });
export const unschedulePost = (id) => api.post(`/posts/${id}/unschedule`);
export const publishPost = (id) => api.post(`/posts/${id}/publish`);
export const updateEngagementMetrics = (id, metrics) => 
  api.post(`/posts/${id}/engagement-metrics`, null, { params: metrics });

// Engagement Timer
export const getActiveEngagement = () => api.get('/engagement/active');

// Calendar
export const getWeekCalendar = (weekOffset = 0) => api.get('/calendar/week', { params: { week_offset: weekOffset } });

// AI
export const generateContent = (data) => api.post('/ai/generate-content', data);
export const suggestTopics = (context, inspirationUrl) => api.post('/ai/suggest-topics', null, { 
  params: { context, inspiration_url: inspirationUrl } 
});
export const improveHook = (hook) => api.post('/ai/improve-hook', { hook });

// Hook Validation
export const validateHook = (hook) => api.post('/validate-hook', { hook });

// Knowledge Vault
export const getKnowledgeItems = (sourceType) => api.get('/knowledge', { params: { source_type: sourceType } });
export const getKnowledgeItem = (id) => api.get(`/knowledge/${id}`);
export const createKnowledgeItem = (data) => api.post('/knowledge', data);
export const updateKnowledgeItem = (id, data) => api.put(`/knowledge/${id}`, data);
export const deleteKnowledgeItem = (id) => api.delete(`/knowledge/${id}`);
export const uploadKnowledgeFile = (formData) => api.post('/knowledge/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const addKnowledgeFromUrl = (url, title, tags) => 
  api.post('/knowledge/url', null, { params: { url, title, tags: tags.join(',') } });
export const extractGems = (id) => api.post(`/knowledge/${id}/extract-gems`);

// Analytics
export const getPerformanceMetrics = () => api.get('/analytics/performance');
export const getPillarRecommendation = () => api.get('/analytics/pillar-recommendation');

// LinkedIn Integration
export const getLinkedInAuthUrl = () => api.get('/linkedin/auth');
export const disconnectLinkedIn = () => api.post('/linkedin/disconnect');
export const publishToLinkedIn = (postId) => api.post(`/linkedin/publish/${postId}`);

// Voice Profiles
export const getVoiceProfiles = () => api.get('/voice-profiles');
export const getActiveVoiceProfile = () => api.get('/voice-profiles/active');
export const getVoiceProfile = (id) => api.get(`/voice-profiles/${id}`);
export const createVoiceProfile = (data) => api.post('/voice-profiles', data);
export const updateVoiceProfile = (id, data) => api.put(`/voice-profiles/${id}`, data);
export const deleteVoiceProfile = (id) => api.delete(`/voice-profiles/${id}`);
export const activateVoiceProfile = (id) => api.post(`/voice-profiles/${id}/activate`);
export const analyzeWritingSamples = (samples) => api.post('/voice-profiles/analyze-samples', samples);

export default api;
