import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Download,
  Trash2,
  Copy,
  Tag,
  Upload,
  Search,
  Plus,
  RefreshCw,
  MoreVertical,
  Play,
  Info,
  Clock,
  HardDrive,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Modal, Badge, Textarea } from '../components/common';
import { modelsService } from '../services/api';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';

const Models = () => {
  const [models, setModels] = useState([]);
  const [runningModels, setRunningModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModel, setSelectedModel] = useState(null);
  const [showPullModal, setShowPullModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pullName, setPullName] = useState('');
  const [createName, setCreateName] = useState('');
  const [modelfile, setModelfile] = useState('FROM llama2\nSYSTEM You are a helpful assistant.');
  const [copyDest, setCopyDest] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const toast = useToast();
  const { hasScope } = useAuth();

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const [modelsData, runningData] = await Promise.all([
        modelsService.list(),
        modelsService.running(),
      ]);
      setModels(modelsData.data?.models || []);
      setRunningModels(runningData.data?.models || []);
    } catch (error) {
      toast.error('Failed to fetch models');
    } finally {
      setLoading(false);
    }
  };

  const handlePull = async () => {
    if (!pullName.trim()) return;
    setActionLoading(true);
    try {
      await modelsService.pull(pullName);
      toast.success(`Started pulling ${pullName}`);
      setShowPullModal(false);
      setPullName('');
      setTimeout(fetchModels, 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to pull model');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!createName.trim() || !modelfile.trim()) return;
    setActionLoading(true);
    try {
      await modelsService.create(createName, modelfile);
      toast.success(`Created model ${createName}`);
      setShowCreateModal(false);
      setCreateName('');
      setModelfile('FROM llama2\nSYSTEM You are a helpful assistant.');
      fetchModels();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create model');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!selectedModel || !copyDest.trim()) return;
    setActionLoading(true);
    try {
      await modelsService.copy(selectedModel.name, copyDest);
      toast.success(`Copied ${selectedModel.name} to ${copyDest}`);
      setShowCopyModal(false);
      setCopyDest('');
      setSelectedModel(null);
      fetchModels();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to copy model');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedModel) return;
    setActionLoading(true);
    try {
      await modelsService.delete(selectedModel.name);
      toast.success(`Deleted ${selectedModel.name}`);
      setShowDeleteModal(false);
      setSelectedModel(null);
      fetchModels();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete model');
    } finally {
      setActionLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const filteredModels = models.filter((model) =>
    model.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isModelRunning = (name) => {
    return runningModels.some((m) => m.name === name);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Models</h1>
          <p className="text-dark-400 mt-1">Manage your AI models</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={RefreshCw} onClick={fetchModels} loading={loading}>
            Refresh
          </Button>
          {hasScope('model-manager') && (
            <>
              <Button variant="secondary" icon={Plus} onClick={() => setShowCreateModal(true)}>
                Create
              </Button>
              <Button icon={Download} onClick={() => setShowPullModal(true)}>
                Pull Model
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <Input
                icon={Search}
                placeholder="Search models..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Badge variant="primary" size="lg">
              {filteredModels.length} Models
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredModels.map((model, index) => (
                <motion.div
                  key={model.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="group bg-dark-800/50 border border-dark-700/50 rounded-2xl p-5 hover:border-primary-500/30 hover:shadow-glow transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center">
                        <Box className="w-6 h-6 text-primary-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-dark-100 group-hover:text-primary-400 transition-colors">
                          {model.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          {isModelRunning(model.name) && (
                            <Badge variant="success" size="sm" dot>Running</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-dark-400 flex items-center gap-2">
                        <HardDrive className="w-4 h-4" /> Size
                      </span>
                      <span className="text-dark-200">{formatBytes(model.size)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-dark-400 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Modified
                      </span>
                      <span className="text-dark-200">{formatDate(model.modified_at)}</span>
                    </div>
                  </div>

                  {hasScope('model-manager') && (
                    <div className="flex items-center gap-2 pt-4 border-t border-dark-700/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Copy}
                        onClick={() => {
                          setSelectedModel(model);
                          setShowCopyModal(true);
                        }}
                        className="flex-1"
                      >
                        Copy
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        onClick={() => {
                          setSelectedModel(model);
                          setShowDeleteModal(true);
                        }}
                        className="flex-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredModels.length === 0 && !loading && (
            <div className="text-center py-12">
              <Box className="w-16 h-16 mx-auto text-dark-600 mb-4" />
              <h3 className="text-lg font-medium text-dark-300 mb-2">No models found</h3>
              <p className="text-dark-400 mb-4">
                {searchTerm ? 'Try a different search term' : 'Pull a model to get started'}
              </p>
              {hasScope('model-manager') && !searchTerm && (
                <Button icon={Download} onClick={() => setShowPullModal(true)}>
                  Pull Your First Model
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={showPullModal} onClose={() => setShowPullModal(false)} title="Pull Model">
        <div className="space-y-4">
          <Input
            label="Model Name"
            placeholder="e.g., llama2, mistral, codellama"
            value={pullName}
            onChange={(e) => setPullName(e.target.value)}
          />
          <p className="text-sm text-dark-400">
            Enter the name of the model you want to pull from the Ollama registry.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowPullModal(false)}>
              Cancel
            </Button>
            <Button icon={Download} onClick={handlePull} loading={actionLoading}>
              Pull Model
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Model" size="lg">
        <div className="space-y-4">
          <Input
            label="Model Name"
            placeholder="e.g., my-custom-model"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
          />
          <Textarea
            label="Modelfile"
            placeholder="FROM llama2&#10;SYSTEM You are a helpful assistant."
            value={modelfile}
            onChange={(e) => setModelfile(e.target.value)}
            rows={10}
            className="font-mono text-sm"
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button icon={Plus} onClick={handleCreate} loading={actionLoading}>
              Create Model
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showCopyModal} onClose={() => setShowCopyModal(false)} title="Copy Model">
        <div className="space-y-4">
          <p className="text-dark-300">
            Copy <span className="text-primary-400 font-medium">{selectedModel?.name}</span> to a new name
          </p>
          <Input
            label="New Model Name"
            placeholder="e.g., my-model-copy"
            value={copyDest}
            onChange={(e) => setCopyDest(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowCopyModal(false)}>
              Cancel
            </Button>
            <Button icon={Copy} onClick={handleCopy} loading={actionLoading}>
              Copy Model
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Model">
        <div className="space-y-4">
          <p className="text-dark-300">
            Are you sure you want to delete{' '}
            <span className="text-red-400 font-medium">{selectedModel?.name}</span>?
          </p>
          <p className="text-sm text-dark-400">
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" icon={Trash2} onClick={handleDelete} loading={actionLoading}>
              Delete Model
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Models;
