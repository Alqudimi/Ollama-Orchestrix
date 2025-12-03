import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Box,
  MessageSquare,
  MessagesSquare,
  Activity,
  ScrollText,
  Settings,
  Database,
  HardDrive,
  Users,
  ChevronLeft,
  Cpu,
  Gauge,
  Archive,
  FileCode,
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', scope: 'viewer' },
  { path: '/models', icon: Box, label: 'Models', scope: 'viewer' },
  { path: '/chat', icon: MessageSquare, label: 'Chat', scope: 'viewer' },
  { path: '/sessions', icon: MessagesSquare, label: 'Sessions', scope: 'viewer' },
  { path: '/modelfile', icon: FileCode, label: 'Modelfile', scope: 'viewer' },
  { divider: true, label: 'Monitoring' },
  { path: '/system', icon: Cpu, label: 'System', scope: 'viewer' },
  { path: '/metrics', icon: Gauge, label: 'Metrics', scope: 'viewer' },
  { path: '/logs', icon: ScrollText, label: 'Logs', scope: 'viewer' },
  { path: '/processes', icon: Activity, label: 'Processes', scope: 'viewer' },
  { divider: true, label: 'Administration' },
  { path: '/backup', icon: Archive, label: 'Backup', scope: 'admin' },
  { path: '/cache', icon: Database, label: 'Cache', scope: 'admin' },
  { path: '/users', icon: Users, label: 'Users', scope: 'admin' },
];

const Sidebar = () => {
  const { sidebarOpen, toggleSidebar } = useTheme();
  const { hasScope } = useAuth();
  const location = useLocation();

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 260 : 80 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-full bg-dark-900/95 backdrop-blur-xl border-r border-dark-700/50 z-40 flex flex-col"
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-dark-700/50">
        <AnimatePresence mode="wait">
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">O</span>
              </div>
              <div>
                <h1 className="font-bold text-dark-100">Ollama</h1>
                <p className="text-xs text-dark-400">Manager</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-dark-800 transition-colors text-dark-400 hover:text-dark-100"
        >
          <motion.div
            animate={{ rotate: sidebarOpen ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.div>
        </button>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto scrollbar-thin">
        <ul className="space-y-1">
          {navItems.map((item, index) => {
            if (item.divider) {
              return sidebarOpen ? (
                <li key={index} className="pt-4 pb-2 px-3">
                  <span className="text-xs font-medium text-dark-500 uppercase tracking-wider">
                    {item.label}
                  </span>
                </li>
              ) : (
                <li key={index} className="py-2">
                  <div className="border-t border-dark-700/50" />
                </li>
              );
            }

            if (!hasScope(item.scope)) return null;

            const isActive = location.pathname === item.path;

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300
                    ${isActive 
                      ? 'bg-gradient-to-r from-primary-500/20 to-primary-500/10 text-primary-400 shadow-lg shadow-primary-500/10' 
                      : 'text-dark-400 hover:text-dark-100 hover:bg-dark-800/50'
                    }
                  `}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary-400' : ''}`} />
                  <AnimatePresence mode="wait">
                    {sidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="font-medium whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute right-0 w-1 h-6 bg-primary-500 rounded-l-full"
                    />
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-3 border-t border-dark-700/50">
        <NavLink
          to="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 text-dark-400 hover:text-dark-100 hover:bg-dark-800/50"
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span className="font-medium">Settings</span>}
        </NavLink>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
