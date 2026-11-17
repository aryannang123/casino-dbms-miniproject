'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthProvider';
import api from '../../lib/api';

export default function AdminPortal() {
  const { user, isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Role Assignment State
  const [targetPlayerId, setTargetPlayerId] = useState('');
  const [newRole, setNewRole] = useState('DEALER');

  // MongoDB NoSQL Analytics State
  const [dailyData, setDailyData] = useState(null);
  const [gameLogs, setGameLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState('2024-10-20');
  const [mongoLoading, setMongoLoading] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (!isAdmin) {
        router.push('/dashboard');
      }
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/players?limit=50');
      if (res.data.success) {
        setPlayers(res.data.data.players || []);
      }
    } catch (err) {
      console.error('Failed to load players:', err);
      setError(err.response?.data?.message || 'Failed to fetch player database.');
    } finally {
      setLoading(false);
    }
  };

  const loadMongoAnalytics = async (dateStr) => {
    try {
      setMongoLoading(true);
      const [dailyRes, logsRes] = await Promise.all([
        api.get(`/analytics/daily/${dateStr || selectedDate}`).catch(() => ({ data: { success: false, data: null } })),
        api.get('/analytics/games/all').catch(() => ({ data: { success: false, data: [] } }))
      ]);

      if (dailyRes.data.success && dailyRes.data.data) {
        setDailyData(dailyRes.data.data);
      }
      if (logsRes.data.success && Array.isArray(logsRes.data.data)) {
        setGameLogs(logsRes.data.data);
      }
    } catch (err) {
      console.warn('Admin MongoDB fetch error:', err);
    } finally {
      setMongoLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      loadPlayers();
      loadMongoAnalytics(selectedDate);
    }
  }, [isAuthenticated, isAdmin]);

  const handleStatusChange = async (playerId, newStatus) => {
    try {
      setActionLoading(true);
      setError('');
      setSuccess('');
      const res = await api.patch(`/auth/players/${playerId}/status`, { status: newStatus });
      if (res.data.success) {
        setSuccess(`Player #${playerId} status changed to ${newStatus}.`);
        await loadPlayers();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignRole = async (e) => {
    e.preventDefault();
    if (!targetPlayerId) {
      setError('Please select a player.');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      setSuccess('');
      const res = await api.post('/auth/assign-role', {
        playerId: parseInt(targetPlayerId),
        roleName: newRole
      });

      if (res.data.success) {
        setSuccess(`Role ${newRole} assigned successfully to Player #${targetPlayerId}!`);
        setTargetPlayerId('');
        await loadPlayers();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign role.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeRole = async (playerId, roleName) => {
    if (!confirm(`Are you sure you want to revoke the ${roleName} role from Player #${playerId}?`)) return;

    try {
      setActionLoading(true);
      setError('');
      setSuccess('');
      const res = await api.post('/auth/revoke-role', {
        playerId: parseInt(playerId),
        roleName
      });

      if (res.data.success) {
        setSuccess(res.data.message || `Role ${roleName} revoked.`);
        await loadPlayers();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to revoke role.');
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm">Loading Admin Console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold font-display text-white">Administrator Control Panel</h1>
            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-gold/20 text-gold border border-gold/40">
              Role: ADMIN
            </span>
          </div>
          <p className="text-gray-400 mt-1">Manage users, audit relational schema constraints, and configure Role-Based Access Control (RBAC).</p>
        </div>

        <button
          onClick={loadPlayers}
          className="px-4 py-2 text-sm bg-white/5 border border-casino-border rounded-lg text-gray-300 hover:text-gold hover:border-gold/40 transition-colors self-start md:self-auto"
        >
          ↻ Refresh Players
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-gray-400 hover:text-white">✕</button>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-900/30 border border-green-500/50 rounded-xl text-green-200 text-sm flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-gray-400 hover:text-white">✕</button>
        </div>
      )}

      {/* RBAC Role Assignment Card */}
      <div className="bg-casino-card p-6 rounded-xl border border-gold/30 shadow-gold-sm mb-8">
        <h2 className="text-lg font-bold text-gold font-display mb-2 flex items-center gap-2">
          <span>🛡️</span> RBAC Permission & Role Granter
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Assign elevated privileges using the stored procedure <code className="text-gold font-mono">CALL assign_role(target_id, role_name, admin_id)</code>.
        </p>

        <form onSubmit={handleAssignRole} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Target User</label>
            <select
              value={targetPlayerId}
              onChange={(e) => setTargetPlayerId(e.target.value)}
              className="w-full px-3 py-2 bg-casino-dark border border-casino-border rounded-lg text-white text-xs focus:border-gold focus:outline-none"
              required
            >
              <option value="">-- Choose a user --</option>
              {players.map(p => (
                <option key={p.player_id} value={p.player_id}>
                  #{p.player_id} &bull; {p.name} ({p.email}) &bull; Current: [{p.roles?.join(', ')}]
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Grant Role</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full px-3 py-2 bg-casino-dark border border-casino-border rounded-lg text-white text-xs focus:border-gold focus:outline-none"
            >
              <option value="PLAYER">PLAYER (Standard user)</option>
              <option value="DEALER">DEALER (Game master / Settle wagers)</option>
              <option value="ADMIN">ADMIN (Full system administrator)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-2 px-4 bg-gold text-black font-bold text-xs rounded-lg hover:opacity-90 transition-opacity shadow-gold-sm disabled:opacity-50"
            >
              {actionLoading ? 'Updating Roles...' : 'Grant Role & Permissions'}
            </button>
          </div>
        </form>
      </div>

      {/* Players Master Table */}
      <div className="bg-casino-card p-6 rounded-xl border border-casino-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white font-display">User Accounts & Role Mappings ({players.length})</h2>
          <span className="text-xs text-gray-400">Direct query on relational table <code className="text-white font-mono">PLAYER</code> & <code className="text-white font-mono">USER_ROLE</code></span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-casino-dark uppercase text-gray-400 border-b border-casino-border">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Player Details</th>
                <th className="py-3 px-4">Roles (RBAC)</th>
                <th className="py-3 px-4">Wallet Balance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Access Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-casino-border">
              {players.map((p) => (
                <tr key={p.player_id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 font-mono text-gray-400">#{p.player_id}</td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-white text-sm">{p.name}</p>
                    <p className="text-gray-400 text-xs">{p.email} &bull; {p.phone}</p>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1 items-center">
                      {p.roles?.map((r) => (
                        <span
                          key={r}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r === 'ADMIN' ? 'bg-gold/20 text-gold border border-gold/40' :
                            r === 'DEALER' ? 'bg-casino-red/20 text-casino-red-light border border-casino-red/40' :
                            'bg-white/10 text-gray-300'
                          }`}
                        >
                          {r}
                          {r !== 'PLAYER' && (
                            <button
                              onClick={() => handleRevokeRole(p.player_id, r)}
                              title={`Revoke ${r} role`}
                              disabled={actionLoading}
                              className="ml-0.5 text-gray-400 hover:text-red-400 font-normal transition-colors"
                            >
                              ✕
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-bold text-gold text-sm font-display">
                    ${parseFloat(p.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                      p.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                      p.status === 'SUSPENDED' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                      'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex gap-1.5">
                      {p.status !== 'ACTIVE' && (
                        <button
                          onClick={() => handleStatusChange(p.player_id, 'ACTIVE')}
                          disabled={actionLoading}
                          className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-[11px] font-semibold hover:bg-green-500 hover:text-black transition-colors"
                        >
                          Activate
                        </button>
                      )}
                      {p.status !== 'SUSPENDED' && (
                        <button
                          onClick={() => handleStatusChange(p.player_id, 'SUSPENDED')}
                          disabled={actionLoading}
                          className="px-2 py-1 bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded text-[11px] font-semibold hover:bg-yellow-500 hover:text-black transition-colors"
                        >
                          Suspend
                        </button>
                      )}
                      {p.status !== 'BANNED' && (
                        <button
                          onClick={() => handleStatusChange(p.player_id, 'BANNED')}
                          disabled={actionLoading}
                          className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[11px] font-semibold hover:bg-red-500 hover:text-white transition-colors"
                        >
                          Ban
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

