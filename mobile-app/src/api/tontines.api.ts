import api from './client';

export interface CreateTontineDto {
  titre: string;
  description: string;
  montant: number;
  nombreMembres: number;
  frequence: 'JOURNALIER' | 'HEBDOMADAIRE' | 'MENSUEL' | 'TRIMESTRIEL';
  dateDebut: string;
  tauxPenalite?: number;
}

export const tontinesApi = {
  create: (dto: CreateTontineDto) =>
    api.post('/tontines', dto).then((r) => r.data),

  join: (token: string) =>
    api.post(`/tontines/join/${token}`).then((r) => r.data),

  validateToken: (token: string) =>
    api.get(`/tontines/invite/${token}`).then((r) => r.data),

  getByInviteToken: (token: string) =>
    api.get(`/tontines/invite/${token}`).then((r) => r.data),

  joinByToken: (token: string) =>
    api.post(`/tontines/join/${token}`).then((r) => r.data),

  getInvitationLink: (id: string) =>
    api.get(`/tontines/${id}/invitation-link`).then((r) => r.data.link),

  getActive: () => api.get('/tontines/me/active').then((r) => r.data),

  getPending: () => api.get('/tontines/me/pending').then((r) => r.data),

  getHistory: () => api.get('/tontines/me/history').then((r) => r.data),

  getDetail: (id: string) => api.get(`/tontines/${id}`).then((r) => r.data),

  getPendingCotisation: (id: string) =>
    api.get(`/tontines/${id}/pending-cotisation`).then((r) => r.data),

  pay: (tontineId: string, dto: { cotisationId: string; transactionId: string; provider: string }) =>
    api.post(`/tontines/${tontineId}/pay`, dto).then((r) => r.data),

  payCotisationWallet: (tontineId: string) =>
    api.post(`/tontines/${tontineId}/pay-wallet`).then((r) => r.data),

  cancel: (id: string) => api.delete(`/tontines/${id}`).then((r) => r.data),

  getAll: (params?: { page?: number; limit?: number }) =>
    api.get('/tontines', { params }).then((r) => r.data),
};
