/**
 * API Logs - Audit Trail
 * Utilise le client Axios configuré (Bearer + refresh)
 */
import api from './client';
import type { AuditLog, LogsListParams } from '@/types/logs.types';

interface LogsResponse {
  data: AuditLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const logsApi = {
  /** Liste paginée des logs avec filtres */
  getLogs: (params?: LogsListParams) =>
    api.get<LogsResponse>('/logs', { params }).then((r) => r.data),

  /** Détail d'un log (pour le drawer JSON) */
  getById: (id: string) =>
    api.get<{ data: AuditLog }>(`/logs/${id}`).then((r) => r.data),
};
