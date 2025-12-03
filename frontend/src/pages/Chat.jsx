import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Bot,
  User,
  Settings,
  Trash2,
  Copy,
  RefreshCw,
  Sparkles,
  Zap,
  ChevronDown,
} from 'lucide-react';
import { Card, Button, Select, Badge } from '../components/common';
import { modelsService, runService } from '../services/api';
import { useToast } from '../components/common/Toast';

const Chat = () => {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    temperature: 0.7,
    top_p: 0.9,
    num_predict: 1024,
  });
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    fetchModels();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchModels = async () => {
    try {
      const response = await modelsService.list();
      const modelList = response.data?.models || [];
      setModels(modelList);
      if (modelList.length > 0) {
        setSelectedModel(modelList[0].name);
      }
    } catch (error) {
      toast.error('Failed to fetch models');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || !selectedModel || loading) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setStreaming(true);

    const assistantMessage = { role: 'assistant', content: '' };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const allMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      await runService.chatStream(
        selectedModel,
        allMessages,
        { options: settings },
        (data) => {
          if (data.message?.content) {
            setMessages((prev) => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage.role === 'assistant') {
                lastMessage.content += data.message.content;
              }
              return newMessages;
            });
          }
        }
      );
    } catch (error) {
      toast.error('Failed to get response');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  const modelOptions = models.map((m) => ({ value: m.name, label: m.name }));

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Chat</h1>
          <p className="text-dark-400 mt-1">Interactive conversation with AI models</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            options={modelOptions}
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            placeholder="Select a model"
            className="w-48"
          />
          <Button
            variant="secondary"
            icon={Settings}
            onClick={() => setShowSettings(!showSettings)}
          />
          <Button
            variant="secondary"
            icon={Trash2}
            onClick={clearChat}
            disabled={messages.length === 0}
          />
        </div>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Temperature: {settings.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={settings.temperature}
                    onChange={(e) =>
                      setSettings({ ...settings, temperature: parseFloat(e.target.value) })
                    }
                    className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Top P: {settings.top_p}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.top_p}
                    onChange={(e) =>
                      setSettings({ ...settings, top_p: parseFloat(e.target.value) })
                    }
                    className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Max Tokens: {settings.num_predict}
                  </label>
                  <input
                    type="range"
                    min="128"
                    max="4096"
                    step="128"
                    value={settings.num_predict}
                    onChange={(e) =>
                      setSettings({ ...settings, num_predict: parseInt(e.target.value) })
                    }
                    className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                  />
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="flex-1 flex flex-col overflow-hidden" padding={false}>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          {messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-10 h-10 text-primary-400" />
                </div>
                <h2 className="text-xl font-semibold text-dark-100 mb-2">Start a conversation</h2>
                <p className="text-dark-400 max-w-md">
                  Select a model and start chatting. Your conversation will appear here.
                </p>
              </div>
            </div>
          )}

          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}

                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white'
                      : 'bg-dark-800 text-dark-100 border border-dark-700'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.role === 'assistant' && message.content && !streaming && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-dark-600">
                      <button
                        onClick={() => copyMessage(message.content)}
                        className="text-dark-400 hover:text-dark-200 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {message.role === 'assistant' && !message.content && streaming && (
                    <div className="typing-indicator flex gap-1">
                      <span className="text-primary-400"></span>
                      <span className="text-primary-400"></span>
                      <span className="text-primary-400"></span>
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-dark-300" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-dark-700">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={selectedModel ? 'Type your message...' : 'Select a model first'}
                disabled={!selectedModel || loading}
                rows={1}
                className="w-full px-4 py-3 bg-dark-800/50 border border-dark-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 text-dark-100 placeholder-dark-400 resize-none"
              />
            </div>
            <Button
              type="submit"
              icon={Send}
              disabled={!input.trim() || !selectedModel || loading}
              loading={loading}
            >
              Send
            </Button>
          </form>
          <p className="text-xs text-dark-500 mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Chat;
