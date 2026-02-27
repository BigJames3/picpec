import { useEffect, useState } from 'react';
import Badge from '../components/ui/Badge';

interface LogEntry {
  id: number;
  timestamp: Date;
  level: string;
  module: string;
  message: string;
  context?: Record<string, unknown>;
}

const mockLogs: LogEntry[] = [
  {
    id: 1,
    timestamp: new Date(),
    level: 'INFO',
    module: 'Auth',
    message: 'User login successful',
    context: { userId: 'xxx', email: 'user@picpec.com' },
  },
  {
    id: 2,
    timestamp: new Date(),
    level: 'INFO',
    module: 'Wallet',
    message: 'Transfer completed',
    context: { amount: 50000, ref: 'TRF-xxx' },
  },
  {
    id: 3,
    timestamp: new Date(),
    level: 'WARN',
    module: 'Tontines',
    message: 'Payment due alert sent',
    context: { tontineId: 'xxx', membersNotified: 3 },
  },
  {
    id: 4,
    timestamp: new Date(),
    level: 'ERROR',
    module: 'Products',
    message: 'Purchase failed - insufficient stock',
    context: { productId: 'xxx', requested: 2, available: 1 },
  },
  {
    id: 5,
    timestamp: new Date(),
    level: 'INFO',
    module: 'Notifications',
    message: 'Notification created',
    context: { type: 'WALLET_CREDIT', userId: 'xxx' },
  },
  {
    id: 6,
    timestamp: new Date(),
    level: 'INFO',
    module: 'Auth',
    message: 'User logout',
    context: { userId: 'xxx' },
  },
  {
    id: 7,
    timestamp: new Date(),
    level: 'WARN',
    module: 'Wallet',
    message: 'Daily limit approaching',
    context: { userId: 'xxx', used: 1800000, limit: 2000000 },
  },
  {
    id: 8,
    timestamp: new Date(),
    level: 'INFO',
    module: 'Tontines',
    message: 'Tontine cycle completed',
    context: { tontineId: 'xxx', beneficiaryId: 'yyy' },
  },
  {
    id: 9,
    timestamp: new Date(),
    level: 'ERROR',
    module: 'Auth',
    message: 'Invalid refresh token',
    context: { userId: 'xxx' },
  },
  {
    id: 10,
    timestamp: new Date(),
    level: 'INFO',
    module: 'Products',
    message: 'Product created',
    context: { productId: 'xxx', sellerId: 'yyy' },
  },
];

function generateMockLogs(): LogEntry[] {
  return mockLogs.map((log, i) => ({
    ...log,
    id: Date.now() + i,
    timestamp: new Date(),
  }));
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>(mockLogs);
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      setLogs(generateMockLogs());
    }, 30000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  const filtered = logs.filter((log) => {
    if (levelFilter !== 'ALL' && log.level !== levelFilter) return false;
    if (moduleFilter !== 'ALL' && log.module !== moduleFilter) return false;
    if (
      search &&
      !log.message.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  const errorCount = logs.filter((l) => l.level === 'ERROR').length;
  const warnCount = logs.filter((l) => l.level === 'WARN').length;

  const levelVariant = (l: string) =>
    l === 'ERROR' ? 'danger' : l === 'WARN' ? 'warning' : 'info';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logs Système</h1>
          <span className="ml-2 inline-block">
            <Badge variant="primary">Live</Badge>
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{errorCount} erreurs</span>
          <span>•</span>
          <span>{warnCount} warnings</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-gray-900 text-gray-100"
        >
          <option value="ALL">Niveau: Tous</option>
          <option value="INFO">INFO</option>
          <option value="WARN">WARN</option>
          <option value="ERROR">ERROR</option>
        </select>
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-gray-900 text-gray-100"
        >
          <option value="ALL">Module: Tous</option>
          <option value="Auth">Auth</option>
          <option value="Wallet">Wallet</option>
          <option value="Tontines">Tontines</option>
          <option value="Products">Products</option>
          <option value="Notifications">Notifications</option>
        </select>
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-gray-900 text-gray-100 w-48"
        />
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          <span className="text-sm text-gray-300">Auto-refresh (30s)</span>
        </label>
        <button
          onClick={() => setLogs([])}
          className="px-3 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800 text-sm"
        >
          Effacer l'affichage
        </button>
      </div>

      <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm font-mono">
            <thead className="bg-gray-800 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-gray-400 text-xs">
                  Timestamp
                </th>
                <th className="px-4 py-2 text-left text-gray-400 text-xs">
                  Niveau
                </th>
                <th className="px-4 py-2 text-left text-gray-400 text-xs">
                  Module
                </th>
                <th className="px-4 py-2 text-left text-gray-400 text-xs">
                  Message
                </th>
                <th className="px-4 py-2 text-left text-gray-400 text-xs">
                  Contexte
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr
                  key={log.id}
                  className="border-t border-gray-800 hover:bg-gray-800/50"
                >
                  <td className="px-4 py-2 text-gray-400 whitespace-nowrap">
                    {log.timestamp.toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={levelVariant(log.level)}>{log.level}</Badge>
                  </td>
                  <td className="px-4 py-2 text-gray-300">{log.module}</td>
                  <td className="px-4 py-2 text-gray-200">{log.message}</td>
                  <td className="px-4 py-2">
                    {log.context && Object.keys(log.context).length > 0 ? (
                      <button
                        onClick={() =>
                          setExpandedId(expandedId === log.id ? null : log.id)
                        }
                        className="text-orange-400 hover:underline text-xs"
                      >
                        {expandedId === log.id ? 'Masquer' : 'Voir JSON'}
                      </button>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="p-8 text-center text-gray-500">Aucun log</p>
        )}
      </div>

      {filtered.some((l) => expandedId === l.id) && (
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-700 font-mono text-xs text-gray-300 overflow-auto max-h-48">
          {filtered
            .filter((l) => l.id === expandedId)
            .map((l) => (
              <pre key={l.id}>
                {JSON.stringify(l.context, null, 2)}
              </pre>
            ))}
        </div>
      )}
    </div>
  );
}
