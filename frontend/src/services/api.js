import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          
          const { access_token, refresh_token } = response.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
          
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (username, password) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await api.post('/auth/token', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  },
  
  refreshToken: async (refreshToken) => {
    const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  getUsers: async () => {
    const response = await api.get('/auth/users');
    return response.data;
  },
  
  createUser: async (userData) => {
    const response = await api.post('/auth/users', userData);
    return response.data;
  },
  
  deleteUser: async (username) => {
    const response = await api.delete(`/auth/users/${username}`);
    return response.data;
  },
};

export const modelsService = {
  list: async () => {
    const response = await api.get('/models');
    return response.data;
  },
  
  get: async (name) => {
    const response = await api.get(`/models/${encodeURIComponent(name)}`);
    return response.data;
  },
  
  pull: async (name, stream = false) => {
    const response = await api.post('/models/pull', { name, stream });
    return response.data;
  },
  
  delete: async (name) => {
    const response = await api.delete(`/models/${encodeURIComponent(name)}`);
    return response.data;
  },
  
  create: async (name, modelfile, stream = false) => {
    const response = await api.post('/models/create', { name, modelfile, stream });
    return response.data;
  },
  
  copy: async (source, destination) => {
    const response = await api.post('/models/copy', { source, destination });
    return response.data;
  },
  
  tag: async (source, tag) => {
    const response = await api.post('/models/tag', { source, tag });
    return response.data;
  },
  
  push: async (name, stream = false) => {
    const response = await api.post('/models/push', { name, stream });
    return response.data;
  },
  
  running: async () => {
    const response = await api.get('/models/running/list');
    return response.data;
  },
};

export const runService = {
  generate: async (model, prompt, options = {}) => {
    const response = await api.post('/run', { model, prompt, ...options });
    return response.data;
  },
  
  generateStream: async (model, prompt, options = {}, onChunk) => {
    const response = await fetch(`${API_BASE_URL}/run/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
      body: JSON.stringify({ model, prompt, ...options }),
    });
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.startsWith('data:'));
      
      for (const line of lines) {
        const data = JSON.parse(line.slice(5));
        onChunk(data);
      }
    }
  },
  
  chat: async (model, messages, options = {}) => {
    const response = await api.post('/run/chat', { model, messages, ...options });
    return response.data;
  },
  
  chatStream: async (model, messages, options = {}, onChunk) => {
    const response = await fetch(`${API_BASE_URL}/run/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
      body: JSON.stringify({ model, messages, stream: true, ...options }),
    });
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.startsWith('data:'));
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line.slice(5));
          onChunk(data);
        } catch (e) {}
      }
    }
  },
};

export const embeddingsService = {
  generate: async (model, input, options = {}) => {
    const response = await api.post('/embeddings', { model, input, ...options });
    return response.data;
  },
  
  batch: async (model, texts) => {
    const response = await api.post('/embeddings/batch', texts, {
      params: { model },
    });
    return response.data;
  },
};

export const sessionsService = {
  list: async () => {
    const response = await api.get('/session');
    return response.data;
  },
  
  start: async (model, systemPrompt, metadata = {}) => {
    const response = await api.post('/session/start', {
      model,
      system_prompt: systemPrompt,
      metadata,
    });
    return response.data;
  },
  
  send: async (sessionId, content, stream = false, options = {}) => {
    const response = await api.post(`/session/${sessionId}/send`, {
      content,
      stream,
      options,
    });
    return response.data;
  },
  
  history: async (sessionId) => {
    const response = await api.get(`/session/${sessionId}/history`);
    return response.data;
  },
  
  delete: async (sessionId) => {
    const response = await api.delete(`/session/${sessionId}`);
    return response.data;
  },
  
  clear: async (sessionId) => {
    const response = await api.post(`/session/${sessionId}/clear`);
    return response.data;
  },
};

