import { useEffect, useState } from 'react';
import api from '../api/client';
import { normalizePaginationResponse } from '../utils/pagination';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  status: string;
  createdAt: string;
}

export default function TransactionsPage() {
  const [data, setData] = useState<ReturnType<typeof normalizePaginationResponse<Transaction>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    api
      .get('/wallet/transactions', { params: { page, limit } })
      .then((res) => setData(normalizePaginationResponse<Transaction>(res.data)))
      .catch(() => setData(normalizePaginationResponse(null)))
      .finally(() => setLoading(false));
  }, [page, limit]);

  if (loading && !data) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-picpec-primary" />
      </div>
    );
  }

  const { data: transactions, totalPages } = data ?? {
    data: [] as Transaction[],
    total: 0,
    totalPages: 0,
    page: 1,
    limit: 10,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-picpec-dark mb-6">
        Mes transactions
      </h1>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-picpec-dark text-white">
            <tr>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Montant</th>
              <th className="px-4 py-3 text-left">Statut</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">
                  {new Date(t.createdAt).toLocaleString('fr-FR')}
                </td>
                <td className="px-4 py-3">{t.type}</td>
                <td className="px-4 py-3">
                  {Number(t.amount).toLocaleString()} FCFA
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      t.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-800'
                        : t.status === 'FAILED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {transactions.length === 0 && (
          <p className="p-8 text-center text-gray-500">
            Aucune transaction
          </p>
        )}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 p-4 border-t">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-lg bg-gray-200 disabled:opacity-50"
            >
              Précédent
            </button>
            <span className="px-4 py-2">
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-4 py-2 rounded-lg bg-gray-200 disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
