export const isLocal = () => process.env.APP_ENV === 'local';
export const isSandbox = () => process.env.NODE_ENV !== 'production';
export const isProduction = () => process.env.NODE_ENV === 'production';

export const mockConfig = {
  paymentDelayMs: parseInt(process.env.MOCK_PAYMENT_DELAY_MS || '3000', 10),
  successRate: parseInt(process.env.MOCK_PAYMENT_SUCCESS_RATE || '90', 10),
  transferDelayMs: parseInt(process.env.MOCK_TRANSFER_DELAY_MS || '2000', 10),
};
