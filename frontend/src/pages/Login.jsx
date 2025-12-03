import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { Button, Input } from '../components/common';
import { Lock, User, Sparkles, Zap, Shield, Cpu } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(username, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Cpu, title: 'Model Management', desc: 'Full control over AI models' },
    { icon: Zap, title: 'Real-time Chat', desc: 'Streaming responses' },
    { icon: Shield, title: 'Secure Access', desc: 'Role-based permissions' },
  ];

  return (
    <div className="min-h-screen bg-dark-950 flex">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center p-12 relative">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-lg"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center shadow-glow">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold gradient-text">Ollama Manager</h1>
              <p className="text-dark-400">Advanced AI Model Management</p>
            </div>
          </div>

          <p className="text-xl text-dark-300 mb-12 leading-relaxed">
            Your complete solution for managing, running, and monitoring Ollama AI models 
            with a beautiful, modern interface.
          </p>

          <div className="space-y-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                className="flex items-start gap-4 p-4 rounded-xl bg-dark-900/50 backdrop-blur border border-dark-700/50"
              >
                <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-primary-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-dark-100 mb-1">{feature.title}</h3>
                  <p className="text-sm text-dark-400">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="bg-dark-900/80 backdrop-blur-xl rounded-3xl border border-dark-700/50 p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="lg:hidden w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-dark-100 mb-2">Welcome Back</h2>
              <p className="text-dark-400">Sign in to your account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Username"
                icon={User}
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />

              <Input
                label="Password"
                icon={Lock}
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Button
                type="submit"
                loading={loading}
                className="w-full py-3"
              >
                Sign In
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-dark-700">
              <p className="text-center text-sm text-dark-400 mb-4">Default Accounts</p>
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="p-3 rounded-xl bg-dark-800/50 border border-dark-700">
                  <p className="font-medium text-primary-400">Admin</p>
                  <p className="text-dark-400 mt-1">admin / admin123</p>
                </div>
                <div className="p-3 rounded-xl bg-dark-800/50 border border-dark-700">
                  <p className="font-medium text-accent-400">Manager</p>
                  <p className="text-dark-400 mt-1">manager / manager123</p>
                </div>
                <div className="p-3 rounded-xl bg-dark-800/50 border border-dark-700">
                  <p className="font-medium text-green-400">Viewer</p>
                  <p className="text-dark-400 mt-1">viewer / viewer123</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
