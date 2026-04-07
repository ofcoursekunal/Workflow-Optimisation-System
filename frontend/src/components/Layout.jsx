import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  Factory, LayoutDashboard, Cpu, ClipboardList, Users, BarChart3,
  Bell, LogOut, Menu, X, Wifi, WifiOff, ChevronRight, Sun, Moon
} from 'lucide-react';

const navItems = {
  admin: [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/tasks', label: 'All Tasks', icon: ClipboardList },
    { path: '/admin/machines', label: 'Machines', icon: Cpu },
    { path: '/admin/users', label: 'Users', icon: Users },
    { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  ],
  supervisor: [
    { path: '/supervisor', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/supervisor/tasks', label: 'Manage Tasks', icon: ClipboardList },
    { path: '/supervisor/machines', label: 'Machines', icon: Cpu },
    { path: '/supervisor/analytics', label: 'Analytics', icon: BarChart3 },
  ],
  worker: [
    { path: '/worker', label: 'My Tasks', icon: ClipboardList },
  ],
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const [nRes, cRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/notifications/unread-count'),
      ]);
      setNotifications(nRes.data);
      setUnreadCount(cRes.data.count);
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    setUnreadCount(0);
    setNotifications(p => p.map(n => ({ ...n, is_read: 1 })));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const items = navItems[user?.role] || [];

  const roleColor = {
    admin: 'text-purple-400',
    supervisor: 'text-blue-400',
    worker: 'text-emerald-400',
  }[user?.role] || 'text-slate-400';

  const roleBadge = {
    admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    supervisor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    worker: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  }[user?.role] || '';

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 theme-bg border-r theme-border 
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-auto`}>
        
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700/50">
          <div className="w-9 h-9 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center">
            <Factory size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="font-bold text-slate-100 text-sm">Shopfloor OS</p>
            <p className="text-xs text-slate-500">Manufacturing Suite</p>
          </div>
        </div>

        {/* User Info */}
        <div className="px-4 py-3 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center font-bold text-sm text-slate-300">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate">{user?.name}</p>
              <span className={`inline-block text-xs px-2 py-0.5 rounded border font-medium ${roleBadge}`}>
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`sidebar-item ${location.pathname === path ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {location.pathname === path && <ChevronRight size={14} className="text-blue-400" />}
            </Link>
          ))}
        </nav>

        {/* Connection Status + Logout */}
        <div className="p-3 border-t border-slate-700/50 space-y-1">
          <div className="flex items-center gap-2 px-3 py-1.5">
            {connected
              ? <><Wifi size={14} className="text-emerald-400" /><span className="text-xs text-emerald-400">Live Connected</span></>
              : <><WifiOff size={14} className="text-red-400" /><span className="text-xs text-red-400">Disconnected</span></>
            }
          </div>
          <button onClick={handleLogout} className="sidebar-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="backdrop-blur border-b theme-border px-4 py-3 flex items-center justify-between shrink-0" style={{ backgroundColor: 'var(--bg2)' }}>
          <button className="lg:hidden p-2 text-slate-400 hover:text-slate-100" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="hidden lg:block">
            <p className="text-sm font-semibold text-slate-300">
              {items.find(i => i.path === location.pathname)?.label || 'Dashboard'}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {/* Theme Toggle */}
            <button
              id="layout-theme-toggle"
              onClick={toggleTheme}
              className="p-2 rounded-xl transition-all hover:scale-110 active:scale-95"
              title={isDark ? 'Light Mode' : 'Dark Mode'}
            >
              {isDark
                ? <Sun size={18} className="text-amber-400" />
                : <Moon size={18} className="text-blue-500" />
              }
            </button>
            {/* Notification Bell */}
            <div className="relative">
              <button
                id="notif-bell"
                onClick={() => { setNotifOpen(p => !p); if (!notifOpen) fetchNotifications(); }}
                className="p-2 text-slate-400 hover:text-slate-100 relative"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 z-50 shadow-2xl animate-slide-in glass-card">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-sm">Notifications</p>
                    <div className="flex gap-2">
                      <button onClick={markAllRead} className="text-xs text-blue-400 hover:text-blue-300">Mark all read</button>
                      <button onClick={() => setNotifOpen(false)}><X size={14} className="text-slate-400" /></button>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {notifications.length === 0 && <p className="text-slate-500 text-sm text-center py-4">No notifications</p>}
                    {notifications.map(n => (
                      <div key={n.id} className={`p-2.5 rounded-lg text-xs ${n.is_read ? 'bg-slate-700/30' : 'bg-slate-700 border border-slate-600'}`}>
                        <p className="text-slate-300">{n.message}</p>
                        <p className="text-slate-500 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 theme-bg">
          {children}
        </main>
      </div>
    </div>
  );
}
