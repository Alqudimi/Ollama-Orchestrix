import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScrollText,
  RefreshCw,
  Trash2,
  Filter,
  AlertCircle,
  Info,
  AlertTriangle,
  XCircle,
  Bug,
  Clock,
  Box,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Select, Badge, Modal } from '../components/common';
import { logsService } from '../services/api';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';

const levelIcons = {
  DEBUG: Bug,
  INFO: Info,
  WARNING: AlertTriangle,
  ERROR: XCircle,
  CRITICAL: AlertCircle,
};

const levelColors = {
  DEBUG: 'text-gray-400',
  INFO: 'text-blue-400',
  WARNING: 'text-yellow-400',
  ERROR: 'text-red-400',
  CRITICAL: 'text-red-500',
};

const levelBadgeVariants = {
  DEBUG: 'default',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'danger',
  CRITICAL: 'danger',
};

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [modelsWithLogs, setModelsWithLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [limit, setLimit] = useState(100);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearTarget, setClearTarget] = useState(null);
  const toast = useToast();
  const { hasScope } = useAuth();

  useEffect(() => {
    fetchData();
  }, [selectedLevel, selectedModel, limit]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsData, modelsData] = await Promise.all([
        selectedModel
          ? logsService.model(selectedModel, selectedLevel || null, limit)
          : logsService.system(selectedLevel || null, limit),
        logsService.modelsList(),
      ]);
      setLogs(logsData.data?.entries || []);
      setModelsWithLogs(modelsData.data?.models || []);
    } catch (error) {
      toast.error('Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    try {
      if (clearTarget === 'all') {
        await logsService.clearAll();
        toast.success('All logs cleared');
      } else if (clearTarget === 'system') {
        await logsService.clearSystem();
        toast.success('System logs cleared');
      } else if (clearTarget) {
        await logsService.clearModel(clearTarget);
        toast.success(`Logs for ${clearTarget} cleared`);
      }
      setShowClearModal(false);
      setClearTarget(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to clear logs');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const levelOptions = [
    { value: '', label: 'All Levels' },
    { value: 'DEBUG', label: 'Debug' },
    { value: 'INFO', label: 'Info' },
    { value: 'WARNING', label: 'Warning' },
    { value: 'ERROR', label: 'Error' },
    { value: 'CRITICAL', label: 'Critical' },
  ];

  const modelOptions = [
    { value: '', label: 'System Logs' },
    ...modelsWithLogs.map((m) => ({ value: m, label: m })),
  ];

  const limitOptions = [
    { value: 50, label: '50 entries' },
    { value: 100, label: '100 entries' },
    { value: 250, label: '250 entries' },
    { value: 500, label: '500 entries' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Logs</h1>
          <p className="text-dark-400 mt-1">View system and model logs</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={RefreshCw} onClick={fetchData} loading={loading}>
            Refresh
          </Button>
          {hasScope('admin') && (
            <Button
              variant="danger"
              icon={Trash2}
              onClick={() => {
                setClearTarget('all');
                setShowClearModal(true);
              }}
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <Select
              options={modelOptions}
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              placeholder="Select source"
              className="w-48"
            />
            <Select
              options={levelOptions}
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              placeholder="Filter by level"
              className="w-40"
            />
            <Select
              options={limitOptions}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-36"
            />
            <Badge variant="primary" size="lg">
              {logs.length} Entries
            </Badge>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin">
            <AnimatePresence>
              {logs.map((log, index) => {
                const Icon = levelIcons[log.level] || Info;
                const colorClass = levelColors[log.level] || 'text-gray-400';

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.02 }}
                    className="flex items-start gap-4 p-4 rounded-xl bg-dark-800/50 border border-dark-700/50 hover:border-dark-600 transition-colors"
                  >
                    <div className={`mt-0.5 ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <Badge variant={levelBadgeVariants[log.level]} size="sm">
                          {log.level}
                        </Badge>
                        <span className="text-xs text-dark-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-dark-200 break-words">{log.message}</p>
                      {log.extra && Object.keys(log.extra).length > 0 && (
                        <div className="mt-2 p-2 rounded-lg bg-dark-900/50 text-xs text-dark-400 font-mono">
                          {JSON.stringify(log.extra, null, 2)}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {logs.length === 0 && !loading && (
            <div className="text-center py-12">
              <ScrollText className="w-16 h-16 mx-auto text-dark-600 mb-4" />
              <h3 className="text-lg font-medium text-dark-300 mb-2">No logs found</h3>
              <p className="text-dark-400">Try adjusting the filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={showClearModal} onClose={() => setShowClearModal(false)} title="Clear Logs">
        <div className="space-y-4">
          <p className="text-dark-300">
            Are you sure you want to clear{' '}
            <span className="text-red-400 font-medium">
              {clearTarget === 'all' ? 'all logs' : clearTarget === 'system' ? 'system logs' : `logs for ${clearTarget}`}
            </span>
            ?
          </p>
          <p className="text-sm text-dark-400">This action cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowClearModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" icon={Trash2} onClick={handleClear}>
              Clear Logs
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Logs;
