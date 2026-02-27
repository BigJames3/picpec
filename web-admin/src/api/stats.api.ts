import api from './client';

export const statsApi = {
  getDashboard: () => api.get('/stats/dashboard'),
};
