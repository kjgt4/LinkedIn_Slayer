import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token getter function - will be set by AuthContext
let tokenGetter = null;

export const setTokenGetter = (getter) => {
  tokenGetter = getter;
};

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    if (tokenGetter) {
      try {
        const token = await tokenGetter();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Failed to get auth token:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - could redirect to login
      console.error('Unauthorized request - please sign in');
    }
    return Promise.reject(error);
  }
);

// ============== Auth API ==============
export const authAPI = {
  getCurrentUser: () => api.get('/api/auth/me'),
  syncUser: (userData) => api.post('/api/auth/sync', userData),
};

// ============== Settings API ==============
export const settingsAPI = {
  get: () => api.get('/api/settings'),
  update: (data) => api.put('/api/settings', data),
};

// ============== Posts API ==============
export const postsAPI = {
  getAll: (status) => api.get('/api/posts', { params: { status } }),
  get: (id) => api.get(`/api/posts/${id}`),
  create: (data) => api.post('/api/posts', data),
  update: (id, data) => api.put(`/api/posts/${id}`, data),
  delete: (id) => api.delete(`/api/posts/${id}`),
  schedule: (id, date, slot, time) => 
    api.post(`/api/posts/${id}/schedule`, null, { 
      params: { scheduled_date: date, scheduled_slot: slot, scheduled_time: time } 
    }),
  publish: (id) => api.post(`/api/posts/${id}/publish`),
  unschedule: (id) => api.post(`/api/posts/${id}/unschedule`),
  updateEngagement: (id, metrics) => 
    api.post(`/api/posts/${id}/engagement-metrics`, null, { params: metrics }),
};

// ============== Calendar API ==============
export const calendarAPI = {
  getWeek: (weekOffset = 0) => api.get('/api/calendar/week', { params: { week_offset: weekOffset } }),
};

