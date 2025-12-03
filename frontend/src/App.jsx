import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/common/Toast';
import { Layout } from './components/layout';
import { LoadingScreen } from './components/common/Loading';
import {
  Login,
  Dashboard,
  Models,
  Chat,
  Sessions,
  System,
  Logs,
  Metrics,
  Backup,
  Cache,
  Users,
  Modelfile,
  Processes,
} from './pages';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

const ProtectedRoute = ({ children, requiredScope }) => {
  const { isAuthenticated, loading, hasScope } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredScope && !hasScope(requiredScope)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="/models" element={<Models />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/modelfile" element={<Modelfile />} />
        <Route path="/system" element={<System />} />
        <Route path="/metrics" element={<Metrics />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/processes" element={<Processes />} />
        <Route
          path="/backup"
          element={
            <ProtectedRoute requiredScope="admin">
              <Backup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cache"
          element={
            <ProtectedRoute requiredScope="admin">
              <Cache />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute requiredScope="admin">
              <Users />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
