import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Archive,
  Download,
  Trash2,
  RefreshCw,
  Plus,
  Server,
  Box,
  Calendar,
  HardDrive,
  Eye,
  Clock,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Modal, Badge, Select } from '../components/common';
import { backupService, modelsService } from '../services/api';
import { useToast } from '../components/common/Toast';

const Backup = () => {
  const [backups, setBackups] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [backupType, setBackupType] = useState('models');
  const [selectedModels, setSelectedModels] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [backupsData, modelsData] = await Promise.all([
        backupService.history(),
        modelsService.list(),
      ]);
      setBackups(backupsData.data?.backups || []);
      setModels(modelsData.data?.models || []);
    } catch (error) {
      toast.error('Failed to fetch backups');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setActionLoading(true);
    try {
      if (backupType === 'models') {
        if (selectedModels.length === 0) {
          toast.error('Please select at least one model');
          setActionLoading(false);
          return;
        }
        await backupService.createModels(selectedModels);
        toast.success('Model backup created');
      } else {
        await backupService.createSystem();
        toast.success('System backup created');
      }
      setShowCreateModal(false);
      setSelectedModels([]);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create backup');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownload = async (backupId) => {
    try {
      const blob = await backupService.download(backupId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${backupId}.tar.gz`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to download backup');
    }
  };

  const handleDelete = async () => {
    if (!selectedBackup) return;
    setActionLoading(true);
    try {
      await backupService.delete(selectedBackup.id);
      toast.success('Backup deleted');
      setShowDeleteModal(false);
      setSelectedBackup(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to delete backup');
    } finally {
      setActionLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  const toggleModelSelection = (modelName) => {
    setSelectedModels((prev) =>
      prev.includes(modelName)
        ? prev.filter((m) => m !== modelName)
        : [...prev, modelName]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Backup</h1>
          <p className="text-dark-400 mt-1">Create and manage backups</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={RefreshCw} onClick={fetchData} loading={loading}>
            Refresh
          </Button>
          <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
            Create Backup
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {backups.map((backup, index) => (
            <motion.div
              key={backup.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="group hover:border-primary-500/30" padding={false}>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        backup.type === 'models'
                          ? 'bg-gradient-to-br from-primary-500/20 to-primary-500/10'
                          : 'bg-gradient-to-br from-accent-500/20 to-accent-500/10'
                      }`}>
                        {backup.type === 'models' ? (
                          <Box className="w-6 h-6 text-primary-400" />
                        ) : (
                          <Server className="w-6 h-6 text-accent-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-dark-100">
                          {backup.type === 'models' ? 'Model Backup' : 'System Backup'}
                        </h3>
                        <p className="text-xs text-dark-400">{backup.id.slice(0, 12)}...</p>
                      </div>
                    </div>
                    <Badge variant={backup.type === 'models' ? 'primary' : 'purple'} size="sm">
                      {backup.type}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-dark-400 flex items-center gap-2">
                        <HardDrive className="w-4 h-4" /> Size
                      </span>
                      <span className="text-dark-200">{backup.size_human || formatBytes(backup.size)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-dark-400 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Created
                      </span>
                      <span className="text-dark-200">{formatDate(backup.created_at)}</span>
                    </div>
                    {backup.models && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-dark-400 flex items-center gap-2">
                          <Box className="w-4 h-4" /> Models
                        </span>
                        <span className="text-dark-200">{backup.models.length}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-dark-700/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Download}
                      onClick={() => handleDownload(backup.id)}
                      className="flex-1"
                    >
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      onClick={() => {
                        setSelectedBackup(backup);
                        setShowDeleteModal(true);
                      }}
                      className="flex-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {backups.length === 0 && !loading && (
        <Card>
          <div className="text-center py-12">
            <Archive className="w-16 h-16 mx-auto text-dark-600 mb-4" />
            <h3 className="text-lg font-medium text-dark-300 mb-2">No backups</h3>
            <p className="text-dark-400 mb-4">Create your first backup to get started</p>
            <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
              Create Backup
            </Button>
          </div>
        </Card>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Backup" size="lg">
        <div className="space-y-4">
          <div className="flex gap-4">
            <button
              onClick={() => setBackupType('models')}
              className={`flex-1 p-4 rounded-xl border transition-all ${
                backupType === 'models'
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-dark-700 hover:border-dark-600'
              }`}
            >
              <Box className={`w-8 h-8 mx-auto mb-2 ${backupType === 'models' ? 'text-primary-400' : 'text-dark-400'}`} />
              <p className={`font-medium ${backupType === 'models' ? 'text-primary-400' : 'text-dark-300'}`}>
                Model Backup
              </p>
              <p className="text-xs text-dark-400 mt-1">Backup specific models</p>
            </button>
            <button
              onClick={() => setBackupType('system')}
              className={`flex-1 p-4 rounded-xl border transition-all ${
                backupType === 'system'
                  ? 'border-accent-500 bg-accent-500/10'
                  : 'border-dark-700 hover:border-dark-600'
              }`}
            >
              <Server className={`w-8 h-8 mx-auto mb-2 ${backupType === 'system' ? 'text-accent-400' : 'text-dark-400'}`} />
              <p className={`font-medium ${backupType === 'system' ? 'text-accent-400' : 'text-dark-300'}`}>
                System Backup
              </p>
              <p className="text-xs text-dark-400 mt-1">Full system backup</p>
            </button>
          </div>

          {backupType === 'models' && (
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Select Models
              </label>
              <div className="max-h-60 overflow-y-auto space-y-2 scrollbar-thin">
                {models.map((model) => (
                  <label
                    key={model.name}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedModels.includes(model.name)
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-dark-700 hover:border-dark-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedModels.includes(model.name)}
                      onChange={() => toggleModelSelection(model.name)}
                      className="w-4 h-4 rounded border-dark-600 text-primary-500 focus:ring-primary-500"
                    />
                    <Box className="w-5 h-5 text-dark-400" />
                    <span className="text-dark-200">{model.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button icon={Archive} onClick={handleCreateBackup} loading={actionLoading}>
              Create Backup
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Backup">
        <div className="space-y-4">
          <p className="text-dark-300">
            Are you sure you want to delete this backup?
          </p>
          <p className="text-sm text-dark-400">This action cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" icon={Trash2} onClick={handleDelete} loading={actionLoading}>
              Delete Backup
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Backup;