export const systemService = {
  health: async () => {
    const response = await api.get('/system/health');
    return response.data;
  },
  
  cpu: async () => {
    const response = await api.get('/system/cpu');
    return response.data;
  },
  
  memory: async () => {
    const response = await api.get('/system/memory');
    return response.data;
  },
  
  gpu: async () => {
    const response = await api.get('/system/gpu');
    return response.data;
  },
  
  disk: async () => {
    const response = await api.get('/system/disk');
    return response.data;
  },
  
  resources: async () => {
    const response = await api.get('/system/resources');
    return response.data;
  },
  
  ollamaProcesses: async () => {
    const response = await api.get('/system/ollama-processes');
    return response.data;
  },
  
  repair: async () => {
    const response = await api.post('/system/repair');
    return response.data;
  },
  
  rebuildIndex: async () => {
    const response = await api.post('/system/rebuild-index');
    return response.data;
  },
};

export const metricsService = {
  getAll: async () => {
    const response = await api.get('/metrics');
    return response.data;
  },
  
  getModel: async (name, period = 'all_time') => {
    const response = await api.get(`/metrics/model/${encodeURIComponent(name)}`, {
      params: { period },
    });
    return response.data;
  },
  
  summary: async () => {
    const response = await api.get('/metrics/summary');
    return response.data;
  },
  
  clearModel: async (name) => {
    const response = await api.delete(`/metrics/model/${encodeURIComponent(name)}`);
    return response.data;
  },
  
  clearAll: async () => {
    const response = await api.delete('/metrics');
    return response.data;
  },
};

export const logsService = {
  system: async (level = null, limit = 100, sinceHours = null) => {
    const response = await api.get('/logs/system', {
      params: { level, limit, since_hours: sinceHours },
    });
    return response.data;
  },
  
  model: async (name, level = null, limit = 100) => {
    const response = await api.get(`/logs/model/${encodeURIComponent(name)}`, {
      params: { level, limit },
    });
    return response.data;
  },
  
  modelsList: async () => {
    const response = await api.get('/logs/models');
    return response.data;
  },
  
  clearModel: async (name) => {
    const response = await api.delete(`/logs/model/${encodeURIComponent(name)}`);
    return response.data;
  },
  
  clearSystem: async () => {
    const response = await api.delete('/logs/system');
    return response.data;
  },
  
  clearAll: async () => {
    const response = await api.delete('/logs');
    return response.data;
  },
};

export const processService = {
  list: async (status = null, processType = null) => {
    const response = await api.get('/process', {
      params: { status, process_type: processType },
    });
    return response.data;
  },
  
  get: async (processId) => {
    const response = await api.get(`/process/${processId}`);
    return response.data;
  },
  
  cancel: async (processId) => {
    const response = await api.delete(`/process/${processId}/cancel`);
    return response.data;
  },
  
  cleanup: async (maxAgeHours = 24) => {
    const response = await api.post('/process/cleanup', null, {
      params: { max_age_hours: maxAgeHours },
    });
    return response.data;
  },
};

export const modelfileService = {
  validate: async (content) => {
    const response = await api.post('/modelfile/validate', { content });
    return response.data;
  },
  
  format: async (content) => {
    const response = await api.post('/modelfile/format', { content });
    return response.data;
  },
  
  preview: async (content) => {
    const response = await api.post('/modelfile/preview', { content });
    return response.data;
  },
};

export const backupService = {
  createModels: async (models, includeMetadata = true) => {
    const response = await api.post('/backup/models', {
      models,
      include_metadata: includeMetadata,
    });
    return response.data;
  },
  
  createSystem: async () => {
    const response = await api.post('/backup/system');
    return response.data;
  },
  
  history: async (backupType = null) => {
    const response = await api.get('/backup/history', {
      params: { backup_type: backupType },
    });
    return response.data;
  },
  
  get: async (backupId) => {
    const response = await api.get(`/backup/${backupId}`);
    return response.data;
  },
  
  download: async (backupId) => {
    const response = await api.get(`/backup/${backupId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
  
  delete: async (backupId) => {
    const response = await api.delete(`/backup/${backupId}`);
    return response.data;
  },
};

export const cacheService = {
  stats: async () => {
    const response = await api.get('/cache/stats');
    return response.data;
  },
  
  clear: async () => {
    const response = await api.delete('/cache/clear');
    return response.data;
  },
  
  clearModel: async (name) => {
    const response = await api.delete(`/cache/model/${encodeURIComponent(name)}`);
    return response.data;
  },
  
  cleanup: async () => {
    const response = await api.post('/cache/cleanup');
    return response.data;
  },
};

export default api;
