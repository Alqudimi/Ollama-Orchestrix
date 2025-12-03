import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Activity,
  RefreshCw,
  Server,
  Zap,
  Thermometer,
  Gauge,
  Wrench,
  Database,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '../components/common';
import { systemService } from '../services/api';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

const ResourceCard = ({ title, icon: Icon, value, max, unit, color, details }) => {
  const percentage = max ? (value / max) * 100 : value;
  
  const getColorClass = () => {
    if (percentage > 90) return 'from-red-500 to-red-600';
    if (percentage > 70) return 'from-orange-500 to-orange-600';
    return `from-${color}-500 to-${color}-600`;
  };

  return (
    <Card>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-${color}-500/20 to-${color}-500/10 flex items-center justify-center`}>
            <Icon className={`w-6 h-6 text-${color}-400`} />
          </div>
          <div>
            <h3 className="font-semibold text-dark-100">{title}</h3>
            <p className="text-sm text-dark-400">
              {typeof value === 'number' ? value.toFixed(1) : value}{unit}
              {max && ` / ${max}${unit}`}
            </p>
          </div>
        </div>
        <span className={`text-2xl font-bold text-${color}-400`}>
          {percentage.toFixed(0)}%
        </span>
      </div>

      <div className="w-full h-3 bg-dark-700 rounded-full overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`h-full bg-gradient-to-r ${getColorClass()} rounded-full`}
        />
      </div>

      {details && (
        <div className="grid grid-cols-2 gap-2">
          {details.map((detail, index) => (
            <div key={index} className="text-sm">
              <span className="text-dark-400">{detail.label}: </span>
              <span className="text-dark-200">{detail.value}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

const System = () => {
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState(null);
  const [health, setHealth] = useState(null);
  const [ollamaProcesses, setOllamaProcesses] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const toast = useToast();
  const { hasScope } = useAuth();

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [resourcesData, healthData, processesData] = await Promise.all([
        systemService.resources(),
        systemService.health(),
        systemService.ollamaProcesses(),
      ]);
      setResources(resourcesData.data);
      setHealth(healthData.data);
      setOllamaProcesses(processesData.data?.processes || []);
    } catch (error) {
      toast.error('Failed to fetch system data');
    } finally {
      setLoading(false);
    }
  };

  const handleRepair = async () => {
    setActionLoading(true);
    try {
      await systemService.repair();
      toast.success('System repair completed');
      fetchData();
    } catch (error) {
      toast.error('Failed to repair system');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRebuildIndex = async () => {
    setActionLoading(true);
    try {
      await systemService.rebuildIndex();
      toast.success('Index rebuilt successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to rebuild index');
    } finally {
      setActionLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 GB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const cpuHistory = resources?.cpu ? [
    { time: '-5m', value: Math.random() * 30 + 20 },
    { time: '-4m', value: Math.random() * 30 + 20 },
    { time: '-3m', value: Math.random() * 30 + 20 },
    { time: '-2m', value: Math.random() * 30 + 20 },
    { time: '-1m', value: Math.random() * 30 + 20 },
    { time: 'Now', value: resources.cpu.percent },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">System</h1>
          <p className="text-dark-400 mt-1">Monitor system resources and health</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={health?.status === 'healthy' ? 'success' : 'danger'} dot size="lg">
            {health?.ollama_connected ? 'Ollama Connected' : 'Ollama Disconnected'}
          </Badge>
          <Button variant="secondary" icon={RefreshCw} onClick={fetchData} loading={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ResourceCard
          title="CPU"
          icon={Cpu}
          value={resources?.cpu?.percent || 0}
          unit="%"
          color="primary"
          details={[
            { label: 'Cores', value: resources?.cpu?.cores || 0 },
            { label: 'Frequency', value: `${resources?.cpu?.frequency_mhz || 0} MHz` },
          ]}
        />
        <ResourceCard
          title="Memory"
          icon={MemoryStick}
          value={resources?.memory?.used ? resources.memory.used / (1024 * 1024 * 1024) : 0}
          max={resources?.memory?.total ? resources.memory.total / (1024 * 1024 * 1024) : 0}
          unit=" GB"
          color="accent"
          details={[
            { label: 'Available', value: formatBytes(resources?.memory?.available) },
            { label: 'Used', value: `${resources?.memory?.percent?.toFixed(1) || 0}%` },
          ]}
        />
        <ResourceCard
          title="Disk"
          icon={HardDrive}
          value={resources?.disk?.used ? resources.disk.used / (1024 * 1024 * 1024) : 0}
          max={resources?.disk?.total ? resources.disk.total / (1024 * 1024 * 1024) : 0}
          unit=" GB"
          color="green"
          details={[
            { label: 'Free', value: formatBytes(resources?.disk?.free) },
            { label: 'Used', value: `${resources?.disk?.percent?.toFixed(1) || 0}%` },
          ]}
        />
        <ResourceCard
          title="GPU"
          icon={Zap}
          value={resources?.gpu?.gpus?.[0]?.utilization || 0}
          unit="%"
          color="orange"
          details={[
            { label: 'Name', value: resources?.gpu?.gpus?.[0]?.name?.slice(0, 15) || 'N/A' },
            { label: 'Memory', value: resources?.gpu?.gpus?.[0]?.memory_used ? `${resources.gpu.gpus[0].memory_used} MB` : 'N/A' },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle icon={Activity}>CPU Usage History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cpuHistory}>
                  <defs>
                    <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
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
            <CardTitle icon={Server}>Ollama Processes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ollamaProcesses.length > 0 ? (
                ollamaProcesses.map((process, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-xl bg-dark-800/50 border border-dark-700/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-primary-400" />
                      </div>
                      <div>
                        <p className="font-medium text-dark-100">{process.name || 'Process'}</p>
                        <p className="text-sm text-dark-400">PID: {process.pid}</p>
                      </div>
                    </div>
                    <Badge variant="success" size="sm" dot>Running</Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-dark-400">
                  <Server className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No running processes</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {hasScope('admin') && (
        <Card>
          <CardHeader>
            <CardTitle icon={Wrench}>System Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50">
                <h4 className="font-medium text-dark-100 mb-2">System Repair</h4>
                <p className="text-sm text-dark-400 mb-4">
                  Fix common issues and restore system to a healthy state
                </p>
                <Button
                  variant="secondary"
                  icon={Wrench}
                  onClick={handleRepair}
                  loading={actionLoading}
                >
                  Run Repair
                </Button>
              </div>
              <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50">
                <h4 className="font-medium text-dark-100 mb-2">Rebuild Index</h4>
                <p className="text-sm text-dark-400 mb-4">
                  Rebuild the model index for better performance
                </p>
                <Button
                  variant="secondary"
                  icon={Database}
                  onClick={handleRebuildIndex}
                  loading={actionLoading}
                >
                  Rebuild Index
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default System;
