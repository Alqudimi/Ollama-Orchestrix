import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Box,
  Cpu,
  HardDrive,
  Activity,
  Zap,
  ArrowUpRight,
  Clock,
  MemoryStick,
  Gauge,
  Server,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge, CardSkeleton } from '../components/common';
import { systemService, modelsService, metricsService } from '../services/api';
import { useToast } from '../components/common/Toast';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = 'primary' }) => {
  const colors = {
    primary: 'from-primary-500 to-primary-600',
    accent: 'from-accent-500 to-accent-600',
    green: 'from-green-500 to-green-600',
    orange: 'from-orange-500 to-orange-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-900/80 backdrop-blur-xl rounded-2xl border border-dark-700/50 p-6 hover:shadow-glow hover:border-primary-500/30 transition-all duration-300"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-dark-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-dark-100">{value}</p>
          {subtitle && <p className="text-sm text-dark-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-2 mt-4">
          <span className={`text-sm ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
          <span className="text-xs text-dark-400">vs last hour</span>
        </div>
      )}
    </motion.div>
  );
};

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState(null);
  const [models, setModels] = useState([]);
  const [systemInfo, setSystemInfo] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const toast = useToast();

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [healthData, modelsData, resourcesData, metricsData] = await Promise.all([
        systemService.health(),
        modelsService.list(),
        systemService.resources(),
        metricsService.summary(),
      ]);

      setHealth(healthData.data);
      setModels(modelsData.data?.models || []);
      setSystemInfo(resourcesData.data);
      setMetrics(metricsData.data);
    } catch (error) {
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const cpuData = [
    { name: '5m ago', value: 45 },
    { name: '4m ago', value: 52 },
    { name: '3m ago', value: 48 },
    { name: '2m ago', value: 61 },
    { name: '1m ago', value: 55 },
    { name: 'Now', value: systemInfo?.cpu?.percent || 50 },
  ];

  const memoryPieData = [
    { name: 'Used', value: systemInfo?.memory?.percent || 50 },
    { name: 'Free', value: 100 - (systemInfo?.memory?.percent || 50) },
  ];

  const COLORS = ['#0ea5e9', '#1e293b'];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Dashboard</h1>
          <p className="text-dark-400 mt-1">System overview and quick stats</p>
        </div>
        <Badge variant={health?.status === 'healthy' ? 'success' : 'danger'} dot size="lg">
          {health?.status || 'Unknown'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Models"
          value={models.length}
          subtitle="Available for use"
          icon={Box}
          color="primary"
        />
        <StatCard
          title="CPU Usage"
          value={`${systemInfo?.cpu?.percent?.toFixed(1) || 0}%`}
          subtitle={`${systemInfo?.cpu?.cores || 0} cores`}
          icon={Cpu}
          color="accent"
        />
        <StatCard
          title="Memory"
          value={`${systemInfo?.memory?.percent?.toFixed(1) || 0}%`}
          subtitle={formatBytes(systemInfo?.memory?.used)}
          icon={MemoryStick}
          color="green"
        />
        <StatCard
          title="Uptime"
          value={`${Math.floor((health?.uptime_seconds || 0) / 3600)}h`}
          subtitle="System uptime"
          icon={Clock}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle icon={Activity}>CPU Usage Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cpuData}>
                  <defs>
                    <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    fill="url(#cpuGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={HardDrive}>Memory Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={memoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {memoryPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary-500" />
                <span className="text-sm text-dark-300">Used</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-dark-700" />
                <span className="text-sm text-dark-300">Free</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle icon={Box}>Recent Models</CardTitle>
            <Link
              to="/models"
              className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
            >
              View all <ArrowUpRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {models.slice(0, 5).map((model) => (
                <motion.div
                  key={model.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-dark-800/50 border border-dark-700/50 hover:border-primary-500/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center">
                      <Box className="w-5 h-5 text-primary-400" />
                    </div>
                    <div>
                      <p className="font-medium text-dark-100">{model.name}</p>
                      <p className="text-xs text-dark-400">{formatBytes(model.size)}</p>
                    </div>
                  </div>
                  <Badge variant="primary" size="sm">Ready</Badge>
                </motion.div>
              ))}
              {models.length === 0 && (
                <div className="text-center py-8 text-dark-400">
                  <Box className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No models available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={Gauge}>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-dark-400">Total Requests</span>
                  <span className="text-lg font-semibold text-dark-100">
                    {metrics?.total_requests || 0}
                  </span>
                </div>
                <div className="w-full h-2 bg-dark-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full w-3/4" />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-dark-400">Avg Latency</span>
                  <span className="text-lg font-semibold text-dark-100">
                    {metrics?.avg_latency_ms?.toFixed(0) || 0}ms
                  </span>
                </div>
                <div className="w-full h-2 bg-dark-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full w-1/2" />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-dark-400">Tokens/sec</span>
                  <span className="text-lg font-semibold text-dark-100">
                    {metrics?.tokens_per_second?.toFixed(1) || 0}
                  </span>
                </div>
                <div className="w-full h-2 bg-dark-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-accent-500 to-accent-400 rounded-full w-2/3" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
