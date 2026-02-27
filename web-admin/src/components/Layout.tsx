import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { notificationsApi } from '../api/notifications.api';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/users', label: 'Utilisateurs', icon: '👥' },
  { to: '/tontines', label: 'Tontines', icon: '🤝' },
  { to: '/marketplace', label: 'Marketplace', icon: '🛒' },
  { to: '/transactions', label: 'Transactions', icon: '💰' },
  { to: '/notifications', label: 'Notifications', icon: '🔔' },
  { to: '/logs', label: 'Logs', icon: '📋' },
  { to: '/settings', label: 'Paramètres', icon: '⚙️' },
];

const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/users': 'Utilisateurs',
  '/tontines': 'Tontines',
  '/marketplace': 'Marketplace',
  '/transactions': 'Transactions',
  '/notifications': 'Notifications',
  '/logs': 'Logs',
  '/settings': 'Paramètres',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    notificationsApi
      .getUnreadCount()
      .then((res) => setUnreadCount(res.data?.count ?? 0))
      .catch(() => setUnreadCount(0));
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const pageTitle =
    routeTitles[location.pathname] ||
    (location.pathname.startsWith('/users/') ? 'Détail utilisateur' : 'PICPEC Admin');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-60 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <span className="text-2xl font-bold text-orange-500">🟠 PICPEC</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-orange-50 text-orange-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm font-medium text-orange-600">
              {user?.fullName?.[0] ?? user?.email?.[0] ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.fullName ?? user?.email}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Topbar */}
      <header className="fixed top-0 left-60 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-30">
        <h1 className="text-xl font-semibold text-gray-900">{pageTitle}</h1>
        <div className="flex items-center gap-4">
          <NavLink
            to="/notifications"
            className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="text-xl">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-xs font-medium text-white bg-red-500 rounded-full">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavLink>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm font-medium text-orange-600">
              {user?.fullName?.[0] ?? user?.email?.[0] ?? '?'}
            </div>
            <span className="text-sm font-medium text-gray-700">
              {user?.fullName ?? user?.email}
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="ml-60 pt-16 min-h-screen p-6">
        {children}
      </main>
    </div>
  );
}
