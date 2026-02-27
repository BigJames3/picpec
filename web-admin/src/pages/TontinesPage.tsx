import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import { normalizePaginationResponse } from '../utils/pagination';

interface Tontine {
  id: string;
  title: string;
  description?: string;
  contributionAmount: number;
  frequency: string;
  membersLimit: number;
  status: string;
}

const DEFAULT_LIMIT = 10;

export default function TontinesPage() {
  const [pagination, setPagination] = useState<ReturnType<typeof normalizePaginationResponse<Tontine>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{
    title: string;
    description: string;
    contributionAmount: number;
    frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
    membersLimit: number;
  }>({
    title: '',
    description: '',
    contributionAmount: 5000,
    frequency: 'MONTHLY',
    membersLimit: 10,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTontines = useCallback((pageOverride?: number) => {
    const targetPage = pageOverride ?? page;
    setLoading(true);
    api
      .get('/tontines', { params: { page: targetPage, limit: DEFAULT_LIMIT } })
      .then((res) => setPagination(normalizePaginationResponse<Tontine>(res.data)))
      .catch(() => setPagination(normalizePaginationResponse(null)))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    queueMicrotask(() => loadTontines());
  }, [loadTontines]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    api
      .post('/tontines', form)
      .then(() => {
        setShowForm(false);
        setForm({ title: '', description: '', contributionAmount: 5000, frequency: 'MONTHLY' as const, membersLimit: 10 });
        setPage(1);
        loadTontines(1);
      })
      .catch((err) => setError(err.response?.data?.message ?? 'Erreur'))
      .finally(() => setSubmitting(false));
  };

  const { data: tontines, totalPages } = pagination ?? {
    data: [] as Tontine[],
    total: 0,
    totalPages: 0,
    page: 1,
    limit: DEFAULT_LIMIT,
  };

  if (loading && !pagination) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-picpec-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-picpec-dark">
          Tontines
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-picpec-primary text-white rounded-lg hover:opacity-90"
        >
          {showForm ? 'Annuler' : 'Créer une tontine'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 p-6 bg-white rounded-xl shadow space-y-4"
        >
          <h2 className="text-lg font-semibold">Nouvelle tontine</h2>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titre *
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Ex: Tontine Mensuelle Famille"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Montant par contribution (FCFA) *
            </label>
            <input
              type="number"
              required
              min={100}
              value={form.contributionAmount}
              onChange={(e) =>
                setForm({ ...form, contributionAmount: Number(e.target.value) })
              }
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fréquence *
            </label>
            <select
              value={form.frequency}
              onChange={(e) =>
                setForm({ ...form, frequency: e.target.value as typeof form.frequency })
              }
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="DAILY">Quotidienne</option>
              <option value="WEEKLY">Hebdomadaire</option>
              <option value="BIWEEKLY">Bimensuelle</option>
              <option value="MONTHLY">Mensuelle</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de membres max *
            </label>
            <input
              type="number"
              required
              min={2}
              value={form.membersLimit}
              onChange={(e) =>
                setForm({ ...form, membersLimit: Number(e.target.value) })
              }
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-picpec-primary text-white rounded-lg disabled:opacity-50"
          >
            {submitting ? 'Création...' : 'Créer'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-picpec-dark text-white">
            <tr>
              <th className="px-4 py-3 text-left">Titre</th>
              <th className="px-4 py-3 text-left">Montant</th>
              <th className="px-4 py-3 text-left">Fréquence</th>
              <th className="px-4 py-3 text-left">Membres</th>
              <th className="px-4 py-3 text-left">Statut</th>
            </tr>
          </thead>
          <tbody>
            {tontines.map((t) => (
              <tr key={t.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">{t.title}</td>
                <td className="px-4 py-3">
                  {Number(t.contributionAmount).toLocaleString()} FCFA
                </td>
                <td className="px-4 py-3">{t.frequency}</td>
                <td className="px-4 py-3">{t.membersLimit}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-picpec-primary/20 text-picpec-primary rounded text-sm">
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tontines.length === 0 && (
          <p className="p-8 text-center text-gray-500">
            Aucune tontine. Créez-en une pour commencer.
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
