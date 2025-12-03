import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
  const { sidebarOpen } = useTheme();

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-primary-500/5 rounded-full blur-3xl" />
      </div>

      <Sidebar />
      <Header />

      <motion.main
        initial={false}
        animate={{ 
          marginLeft: sidebarOpen ? 260 : 80,
          paddingTop: 64 
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="min-h-screen p-6"
      >
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </motion.main>
    </div>
  );
};

export default Layout;
