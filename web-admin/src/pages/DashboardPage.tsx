import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { StatCard } from '../components/ui/StatCard';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import Badge from '../components/ui/Badge';
import { statsApi } from '../api/stats.api';
import { usersApi } from '../api/users.api';
import { transactionsApi } from '../api/transactions.api';
import { normalizePaginationResponse } from '../utils/pagination';

const mockStats = {
  totalUsers: 247,
  transactionsToday: 1450000,
  activeTontines: 23,
  activeProducts: 89,
  userGrowth: 12,
  transactionGrowth: 8,
  tontineGrowth: 3,
  productGrowth: -2,
};

const userGrowthData = [
  { month: 'Sep', users: 45 },
  { month: 'Oct', users: 78 },
  { month: 'Nov', users: 112 },
  { month: 'Déc', users: 145 },
  { month: 'Jan', users: 198 },
  { month: 'Fév', users: 247 },
];

const txByType = [
  { type: 'Dépôt', count: 523, amount: 15600000 },
  { type: 'Retrait', count: 312, amount: 8900000 },
  { type: 'Transfert', count: 445, amount: 12300000 },
  { type: 'Tontine', count: 234, amount: 7800000 },
  { type: 'Achat', count: 189, amount: 4500000 },
];

export default function DashboardPage() {
  const [stats, setStats] = useState(mockStats);
  const [recentUsers, setRecentUsers] = useState<
    Array<{
      id: string;
      fullname: string;
      email: string;
      role: string;
      avatarUrl?: string;
      createdAt?: string;
    }>
  >([]);
  const [recentTx, setRecentTx] = useState<
    Array<{
      id: string;
      reference?: string;
      type: string;
      amount: number;
      status: string;
      createdAt: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, usersRes, txRes] = await Promise.allSettled([
          statsApi.getDashboard(),
          usersApi.getAll({ page: 1, limit: 5 }),
          transactionsApi.getAll({ page: 1, limit: 5 }),
        ]);

        if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
          const d = statsRes.value.data;
          setStats({
            totalUsers: d.totalUsers ?? mockStats.totalUsers,
            transactionsToday:
              d.transactionsTodayAmount ?? d.transactionsToday ?? mockStats.transactionsToday,
            activeTontines: d.activeTontines ?? mockStats.activeTontines,
            activeProducts: d.activeProducts ?? mockStats.activeProducts,
            userGrowth: d.userGrowthPercent ?? d.userGrowth ?? mockStats.userGrowth,
            transactionGrowth:
              d.transactionGrowthPercent ?? d.transactionGrowth ?? mockStats.transactionGrowth,
            tontineGrowth:
              d.tontineGrowthPercent ?? d.tontineGrowth ?? mockStats.tontineGrowth,
            productGrowth:
              d.productGrowthPercent ?? d.productGrowth ?? mockStats.productGrowth,
          });
          if (d.recentUsers?.length) setRecentUsers(d.recentUsers);
          if (d.recentTransactions?.length) setRecentTx(d.recentTransactions);
        }

        if (usersRes.status === 'fulfilled' && usersRes.value?.data && !statsRes.value?.data?.recentUsers) {
          const norm = normalizePaginationResponse(usersRes.value.data);
          setRecentUsers(norm.data as typeof recentUsers);
        }

        if (txRes.status === 'fulfilled' && txRes.value?.data && !statsRes.value?.data?.recentTransactions) {
          const norm = normalizePaginationResponse(txRes.value.data);
          setRecentTx(norm.data as typeof recentTx);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Utilisateurs"
          value={stats.totalUsers}
          icon="👥"
          trend={{ value: stats.userGrowth, positive: stats.userGrowth >= 0 }}
        />
        <StatCard
          title="Transactions aujourd'hui"
          value={`${stats.transactionsToday.toLocaleString()} XOF`}
          icon="💰"
          trend={{
            value: stats.transactionGrowth,
            positive: stats.transactionGrowth >= 0,
          }}
        />
        <StatCard
          title="Tontines actives"
          value={stats.activeTontines}
          icon="🤝"
          trend={{ value: stats.tontineGrowth, positive: stats.tontineGrowth >= 0 }}
        />
        <StatCard
          title="Produits en vente"
          value={stats.activeProducts}
          icon="🛒"
          trend={{ value: stats.productGrowth, positive: stats.productGrowth >= 0 }}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Évolution des inscriptions
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="users"
                stroke="#E85D04"
                strokeWidth={2}
                dot={{ fill: '#E85D04' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Transactions par type
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={txByType} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" stroke="#6b7280" tickFormatter={(v: number) => `${(v / 1e6).toFixed(1)}M`} />
              <YAxis type="category" dataKey="type" stroke="#6b7280" width={55} />
              <Tooltip formatter={(v: unknown) => (typeof v === 'number' ? v.toLocaleString() : v)} />
              <Bar dataKey="amount" fill="#E85D04" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <h3 className="text-lg font-semibold text-gray-900 p-4 border-b">
            Derniers utilisateurs
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Utilisateur
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Rôle
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((u) => (
                  <tr key={u.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{u.fullname}</p>
                        <p className="text-sm text-gray-500">{u.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="primary">{u.role}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {recentUsers.length === 0 && (
            <p className="p-8 text-center text-gray-500 text-sm">
              Aucun utilisateur récent
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <h3 className="text-lg font-semibold text-gray-900 p-4 border-b">
            Dernières transactions
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Réf / Type
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Montant
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentTx.map((t) => (
                  <tr key={t.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {t.reference ?? t.type}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {Number(t.amount).toLocaleString()} XOF
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          t.status === 'COMPLETED'
                            ? 'success'
                            : t.status === 'FAILED'
                              ? 'danger'
                              : 'warning'
                        }
                      >
                        {t.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {recentTx.length === 0 && (
            <p className="p-8 text-center text-gray-500 text-sm">
              Aucune transaction récente
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
