import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../store/auth.store';

interface User {
  id: string;
  fullname: string;
  email: string;
  role: string;
  walletBalance?: number;
  createdAt?: string;
}

export default function UsersPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (isAdmin) {
      api
        .get(`/users?page=${page}&limit=${limit}`)
        .then((res) => {
          setUsers(res.data?.data ?? []);
          setTotal(res.data?.meta?.total ?? 0);
        })
        .catch(() => {
          setUsers([]);
          setTotal(0);
        })
        .finally(() => setLoading(false));
    } else {
      api
        .get('/users/me')
        .then((res) => setUsers(res.data ? [res.data] : []))
        .catch(() => setUsers([]))
        .finally(() => setLoading(false));
    }
  }, [isAdmin, page]);

  if (loading) return <div className="text-gray-500">Chargement...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-picpec-dark mb-6">
        Gestion des utilisateurs
      </h1>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-picpec-dark text-white">
            <tr>
              <th className="px-4 py-3 text-left">Nom</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Rôle</th>
              <th className="px-4 py-3 text-left">Solde</th>
              {isAdmin && <th className="px-4 py-3 text-left"></th>}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">{u.fullname}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-picpec-primary/20 text-picpec-primary rounded">
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.walletBalance != null
                    ? `${Number(u.walletBalance).toLocaleString()} FCFA`
                    : '-'}
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/users/${u.id}`)}
                      className="text-picpec-primary hover:underline text-sm"
                    >
                      Détail
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="p-8 text-center text-gray-500">
            Aucun utilisateur à afficher.
          </p>
        )}
        {isAdmin && total > 0 && (
          <div className="flex items-center justify-between mt-4 p-4 border-t">
            <span className="text-sm text-gray-500">
              Page {page} sur {Math.ceil(total / limit)}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                Précédent
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * limit >= total}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
