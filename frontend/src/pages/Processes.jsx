import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  RefreshCw,
  XCircle,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Box,
  Play,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Select, Badge, Modal } from '../components/common';
import { processService } from '../services/api';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';

const statusIcons = {
  pending: Clock,
  running: Loader2,
  completed: CheckCircle,
  failed: XCircle,
  cancelled: AlertCircle,
};

const statusColors = {
  pending: 'warning',
  running: 'info',
  completed: 'success',
  failed: 'danger',
  cancelled: 'default',
};

const Processes = () => {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const toast = useToast();
  const { hasScope } = useAuth();

  useEffect(() => {
    fetchProcesses();
    const interval = setInterval(fetchProcesses, 5000);
    return () => clearInterval(interval);
  }, [selectedStatus, selectedType]);

  const fetchProcesses = async () => {
    try {
      const response = await processService.list(
        selectedStatus || null,
        selectedType || null
      );
      setProcesses(response.data?.processes || []);
    } catch (error) {
      toast.error('Failed to fetch processes');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedProcess) return;
    setActionLoading(true);
    try {
      await processService.cancel(selectedProcess.id);
      toast.success('Process cancelled');
      setShowCancelModal(false);
      setSelectedProcess(null);
      fetchProcesses();
    } catch (error) {
      toast.error('Failed to cancel process');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCleanup = async () => {
    setActionLoading(true);
    try {
      await processService.cleanup(24);
      toast.success('Cleanup completed');
      fetchProcesses();
    } catch (error) {
      toast.error('Failed to cleanup processes');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (start, end) => {
    if (!start) return 'N/A';
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const diff = Math.floor((endDate - startDate) / 1000);
    
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`;
    return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
  };

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'running', label: 'Running' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'pull', label: 'Pull' },
    { value: 'push', label: 'Push' },
    { value: 'create', label: 'Create' },
    { value: 'copy', label: 'Copy' },
    { value: 'delete', label: 'Delete' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Processes</h1>
          <p className="text-dark-400 mt-1">Monitor background operations</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={RefreshCw} onClick={fetchProcesses} loading={loading}>
            Refresh
          </Button>
          {hasScope('admin') && (
            <Button variant="secondary" icon={Trash2} onClick={handleCleanup} loading={actionLoading}>
              Cleanup
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <Select
              options={statusOptions}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              placeholder="Filter by status"
              className="w-40"
            />
            <Select
              options={typeOptions}
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              placeholder="Filter by type"
              className="w-40"
            />
            <Badge variant="primary" size="lg">
              {processes.length} Processes
            </Badge>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {processes.map((process, index) => {
                const StatusIcon = statusIcons[process.status] || Activity;
                const isRunning = process.status === 'running';

                return (
                  <motion.div
                    key={process.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50 hover:border-dark-600 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          process.status === 'running'
                            ? 'bg-blue-500/20'
                            : process.status === 'completed'
                            ? 'bg-green-500/20'
                            : process.status === 'failed'
                            ? 'bg-red-500/20'
                            : 'bg-dark-700'
                        }`}>
                          <StatusIcon className={`w-5 h-5 ${
                            process.status === 'running'
                              ? 'text-blue-400 animate-spin'
                              : process.status === 'completed'
                              ? 'text-green-400'
                              : process.status === 'failed'
                              ? 'text-red-400'
                              : 'text-dark-400'
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-medium text-dark-100 capitalize">
                              {process.type} Operation
                            </h3>
                            <Badge variant={statusColors[process.status]} size="sm">
                              {process.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-dark-400 flex items-center gap-2">
                            <Box className="w-4 h-4" />
                            {process.model_name || 'Unknown Model'}
                          </p>
                          {process.message && (
                            <p className="text-sm text-dark-300 mt-1">{process.message}</p>
                          )}
                          {process.error && (
                            <p className="text-sm text-red-400 mt-1">{process.error}</p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-dark-400 mb-1">
                          Started: {formatDate(process.started_at)}
                        </p>
                        <p className="text-xs text-dark-400">
                          Duration: {formatDuration(process.started_at, process.completed_at)}
                        </p>
                        {isRunning && process.progress !== undefined && (
                          <div className="mt-2">
                            <div className="w-32 h-2 bg-dark-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-300"
                                style={{ width: `${process.progress}%` }}
                              />
                            </div>
                            <p className="text-xs text-dark-400 mt-1">{process.progress.toFixed(1)}%</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {(process.status === 'running' || process.status === 'pending') && hasScope('model-manager') && (
                      <div className="flex justify-end mt-3 pt-3 border-t border-dark-700/50">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={XCircle}
                          onClick={() => {
                            setSelectedProcess(process);
                            setShowCancelModal(true);
                          }}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {processes.length === 0 && !loading && (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 mx-auto text-dark-600 mb-4" />
              <h3 className="text-lg font-medium text-dark-300 mb-2">No processes</h3>
              <p className="text-dark-400">Background processes will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} title="Cancel Process">
        <div className="space-y-4">
          <p className="text-dark-300">
            Are you sure you want to cancel this process?
          </p>
          <div className="p-3 rounded-lg bg-dark-800/50">
            <p className="text-sm text-dark-300">
              <span className="capitalize">{selectedProcess?.type}</span>: {selectedProcess?.model_name}
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowCancelModal(false)}>
              Keep Running
            </Button>
            <Button variant="danger" icon={XCircle} onClick={handleCancel} loading={actionLoading}>
              Cancel Process
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Processes;
