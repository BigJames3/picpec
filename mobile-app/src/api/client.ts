import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '../store/auth.store';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.24:3000';

const api = axios.create({
  baseURL: `${API_URL}/api`, // ← /api pas /docs
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;

  // Ne pas envoyer si pas de token sur routes protégées
  const protectedRoutes = ['/notifications'];
  const isProtected = protectedRoutes.some((r) =>
    config.url?.includes(r),
  );
  if (isProtected && !token) {
    const controller = new AbortController();
    controller.abort();
    config.signal = controller.signal;
    return config;
  }

  if (token) config.headers.Authorization = `Bearer ${token}`;
  // FormData : ne pas forcer application/json (Multer a besoin de multipart/form-data)
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  console.log(
    `[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
  );
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    console.log('[API Response]', response.status, response.config?.url);
    return response;
  },
  async (error: AxiosError) => {
    console.error('[API Error]', {
      url: error.config?.url,
      status: error.response?.status,
      message: (error.response?.data as { message?: string })?.message,
      code: error.code,
    });
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken, updateTokens, logout } = useAuthStore.getState();

      if (!refreshToken) {
        await logout();
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post<{
          accessToken: string;
          refreshToken: string;
        }>(`${API_URL}/api/auth/refresh`, { refreshToken });
        await updateTokens(data.accessToken, data.refreshToken);
        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
