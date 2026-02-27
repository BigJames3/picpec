import api from './client';

export const tontinesApi = {
  getAll: (params?: { page?: number; limit?: number }) =>
    api.get('/tontines', { params }),
  getById: (id: string) => api.get(`/tontines/${id}`),
  create: (data: {
    title: string;
    contributionAmount: number;
    frequency: string;
    membersLimit: number;
    description?: string;
  }) => api.post('/tontines', data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/tontines/${id}/status`, { status }),
};
