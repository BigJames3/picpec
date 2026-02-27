import api from './client';
import { User } from '../types';

export const usersApi = {
  getMe: () => api.get<User>('/users/me').then((r) => r.data),
  updateMe: (data: { fullname?: string; phone?: string; country?: string; city?: string; whatsapp?: string }) =>
    api.patch<User>('/users/me', data).then((r) => r.data),
};
