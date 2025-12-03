import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Gauge,
  RefreshCw,
  Trash2,
  TrendingUp,
  Clock,
  Zap,
  Hash,
  Box,
  Activity,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Select, Badge, Modal } from '../components/common';
import { metricsService, modelsService } from '../services/api';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

const MetricCard = ({ title, value, subtitle, icon: Icon, color = 'primary' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-dark-800/50 rounded-xl p-5 border border-dark-700/50"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-dark-400 mb-1">{title}</p>
        <p className="text-2xl font-bold text-dark-100">{value}</p>
        {subtitle && <p className="text-xs text-dark-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`w-12 h-12 rounded-xl bg-${color}-500/20 flex items-center justify-center`}>
        <Icon className={`w-6 h-6 text-${color}-400`} />
      </div>
    </div>
  </motion.div>
);

const Metrics = () => {
  const [summary, setSummary] = useState(null);
  const [allMetrics, setAllMetrics] = useState(null);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('all_time');
  const [showClearModal, setShowClearModal] = useState(false);
  const toast = useToast();
  const { hasScope } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryData, allData, modelsData] = await Promise.all([
        metricsService.summary(),
        metricsService.getAll(),
        modelsService.list(),
      ]);
      setSummary(summaryData.data);
      setAllMetrics(allData.data);
      setModels(modelsData.data?.models || []);
    } catch (error) {
      toast.error('Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    try {
      await metricsService.clearAll();
      toast.success('All metrics cleared');
      setShowClearModal(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to clear metrics');
    }
  };

  const modelMetricsData = allMetrics?.models
    ? Object.entries(allMetrics.models).map(([name, metrics]) => ({
        name: name.split(':')[0],
        requests: metrics.total_requests || 0,
        latency: metrics.avg_latency_ms || 0,
        tokens: metrics.tokens_per_second || 0,
      }))
    : [];

  const radarData = modelMetricsData.slice(0, 5).map((m) => ({
    model: m.name,
    performance: Math.min(100, (m.tokens / 50) * 100),
    reliability: Math.min(100, 100 - (m.latency / 10)),
    usage: Math.min(100, (m.requests / 100) * 100),
  }));

  const periodOptions = [
    { value: '1h', label: 'Last Hour' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: 'all_time', label: 'All Time' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Metrics</h1>
          <p className="text-dark-400 mt-1">Performance analytics and statistics</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            options={periodOptions}
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-40"
          />
          <Button variant="secondary" icon={RefreshCw} onClick={fetchData} loading={loading}>
            Refresh
          </Button>
          {hasScope('admin') && (
            <Button variant="danger" icon={Trash2} onClick={() => setShowClearModal(true)}>
              Clear All
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Requests"
          value={summary?.total_requests?.toLocaleString() || 0}
          icon={Hash}
          color="primary"
        />
        <MetricCard
          title="Avg Latency"
          value={`${summary?.avg_latency_ms?.toFixed(0) || 0}ms`}
          icon={Clock}
          color="accent"
        />
        <MetricCard
          title="Tokens/Second"
          value={summary?.tokens_per_second?.toFixed(1) || 0}
          icon={Zap}
          color="green"
        />
        <MetricCard
          title="Active Models"
          value={Object.keys(allMetrics?.models || {}).length}
          icon={Box}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle icon={Activity}>Requests by Model</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {modelMetricsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={modelMetricsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                      }}
                    />
                    <Bar dataKey="requests" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-dark-400">
                  <p>No metrics data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={TrendingUp}>Latency by Model</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {modelMetricsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={modelMetricsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="latency"
                      stroke="#d946ef"
                      strokeWidth={2}
                      dot={{ fill: '#d946ef', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-dark-400">
                  <p>No metrics data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle icon={Gauge}>Model Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Model</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-dark-400">Requests</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-dark-400">Avg Latency</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-dark-400">Tokens/sec</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-dark-400">Total Tokens</th>
                </tr>
              </thead>
              <tbody>
                {allMetrics?.models && Object.entries(allMetrics.models).map(([name, metrics]) => (
                  <motion.tr
                    key={name}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-dark-800 hover:bg-dark-800/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                          <Box className="w-4 h-4 text-primary-400" />
                        </div>
                        <span className="font-medium text-dark-100">{name}</span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 text-dark-200">
                      {metrics.total_requests?.toLocaleString() || 0}
                    </td>
                    <td className="text-right py-3 px-4 text-dark-200">
                      {metrics.avg_latency_ms?.toFixed(0) || 0}ms
                    </td>
                    <td className="text-right py-3 px-4 text-dark-200">
                      {metrics.tokens_per_second?.toFixed(1) || 0}
                    </td>
                    <td className="text-right py-3 px-4 text-dark-200">
                      {metrics.total_tokens?.toLocaleString() || 0}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {(!allMetrics?.models || Object.keys(allMetrics.models).length === 0) && (
              <div className="text-center py-12 text-dark-400">
                <Gauge className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No metrics data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={showClearModal} onClose={() => setShowClearModal(false)} title="Clear All Metrics">
        <div className="space-y-4">
          <p className="text-dark-300">
            Are you sure you want to clear <span className="text-red-400 font-medium">all metrics</span>?
          </p>
          <p className="text-sm text-dark-400">This action cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowClearModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" icon={Trash2} onClick={handleClearAll}>
              Clear All
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Metrics;
