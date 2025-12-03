import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessagesSquare,
  Plus,
  Trash2,
  RefreshCw,
  MessageCircle,
  Clock,
  Bot,
  MoreVertical,
  Eye,
  XCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Modal, Badge, Select } from '../components/common';
import { sessionsService, modelsService } from '../services/api';
import { useToast } from '../components/common/Toast';

const Sessions = () => {
  const [sessions, setSessions] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [newSession, setNewSession] = useState({
    model: '',
    system_prompt: '',
    name: '',
  });
  const [actionLoading, setActionLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sessionsData, modelsData] = await Promise.all([
        sessionsService.list(),
        modelsService.list(),
      ]);
      setSessions(sessionsData.data?.sessions || []);
      setModels(modelsData.data?.models || []);
    } catch (error) {
      toast.error('Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    if (!newSession.model) return;
    setActionLoading(true);
    try {
      await sessionsService.start(
        newSession.model,
        newSession.system_prompt,
        { name: newSession.name }
      );
      toast.success('Session created successfully');
      setShowCreateModal(false);
      setNewSession({ model: '', system_prompt: '', name: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create session');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await sessionsService.delete(sessionId);
      toast.success('Session deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete session');
    }
  };

  const handleClearSession = async (sessionId) => {
    try {
      await sessionsService.clear(sessionId);
      toast.success('Session history cleared');
      fetchData();
    } catch (error) {
      toast.error('Failed to clear session');
    }
  };

  const handleViewHistory = async (session) => {
    setSelectedSession(session);
    try {
      const response = await sessionsService.history(session.id);
      setSessionHistory(response.data?.messages || []);
      setShowHistoryModal(true);
    } catch (error) {
      toast.error('Failed to fetch session history');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  const modelOptions = models.map((m) => ({ value: m.name, label: m.name }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Sessions</h1>
          <p className="text-dark-400 mt-1">Manage conversation sessions</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={RefreshCw} onClick={fetchData} loading={loading}>
            Refresh
          </Button>
          <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
            New Session
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {sessions.map((session, index) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="group hover:border-primary-500/30" padding={false}>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500/20 to-primary-500/20 flex items-center justify-center">
                        <MessagesSquare className="w-6 h-6 text-accent-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-dark-100">
                          {session.metadata?.name || `Session ${session.id.slice(0, 8)}`}
                        </h3>
                        <p className="text-sm text-dark-400">{session.model}</p>
                      </div>
                    </div>
                    <Badge variant="success" size="sm" dot>Active</Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-dark-400 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" /> Messages
                      </span>
                      <span className="text-dark-200">{session.message_count || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-dark-400 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Created
                      </span>
                      <span className="text-dark-200">{formatDate(session.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-dark-700/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Eye}
                      onClick={() => handleViewHistory(session)}
                      className="flex-1"
                    >
                      History
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={XCircle}
                      onClick={() => handleClearSession(session.id)}
                      className="flex-1"
                    >
                      Clear
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      onClick={() => handleDeleteSession(session.id)}
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

      {sessions.length === 0 && !loading && (
        <Card>
          <div className="text-center py-12">
            <MessagesSquare className="w-16 h-16 mx-auto text-dark-600 mb-4" />
            <h3 className="text-lg font-medium text-dark-300 mb-2">No sessions</h3>
            <p className="text-dark-400 mb-4">Create a session to start chatting</p>
            <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
              Create Session
            </Button>
          </div>
        </Card>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Session">
        <div className="space-y-4">
          <Input
            label="Session Name (optional)"
            placeholder="My Chat Session"
            value={newSession.name}
            onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
          />
          <Select
            label="Model"
            options={modelOptions}
            value={newSession.model}
            onChange={(e) => setNewSession({ ...newSession, model: e.target.value })}
            placeholder="Select a model"
          />
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              System Prompt (optional)
            </label>
            <textarea
              value={newSession.system_prompt}
              onChange={(e) => setNewSession({ ...newSession, system_prompt: e.target.value })}
              placeholder="You are a helpful assistant..."
              rows={4}
              className="w-full px-4 py-3 bg-dark-800/50 border border-dark-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 text-dark-100 placeholder-dark-400 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button icon={Plus} onClick={handleCreateSession} loading={actionLoading}>
              Create Session
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title={`Session History - ${selectedSession?.metadata?.name || selectedSession?.id?.slice(0, 8)}`}
        size="lg"
      >
        <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-thin">
          {sessionHistory.length === 0 ? (
            <p className="text-center text-dark-400 py-8">No messages in this session</p>
          ) : (
            sessionHistory.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary-500 text-white'
                      : 'bg-dark-800 text-dark-100'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Sessions;
