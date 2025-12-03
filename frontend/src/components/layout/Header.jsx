import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Bell,
  Search,
  Moon,
  Sun,
  User,
  LogOut,
  Settings,
  ChevronDown,
} from 'lucide-react';

const Header = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme, sidebarOpen } = useTheme();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header
      className="fixed top-0 right-0 h-16 bg-dark-900/80 backdrop-blur-xl border-b border-dark-700/50 z-30 flex items-center justify-between px-6"
      style={{ left: sidebarOpen ? 260 : 80 }}
    >
      <div className="flex items-center gap-4">
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <input
                type="text"
                placeholder="Search..."
                className="w-full px-4 py-2 bg-dark-800/50 border border-dark-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 text-dark-100 placeholder-dark-400"
                autoFocus
                onBlur={() => setShowSearch(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        {!showSearch && (
          <button
            onClick={() => setShowSearch(true)}
            className="p-2.5 rounded-xl hover:bg-dark-800 transition-colors text-dark-400 hover:text-dark-100"
          >
            <Search className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl hover:bg-dark-800 transition-colors text-dark-400 hover:text-dark-100"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button className="p-2.5 rounded-xl hover:bg-dark-800 transition-colors text-dark-400 hover:text-dark-100 relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-dark-800 transition-colors"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-dark-100">{user?.full_name || user?.username}</p>
              <p className="text-xs text-dark-400 capitalize">{user?.scopes?.[0] || 'User'}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-dark-400" />
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-2 w-56 bg-dark-800 border border-dark-700 rounded-xl shadow-xl overflow-hidden"
              >
                <div className="p-3 border-b border-dark-700">
                  <p className="text-sm font-medium text-dark-100">{user?.full_name}</p>
                  <p className="text-xs text-dark-400">{user?.email}</p>
                </div>
                
                <div className="p-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-dark-300 hover:text-dark-100 hover:bg-dark-700 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/profile');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-dark-300 hover:text-dark-100 hover:bg-dark-700 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </button>
                </div>
                
                <div className="p-1 border-t border-dark-700">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default Header;
