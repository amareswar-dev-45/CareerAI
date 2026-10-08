import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

API.interceptors.request.use(config => {
  // If calling college admin endpoints, use college_admin_token
  if (config.url && config.url.includes('/college')) {
    const adminToken = localStorage.getItem('college_admin_token');
    if (adminToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    }
  } else {
    const token = localStorage.getItem('career_ai_token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, error => Promise.reject(error));

export default API;