// ============== Knowledge Vault API ==============
export const knowledgeAPI = {
  getAll: (sourceType) => api.get('/api/knowledge', { params: { source_type: sourceType } }),
  get: (id) => api.get(`/api/knowledge/${id}`),
  create: (data) => api.post('/api/knowledge', data),
  update: (id, data) => api.put(`/api/knowledge/${id}`, data),
  delete: (id) => api.delete(`/api/knowledge/${id}`),
  uploadFile: (formData) => api.post('/api/knowledge/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  addFromUrl: (url, title, tags = []) => 
    api.post('/api/knowledge/url', null, { params: { url, title, tags } }),
  extractGems: (id) => api.post(`/api/knowledge/${id}/extract-gems`),
};

// ============== Inspiration URLs API ==============
export const inspirationAPI = {
  getAll: (favoritesOnly = false) => 
    api.get('/api/inspiration-urls', { params: { favorites_only: favoritesOnly } }),
  save: (url, title) => api.post('/api/inspiration-urls', null, { params: { url, title } }),
  toggleFavorite: (id) => api.put(`/api/inspiration-urls/${id}/favorite`),
  delete: (id) => api.delete(`/api/inspiration-urls/${id}`),
  saveToVault: (id) => api.post(`/api/inspiration-urls/${id}/to-vault`),
};

// ============== Voice Profiles API ==============
export const voiceProfilesAPI = {
  getAll: () => api.get('/api/voice-profiles'),
  getActive: () => api.get('/api/voice-profiles/active'),
  get: (id) => api.get(`/api/voice-profiles/${id}`),
  create: (data) => api.post('/api/voice-profiles', data),
  update: (id, data) => api.put(`/api/voice-profiles/${id}`, data),
  delete: (id) => api.delete(`/api/voice-profiles/${id}`),
  activate: (id) => api.post(`/api/voice-profiles/${id}/activate`),
  analyzeSamples: (samples) => api.post('/api/voice-profiles/analyze-samples', samples),
};

// ============== Analytics API ==============
export const analyticsAPI = {
  getPerformance: () => api.get('/api/analytics/performance'),
  getPillarRecommendation: () => api.get('/api/analytics/pillar-recommendation'),
};

// ============== Engagement API ==============
export const engagementAPI = {
  getActive: () => api.get('/api/engagement/active'),
};

// ============== AI API ==============
export const aiAPI = {
  generateContent: (data) => api.post('/api/ai/generate-content', data),
  suggestTopics: (context, inspirationUrl) => 
    api.post('/api/ai/suggest-topics', null, { 
      params: { context, inspiration_url: inspirationUrl } 
    }),
  improveHook: (hook) => api.post('/api/ai/improve-hook', { hook }),
  validateHook: (hook) => api.post('/api/validate-hook', { hook }),
};

// ============== LinkedIn API ==============
export const linkedinAPI = {
  getAuthUrl: () => api.get('/api/linkedin/auth'),
  disconnect: () => api.post('/api/linkedin/disconnect'),
  publish: (postId) => api.post(`/api/linkedin/publish/${postId}`),
};

// ============== Backward Compatible Direct Exports ==============
// These maintain compatibility with existing page imports

// Posts
export const getPosts = (status) => postsAPI.getAll(status);
export const getPost = (id) => postsAPI.get(id);
export const createPost = (data) => postsAPI.create(data);
export const updatePost = (id, data) => postsAPI.update(id, data);
export const deletePost = (id) => postsAPI.delete(id);
export const schedulePost = (id, date, slot, time) => postsAPI.schedule(id, date, slot, time);
export const publishPost = (id) => postsAPI.publish(id);
export const unschedulePost = (id) => postsAPI.unschedule(id);

// Settings
export const getSettings = () => settingsAPI.get();
export const updateSettings = (data) => settingsAPI.update(data);

// Calendar
export const getWeekCalendar = (weekOffset) => calendarAPI.getWeek(weekOffset);

// Knowledge
export const getKnowledgeItems = (sourceType) => knowledgeAPI.getAll(sourceType);
export const getKnowledgeItem = (id) => knowledgeAPI.get(id);
export const createKnowledgeItem = (data) => knowledgeAPI.create(data);
export const updateKnowledgeItem = (id, data) => knowledgeAPI.update(id, data);
export const deleteKnowledgeItem = (id) => knowledgeAPI.delete(id);
export const uploadKnowledgeFile = (formData) => knowledgeAPI.uploadFile(formData);
export const addKnowledgeFromUrl = (url, title, tags) => knowledgeAPI.addFromUrl(url, title, tags);
export const extractGems = (id) => knowledgeAPI.extractGems(id);

// Inspiration URLs
export const getInspirationUrls = (favoritesOnly) => inspirationAPI.getAll(favoritesOnly);
export const saveInspirationUrl = (url, title) => inspirationAPI.save(url, title);
export const toggleFavoriteUrl = (id) => inspirationAPI.toggleFavorite(id);
export const deleteInspirationUrl = (id) => inspirationAPI.delete(id);
export const saveInspirationToVault = (id) => inspirationAPI.saveToVault(id);

// Voice Profiles
export const getVoiceProfiles = () => voiceProfilesAPI.getAll();
export const getActiveVoiceProfile = () => voiceProfilesAPI.getActive();
export const getVoiceProfile = (id) => voiceProfilesAPI.get(id);
export const createVoiceProfile = (data) => voiceProfilesAPI.create(data);
export const updateVoiceProfile = (id, data) => voiceProfilesAPI.update(id, data);
export const deleteVoiceProfile = (id) => voiceProfilesAPI.delete(id);
export const activateVoiceProfile = (id) => voiceProfilesAPI.activate(id);
export const analyzeWritingSamples = (samples) => voiceProfilesAPI.analyzeSamples(samples);

// Analytics
export const getPerformanceMetrics = () => analyticsAPI.getPerformance();
export const getPillarRecommendation = () => analyticsAPI.getPillarRecommendation();

// Engagement
export const getActiveEngagement = () => engagementAPI.getActive();

// AI
export const generateContent = (data) => aiAPI.generateContent(data);
export const suggestTopics = (context, inspirationUrl) => aiAPI.suggestTopics(context, inspirationUrl);
export const improveHook = (hook) => aiAPI.improveHook(hook);
export const validateHook = (hook) => aiAPI.validateHook(hook);

// LinkedIn
export const getLinkedInAuthUrl = () => linkedinAPI.getAuthUrl();
export const disconnectLinkedIn = () => linkedinAPI.disconnect();
export const publishToLinkedIn = (postId) => linkedinAPI.publish(postId);

export default api;
