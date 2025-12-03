import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Database,
  RefreshCw,
  Trash2,
  Zap,
  Hash,
  Target,
  XCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal } from '../components/common';
import { cacheService } from '../services/api';
import { useToast } from '../components/common/Toast';

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'primary' }) => (
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

const Cache = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showClearModal, setShowClearModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await cacheService.stats();
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to fetch cache stats');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    setActionLoading(true);
    try {
      await cacheService.clear();
      toast.success('Cache cleared successfully');
      setShowClearModal(false);
      fetchStats();
    } catch (error) {
      toast.error('Failed to clear cache');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCleanup = async () => {
    setActionLoading(true);
    try {
      await cacheService.cleanup();
      toast.success('Cache cleanup completed');
      fetchStats();
    } catch (error) {
      toast.error('Failed to cleanup cache');
    } finally {
      setActionLoading(false);
    }
  };

  const hitRate = stats?.local_cache?.hit_rate
    ? (stats.local_cache.hit_rate * 100).toFixed(1)
    : 0;

  const cacheUsage = stats?.local_cache
    ? ((stats.local_cache.size / stats.local_cache.max_size) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Cache</h1>
          <p className="text-dark-400 mt-1">Manage cache storage and performance</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={RefreshCw} onClick={fetchStats} loading={loading}>
            Refresh
          </Button>
          <Button variant="secondary" icon={Clock} onClick={handleCleanup} loading={actionLoading}>
            Cleanup Expired
          </Button>
          <Button variant="danger" icon={Trash2} onClick={() => setShowClearModal(true)}>
            Clear All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Cache Size"
          value={stats?.local_cache?.size || 0}
          subtitle={`of ${stats?.local_cache?.max_size || 0} max`}
          icon={Database}
          color="primary"
        />
        <StatCard
          title="Hit Rate"
          value={`${hitRate}%`}
          subtitle="Cache efficiency"
          icon={Target}
          color="green"
        />
        <StatCard
          title="Cache Hits"
          value={stats?.local_cache?.hits?.toLocaleString() || 0}
          subtitle="Successful lookups"
          icon={CheckCircle}
          color="accent"
        />
        <StatCard
          title="Cache Misses"
          value={stats?.local_cache?.misses?.toLocaleString() || 0}
          subtitle="Failed lookups"
          icon={XCircle}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle icon={Database}>Cache Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-dark-400">Storage Used</span>
                  <span className="text-sm text-dark-200">{cacheUsage}%</span>
                </div>
                <div className="w-full h-4 bg-dark-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${cacheUsage}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-dark-400">
                  <span>0</span>
                  <span>{stats?.local_cache?.max_size || 0} entries</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-sm text-dark-400">Hits</span>
                  </div>
                  <p className="text-2xl font-bold text-dark-100">
                    {stats?.local_cache?.hits?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50">
                  <div className="flex items-center gap-3 mb-2">
                    <XCircle className="w-5 h-5 text-red-400" />
                    <span className="text-sm text-dark-400">Misses</span>
                  </div>
                  <p className="text-2xl font-bold text-dark-100">
                    {stats?.local_cache?.misses?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={Zap}>Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-dark-300">Hit Rate</span>
                  <Badge variant={parseFloat(hitRate) > 50 ? 'success' : 'warning'} size="lg">
                    {hitRate}%
                  </Badge>
                </div>
                <div className="w-full h-3 bg-dark-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${hitRate}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full rounded-full ${
                      parseFloat(hitRate) > 70
                        ? 'bg-gradient-to-r from-green-500 to-green-400'
                        : parseFloat(hitRate) > 40
                        ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                        : 'bg-gradient-to-r from-red-500 to-red-400'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50 text-center">
                  <p className="text-3xl font-bold text-primary-400 mb-1">
                    {stats?.local_cache?.size || 0}
                  </p>
                  <p className="text-sm text-dark-400">Cached Items</p>
                </div>
                <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50 text-center">
                  <p className="text-3xl font-bold text-accent-400 mb-1">
                    {stats?.local_cache?.max_size || 0}
                  </p>
                  <p className="text-sm text-dark-400">Max Capacity</p>
                </div>
              </div>

              <p className="text-sm text-dark-400 text-center">
                {parseFloat(hitRate) > 70
                  ? 'Excellent cache performance!'
                  : parseFloat(hitRate) > 40
                  ? 'Good cache performance'
                  : 'Consider increasing cache size'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Modal isOpen={showClearModal} onClose={() => setShowClearModal(false)} title="Clear Cache">
        <div className="space-y-4">
          <p className="text-dark-300">
            Are you sure you want to clear <span className="text-red-400 font-medium">all cache</span>?
          </p>
          <p className="text-sm text-dark-400">
            This will remove all cached data and may temporarily impact performance.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowClearModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" icon={Trash2} onClick={handleClearAll} loading={actionLoading}>
              Clear Cache
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Cache;
