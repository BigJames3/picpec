import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';

interface User {
  id: string;
  fullname: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  role?: string;
  isActive?: boolean;
  walletBalance?: number;
  createdAt?: string;
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/users/${id}`)
      .then((res) => setUser(res.data))
      .catch((err) => setError(err.response?.data?.message ?? 'Erreur'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-picpec-primary" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error ?? 'Utilisateur non trouvé'}</p>
        <button
          onClick={() => navigate('/users')}
          className="px-4 py-2 bg-picpec-primary text-white rounded-lg"
        >
          Retour
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="mb-6 text-picpec-primary hover:underline"
      >
        ← Retour
      </button>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center gap-4">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-picpec-primary/20 flex items-center justify-center text-2xl font-bold text-picpec-primary">
                {user.fullname?.charAt(0) ?? '?'}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-picpec-dark">
                {user.fullname}
              </h1>
              {user.email && (
                <p className="text-gray-600">{user.email}</p>
              )}
              {user.role && (
                <span className="inline-block mt-2 px-2 py-1 bg-picpec-primary/20 text-picpec-primary rounded text-sm">
                  {user.role}
                </span>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm font-medium text-gray-500">Statut :</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.isActive !== false
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {user.isActive !== false ? 'Actif' : 'Suspendu'}
                </span>
              </div>
            </div>
          </div>
        </div>
        <dl className="p-6 grid gap-4 sm:grid-cols-2">
          {user.phone && (
            <>
              <dt className="text-gray-500">Téléphone</dt>
              <dd>{user.phone}</dd>
            </>
          )}
          {user.walletBalance != null && (
            <>
              <dt className="text-gray-500">Solde portefeuille</dt>
              <dd>{Number(user.walletBalance).toLocaleString()} FCFA</dd>
            </>
          )}
          {user.createdAt && (
            <>
              <dt className="text-gray-500">Inscrit le</dt>
              <dd>{new Date(user.createdAt).toLocaleDateString('fr-FR')}</dd>
            </>
          )}
        </dl>
      </div>
    </div>
  );
}
