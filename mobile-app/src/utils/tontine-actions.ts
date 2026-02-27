export type TontineAction = 'JOIN' | 'SHARE' | 'PAY' | 'NONE';

export function getTontineAction(
  tontine: {
    id: string;
    status: string;
    creatorId: string;
    invitationActive?: boolean;
  },
  userId: string,
  userRole: 'CREATOR' | 'MEMBER' | null
): TontineAction {
  if (userRole === null) return 'JOIN';
  if (userRole === 'CREATOR' && tontine.status === 'PENDING') return 'SHARE';
  if (tontine.status === 'ACTIVE') return 'PAY';
  return 'NONE';
}
