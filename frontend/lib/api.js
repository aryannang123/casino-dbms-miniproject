import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT from localStorage
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  profile: () => api.get('/auth/profile'),
};

// ── Games ─────────────────────────────────────────────────
export const gamesAPI = {
  list: () => api.get('/games'),
  get: (id) => api.get(`/games/${id}`),
  create: (data) => api.post('/games', data),
};

// ── Tables ────────────────────────────────────────────────
export const tablesAPI = {
  list: () => api.get('/tables'),
};

// ── Bets ──────────────────────────────────────────────────
export const betsAPI = {
  place: (data) => api.post('/bets', data),
  history: () => api.get('/bets'),
};

// ── Wallet ────────────────────────────────────────────────
export const walletAPI = {
  balance: () => api.get('/wallet'),
  deposit: (data) => api.post('/wallet/deposit', data),
  withdraw: (data) => api.post('/wallet/withdraw', data),
  transactions: () => api.get('/wallet/transactions'),
};

export default api;
