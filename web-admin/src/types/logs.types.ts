/**
 * Types Logs / Audit Trail
 */

export type LogAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'APPROVE'
  | 'REJECT'
  | 'BLOCK'
  | 'UNBLOCK';

export type LogEntity =
  | 'user'
  | 'product'
  | 'tontine'
  | 'transaction'
  | 'post'
  | 'wallet'
  | 'auth';

export interface AuditLog {
  id: string;
  action: LogAction;
  entity: LogEntity;
  entityId?: string;
  userId?: string;
  userEmail?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

export interface LogsListParams {
  page?: number;
  limit?: number;
  action?: LogAction;
  entity?: LogEntity;
  userId?: string;
  search?: string;
  from?: string;
  to?: string;
}
