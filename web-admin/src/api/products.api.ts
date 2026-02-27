import api from './client';

export const productsApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) => api.get('/products', { params }),
  getAllAdmin: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) => api.get('/products/admin', { params }),
  getById: (id: string) => api.get(`/products/${id}`),
  updateStatus: (id: string, status: string) =>
    api.patch(`/products/${id}`, { status }),
  approve: (id: string) => api.patch(`/products/${id}/approve`),
  reject: (id: string) => api.patch(`/products/${id}/reject`),
  delete: (id: string) => api.delete(`/products/${id}`),
};
