import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users as UsersIcon,
  Plus,
  Trash2,
  RefreshCw,
  Shield,
  Mail,
  User,
  Lock,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Modal, Badge, Select } from '../components/common';
import { authService } from '../services/api';
import { useToast } from '../components/common/Toast';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    scopes: ['viewer'],
  });
  const [actionLoading, setActionLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await authService.getUsers();
      setUsers(response.data?.users || []);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password) {
      toast.error('Username and password are required');
      return;
    }
    setActionLoading(true);
    try {
      await authService.createUser(newUser);
      toast.success('User created successfully');
      setShowCreateModal(false);
      setNewUser({ username: '', email: '', full_name: '', password: '', scopes: ['viewer'] });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await authService.deleteUser(selectedUser.username);
      toast.success('User deleted');
      setShowDeleteModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const getScopeColor = (scope) => {
    switch (scope) {
      case 'admin':
        return 'danger';
      case 'model-manager':
        return 'warning';
      case 'viewer':
        return 'success';
      default:
        return 'default';
    }
  };

  const scopeOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'model-manager', label: 'Model Manager' },
    { value: 'viewer', label: 'Viewer' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Users</h1>
          <p className="text-dark-400 mt-1">Manage user accounts and permissions</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={RefreshCw} onClick={fetchUsers} loading={loading}>
            Refresh
          </Button>
          <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
            Add User
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {users.map((user, index) => (
            <motion.div
              key={user.username}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="group hover:border-primary-500/30" padding={false}>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-dark-100">{user.full_name || user.username}</h3>
                        <p className="text-sm text-dark-400">@{user.username}</p>
                      </div>
                    </div>
                    <Badge
                      variant={user.disabled ? 'danger' : 'success'}
                      size="sm"
                      dot
                    >
                      {user.disabled ? 'Disabled' : 'Active'}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    {user.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-dark-400" />
                        <span className="text-dark-300">{user.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-dark-400" />
                      <div className="flex flex-wrap gap-1">
                        {user.scopes?.map((scope) => (
                          <Badge key={scope} variant={getScopeColor(scope)} size="sm">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-dark-700/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      onClick={() => {
                        setSelectedUser(user);
                        setShowDeleteModal(true);
                      }}
                      className="flex-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      disabled={user.username === 'admin'}
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

      {users.length === 0 && !loading && (
        <Card>
          <div className="text-center py-12">
            <UsersIcon className="w-16 h-16 mx-auto text-dark-600 mb-4" />
            <h3 className="text-lg font-medium text-dark-300 mb-2">No users</h3>
            <p className="text-dark-400 mb-4">Create your first user</p>
            <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
              Add User
            </Button>
          </div>
        </Card>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Add User">
        <div className="space-y-4">
          <Input
            label="Username"
            icon={User}
            placeholder="Enter username"
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
          />
          <Input
            label="Email"
            icon={Mail}
            type="email"
            placeholder="Enter email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
          />
          <Input
            label="Full Name"
            icon={User}
            placeholder="Enter full name"
            value={newUser.full_name}
            onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
          />
          <Input
            label="Password"
            icon={Lock}
            type="password"
            placeholder="Enter password"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
          />
          <Select
            label="Role"
            options={scopeOptions}
            value={newUser.scopes[0]}
            onChange={(e) => setNewUser({ ...newUser, scopes: [e.target.value] })}
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button icon={Plus} onClick={handleCreateUser} loading={actionLoading}>
              Add User
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete User">
        <div className="space-y-4">
          <p className="text-dark-300">
            Are you sure you want to delete user{' '}
            <span className="text-red-400 font-medium">{selectedUser?.username}</span>?
          </p>
          <p className="text-sm text-dark-400">This action cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" icon={Trash2} onClick={handleDeleteUser} loading={actionLoading}>
              Delete User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Users;
