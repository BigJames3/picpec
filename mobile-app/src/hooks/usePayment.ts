import { useState } from 'react';
import { Linking, Alert } from 'react-native';
import {
  paymentsApi,
  PaymentProvider,
  InitiatePaymentParams,
} from '../api/payments.api';

export type { PaymentProvider };

export function usePayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiatePay = async (params: InitiatePaymentParams) => {
    setLoading(true);
    setError(null);

    try {
      const response = await paymentsApi.initiate(params);
      const { checkoutUrl, status, transactionId } = response.data;

      if (checkoutUrl) {
        const canOpen = await Linking.canOpenURL(checkoutUrl);
        if (canOpen) {
          await Linking.openURL(checkoutUrl);
        } else {
          Alert.alert(
            'Erreur',
            "Impossible d'ouvrir l'application de paiement."
          );
        }
      }

      return { transactionId, status };
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Erreur de paiement';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { initiatePay, loading, error };
}
