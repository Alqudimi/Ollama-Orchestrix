import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const savedSidebar = localStorage.getItem('sidebarOpen');
    
    if (savedTheme) {
      setIsDark(savedTheme === 'dark');
    }
    if (savedSidebar !== null) {
      setSidebarOpen(savedSidebar === 'true');
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('sidebarOpen', sidebarOpen.toString());
  }, [sidebarOpen]);

  const toggleTheme = () => setIsDark(!isDark);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const value = {
    isDark,
    toggleTheme,
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export default ThemeContext;
