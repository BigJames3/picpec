import api from './client';
import { User } from '../types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ accessToken: string; refreshToken: string; user: User }>(
      '/auth/login',
      { email, password }
    ),
  register: (data: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
  }) =>
    api.post<{ accessToken: string; refreshToken: string; user: User }>(
      '/auth/register',
      { fullName: data.fullName, email: data.email, phone: data.phone, password: data.password }
    ),
  logout: () => api.post('/auth/logout'),
  me: () => api.get<User>('/auth/me'),
};
