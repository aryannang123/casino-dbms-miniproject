'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthProvider';
import api from '../../lib/api';

const GAME_ICONS = {
  BLACKJACK: '🃏',
  ROULETTE: '🎡',
  POKER: '♠️',
  BACCARAT: '🎴',
  SLOTS: '🎰',
  CRAPS: '🎲',
  DEFAULT: '🎮'
};

function EventDetailsBadge({ details }) {
  if (!details || Object.keys(details).length === 0) return null;

  return (
    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-2 bg-black/40 rounded-lg text-[11px] border border-white/5">
      {details.table && (
        <div><span className="text-gray-400">Table:</span> <span className="text-white font-medium">{details.table}</span></div>
      )}
      {details.dealer && (
        <div><span className="text-gray-400">Dealer:</span> <span className="text-gold font-medium">{details.dealer}</span></div>
      )}
      {details.playerName && (
        <div><span className="text-gray-400">Player:</span> <span className="text-white font-medium">{details.playerName}</span></div>
      )}
      {details.betType && (
        <div><span className="text-gray-400">Bet Type:</span> <span className="text-purple-300 font-medium">{details.betType}</span></div>
      )}
      {details.wager !== undefined && (
        <div><span className="text-gray-400">Wager:</span> <span className="text-gold font-semibold">₹{Number(details.wager).toLocaleString('en-IN')}</span></div>
      )}
      {details.payout !== undefined && Number(details.payout) > 0 && (
        <div><span className="text-gray-400">Payout:</span> <span className="text-emerald-400 font-semibold">₹{Number(details.payout).toLocaleString('en-IN')}</span></div>
      )}
      {details.outcome && (
        <div>
          <span className="text-gray-400">Outcome:</span>{' '}
          <span className={`font-bold ${details.outcome === 'WON' ? 'text-emerald-400' : 'text-red-400'}`}>
            {details.outcome}
          </span>
        </div>
      )}
      {details.totalBets !== undefined && (
        <div><span className="text-gray-400">Total Bets:</span> <span className="text-white">{details.totalBets}</span></div>
      )}
    </div>
  );
}

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

  // Executive Overview & Telemetry State
  const [overview, setOverview] = useState(null);
  const [gameLogs, setGameLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [gameLogFilter, setGameLogFilter] = useState('ALL');
  const [dailyData, setDailyData] = useState(null);
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

  const loadOverviewAndLogs = async () => {
    try {
      setMongoLoading(true);
      const [ovRes, logsRes, dailyRes] = await Promise.all([
        api.get('/analytics/overview').catch(() => ({ data: { success: false, data: null } })),
        api.get('/analytics/games/all').catch(() => ({ data: { success: false, data: [] } })),
        api.get(`/analytics/daily/${selectedDate}`).catch(() => ({ data: { success: false, data: null } }))
      ]);

      if (ovRes.data.success && ovRes.data.data) {
        setOverview(ovRes.data.data);
      }
      if (logsRes.data.success && Array.isArray(logsRes.data.data)) {
        setGameLogs(logsRes.data.data);
        if (logsRes.data.data.length > 0 && !selectedLog) {
          setSelectedLog(logsRes.data.data[0]);
        }
      }
      if (dailyRes.data.success && dailyRes.data.data) {
        setDailyData(dailyRes.data.data);
      }
    } catch (err) {
      console.warn('Admin overview fetch error:', err);
    } finally {
      setMongoLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      loadPlayers();
      loadOverviewAndLogs();
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

    const selectedPlayer = players.find(p => p.player_id === parseInt(targetPlayerId));
    if (selectedPlayer?.roles?.includes('ADMIN') && newRole === 'PLAYER') {
      setError('Disallowed: An Administrator cannot be assigned the PLAYER role.');
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
        setSuccess(res.data.message || `Role ${newRole} assigned successfully!`);
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

  const selectedPlayer = players.find(p => p.player_id === parseInt(targetPlayerId));
  const isSelectedAdmin = selectedPlayer?.roles?.includes('ADMIN');

  const filteredLogs = gameLogs.filter(log => {
    if (gameLogFilter === 'ACTIVE') return log.status === 'ACTIVE';
    if (gameLogFilter === 'COMPLETED') return log.status === 'COMPLETED';
    return true;
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm">Loading Administrator Command Center...</p>
        </div>
      </div>
    );
  }

  const financials = overview?.financials || {};
  const activeGames = overview?.activeGames || [];
  const variants = overview?.variants || [];
  const netProfit = parseFloat(financials.net_profit || 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-8">
      {/* 1. Admin Identity & Welcome Banner */}
      <div className="bg-gradient-to-r from-gold/15 via-casino-card to-casino-dark p-6 rounded-2xl border border-gold/40 shadow-gold-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gold/15 border border-gold/50 flex items-center justify-center text-3xl shadow-gold-sm">
            👑
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold font-display text-white">Administrator Command Center</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gold text-black uppercase tracking-wider">
                System Admin
              </span>
            </div>
            <p className="text-gray-300 text-xs mt-1 max-w-2xl leading-relaxed">
              Logged in as <span className="text-gold font-semibold">{user?.name}</span> ({user?.email}). 
              You have master administrative authority across game lifecycles, treasury analytics, and RBAC permissions.
              <span className="text-gray-400 block mt-0.5">
                (Admins do not possess a player wallet or place wagers; full access is dedicated to casino oversight).
              </span>
            </p>
          </div>
        </div>

        <button
          onClick={() => { loadPlayers(); loadOverviewAndLogs(); }}
          className="px-4 py-2 text-xs bg-white/5 border border-casino-border rounded-lg text-gray-200 hover:text-gold hover:border-gold/50 transition-colors flex items-center gap-2 self-start md:self-auto"
        >
          <span>↻</span> Refresh Telemetry
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-gray-400 hover:text-white">✕</button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-900/30 border border-green-500/50 rounded-xl text-green-200 text-sm flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-gray-400 hover:text-white">✕</button>
        </div>
      )}

      {/* 2. Casino Financials & Real-Time Performance Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
            <span>💰</span> Casino Treasury & House Earnings
          </h2>
          <span className="text-xs text-gray-400">All-time wagers and live retention metrics</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Net Profit */}
          <div className="p-5 bg-casino-card rounded-xl border border-gold/30 shadow-gold-sm">
            <span className="text-xs uppercase font-mono text-gray-400">Net House Profit</span>
            <p className={`text-2xl font-bold font-display mt-1 ${netProfit >= 0 ? 'text-emerald-400' : 'text-gold'}`}>
              ₹{Math.abs(netProfit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              {netProfit < 0 && <span className="text-xs text-gray-400 ml-1 font-normal">(Player Payouts Lead)</span>}
            </p>
            <span className="text-[11px] text-gray-400 mt-1 block">Wagered minus player payouts</span>
          </div>

          {/* Total Wagered */}
          <div className="p-5 bg-casino-card rounded-xl border border-casino-border">
            <span className="text-xs uppercase font-mono text-gray-400">Total Volume Wagered</span>
            <p className="text-2xl font-bold text-white font-display mt-1">
              ₹{Number(financials.total_wagered || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-gray-400 mt-1 block">Across {financials.total_bets || 0} total wagers</span>
          </div>

          {/* Total Payouts */}
          <div className="p-5 bg-casino-card rounded-xl border border-casino-border">
            <span className="text-xs uppercase font-mono text-gray-400">Total Payouts Disbursed</span>
            <p className="text-2xl font-bold text-emerald-400 font-display mt-1">
              ₹{Number(financials.total_payouts || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-gray-400 mt-1 block">Paid out to winning players</span>
          </div>

          {/* Active Tables & Players */}
          <div className="p-5 bg-casino-card rounded-xl border border-casino-border flex flex-col justify-between">
            <div>
              <span className="text-xs uppercase font-mono text-gray-400">Active Tables Now</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <p className="text-2xl font-bold text-white font-display">
                  {activeGames.length} <span className="text-xs text-emerald-400 font-sans font-normal">Live Sessions</span>
                </p>
              </div>
            </div>
            <span className="text-[11px] text-gray-400 mt-2 block">
              {overview?.players?.total_players || players.length} registered player accounts
            </span>
          </div>
        </div>
      </div>

      {/* 3. Live Ongoing Games Section */}
      <div className="bg-casino-card p-6 rounded-xl border border-casino-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎲</span>
            <h2 className="text-lg font-bold text-white font-display">Live Games in Progress</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              {activeGames.length} Active Tables
            </span>
          </div>
          <span className="text-xs text-gray-400">Real-time table action hosted by dealers</span>
        </div>

        {activeGames.length === 0 ? (
          <div className="p-8 text-center bg-casino-dark rounded-xl border border-casino-border">
            <p className="text-sm text-gray-400">No active game tables at the moment.</p>
            <p className="text-xs text-gray-500 mt-1">Dealers can open new table sessions from the Dealer Console.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeGames.map((game) => (
              <div
                key={game.game_id}
                className="p-4 bg-casino-dark rounded-xl border border-emerald-500/40 relative overflow-hidden shadow-md"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
                
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{GAME_ICONS[game.game_type] || '🎮'}</span>
                    <div>
                      <h4 className="font-bold text-white text-sm">Game #{game.game_id} &bull; {game.game_type}</h4>
                      <p className="text-xs text-gold font-mono">{game.table_number}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                    ● LIVE
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-gray-300 border-t border-casino-border/60 pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Host Dealer:</span>
                    <span className="font-semibold text-white">{game.dealer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Table Limits:</span>
                    <span className="font-mono text-gray-300">₹{game.minimum_bet} - ₹{game.maximum_bet}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Wagers Placed:</span>
                    <span className="font-semibold text-white">{game.bets_count} bets</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Volume Wagered:</span>
                    <span className="font-mono text-gold font-bold">₹{Number(game.total_wagered || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Earnings Breakdown by Game Variant */}
      {variants.length > 0 && (
        <div className="bg-casino-card p-6 rounded-xl border border-casino-border">
          <h2 className="text-lg font-bold text-white font-display mb-2 flex items-center gap-2">
            <span>📊</span> Revenue & Wagers by Game Variant
          </h2>
          <p className="text-xs text-gray-400 mb-4">Relational aggregation computed across table games and settled bets</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {variants.map((v) => (
              <div key={v.game_type} className="p-4 bg-casino-dark rounded-xl border border-casino-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">{GAME_ICONS[v.game_type] || '🎮'}</span>
                  <span className="font-bold text-white text-xs">{v.game_type}</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-gray-400">
                    <span>Wagered:</span>
                    <span className="text-white font-mono font-medium">₹{Number(v.total_wagered).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Payouts:</span>
                    <span className="text-emerald-400 font-mono font-medium">₹{Number(v.total_payouts).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-casino-border">
                    <span className="text-gray-400">House Profit:</span>
                    <span className={`font-mono font-bold ${parseFloat(v.house_profit) >= 0 ? 'text-gold' : 'text-purple-300'}`}>
                      ₹{Number(v.house_profit).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 pt-1">
                    {v.games_count} games &bull; {v.bets_count} bets
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Fixed Game Log Section & NoSQL Audit Trail Explorer */}
      <div className="bg-casino-card p-6 rounded-xl border border-casino-border shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🗂️</span>
              <h2 className="text-lg font-bold text-white font-display">Game Session Documents & Live Audit Trail</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {filteredLogs.length} Documents
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Synced MongoDB NoSQL collection <code className="text-white font-mono">game_logs</code> recording live table actions and event streams.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Filter:</span>
            <button
              onClick={() => setGameLogFilter('ALL')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                gameLogFilter === 'ALL' ? 'bg-gold text-black font-bold' : 'bg-casino-dark text-gray-300 hover:text-white'
              }`}
            >
              All ({gameLogs.length})
            </button>
            <button
              onClick={() => setGameLogFilter('ACTIVE')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                gameLogFilter === 'ACTIVE' ? 'bg-emerald-500 text-black font-bold' : 'bg-casino-dark text-gray-300 hover:text-white'
              }`}
            >
              Active Only
            </button>
            <button
              onClick={() => setGameLogFilter('COMPLETED')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                gameLogFilter === 'COMPLETED' ? 'bg-purple-600 text-white font-bold' : 'bg-casino-dark text-gray-300 hover:text-white'
              }`}
            >
              Completed
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Game Sessions List */}
          <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
            {filteredLogs.length === 0 ? (
              <p className="text-xs text-gray-400 py-8 text-center">No game logs matching filter.</p>
            ) : (
              filteredLogs.map((log) => {
                const isSelected = selectedLog?.gameId === log.gameId;
                const isLive = log.status === 'ACTIVE';

                return (
                  <div
                    key={log.gameId}
                    onClick={() => setSelectedLog(log)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-gold/10 border-gold shadow-gold-sm'
                        : 'bg-casino-dark border-casino-border hover:border-gold/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{GAME_ICONS[log.gameType] || '🎮'}</span>
                        <span className="font-bold text-white text-sm">
                          Game #{log.gameId} &bull; {log.gameType}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">({log.tableNumber})</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isLive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse' :
                        'bg-white/10 text-gray-300 border border-white/20'
                      }`}>
                        {log.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-400">
                      <div>Dealer: <span className="text-white font-medium">{log.dealerName || 'Assigned'}</span></div>
                      <div>Bets: <span className="text-white font-medium">{log.totalBets || 0}</span></div>
                      <div>Wagered: <span className="text-gold font-medium">₹{Number(log.totalWagered || 0).toLocaleString('en-IN')}</span></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Inspected Session Nested Event Stream (No Raw JSON) */}
          <div className="bg-casino-dark p-5 rounded-xl border border-casino-border flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-casino-border mb-3">
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <span>⚡</span> Event Stream: {selectedLog ? `Game #${selectedLog.gameId} (${selectedLog.gameType})` : 'None Selected'}
                  </h3>
                  <span className="text-xs text-gray-400">Granular document events array</span>
                </div>
                {selectedLog && (
                  <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                    {selectedLog.events?.length || 0} Events Logged
                  </span>
                )}
              </div>

              {!selectedLog ? (
                <div className="text-center py-12 text-gray-400 text-xs">
                  Select a game session from the left to inspect its live event trail.
                </div>
              ) : (!selectedLog.events || selectedLog.events.length === 0) ? (
                <p className="text-xs text-gray-400 py-8 text-center">No nested events recorded yet.</p>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {selectedLog.events.map((ev, idx) => (
                    <div key={ev._id || idx} className="p-3 bg-casino-card rounded-lg border border-casino-border text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-mono font-bold text-xs ${
                          ev.type === 'BET_PLACED' ? 'text-gold' :
                          ev.type === 'PAYOUT_ISSUED' ? 'text-emerald-400' :
                          ev.type === 'GAME_STARTED' ? 'text-purple-300' :
                          ev.type === 'GAME_ENDED' ? 'text-blue-300' : 'text-gray-300'
                        }`}>
                          {ev.type}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : 'Recent'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-gray-400 text-[11px]">
                        <span>{ev.playerId ? `Player ID #${ev.playerId}` : 'System / Dealer Action'}</span>
                        {ev.amount > 0 && (
                          <span className="text-emerald-400 font-semibold font-mono">
                            ₹{Number(ev.amount).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>

                      <EventDetailsBadge details={ev.details} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedLog && (
              <div className="mt-4 pt-3 border-t border-casino-border/60 flex justify-between text-xs text-gray-400">
                <span>Table: <strong className="text-white">{selectedLog.tableNumber}</strong></span>
                <span>House Profit: <strong className="text-gold">₹{Number(selectedLog.houseProfit || 0).toLocaleString('en-IN')}</strong></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. RBAC Role Assignment Card (Disallows Admin as Player) */}
      <div className="bg-casino-card p-6 rounded-xl border border-gold/30 shadow-gold-sm">
        <h2 className="text-lg font-bold text-gold font-display mb-1 flex items-center gap-2">
          <span>🛡️</span> RBAC Permission & Role Granter
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Assign elevated access. Note: <span className="text-white font-semibold">Administrators cannot hold the PLAYER role</span> (enforced via database trigger and business logic).
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
              <option value="DEALER">DEALER (Game master / Settle wagers)</option>
              {!isSelectedAdmin && <option value="PLAYER">PLAYER (Standard bettor)</option>}
              <option value="ADMIN">ADMIN (Full system administrator)</option>
            </select>
            {isSelectedAdmin && (
              <p className="text-[10px] text-yellow-400 mt-1">
                ⚠️ Selected user is an Administrator; PLAYER role cannot be assigned.
              </p>
            )}
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={actionLoading || (isSelectedAdmin && newRole === 'PLAYER')}
              className="w-full py-2 px-4 bg-gold text-black font-bold text-xs rounded-lg hover:opacity-90 transition-opacity shadow-gold-sm disabled:opacity-50"
            >
              {actionLoading ? 'Updating Roles...' : 'Grant Role & Permissions'}
            </button>
          </div>
        </form>
      </div>

      {/* 7. Players Master Table */}
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
                <th className="py-3 px-4">User Details</th>
                <th className="py-3 px-4">Roles (RBAC)</th>
                <th className="py-3 px-4">Wallet Balance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Access Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-casino-border">
              {players.map((p) => {
                const isUserAdmin = p.roles?.includes('ADMIN');

                return (
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
                      {isUserAdmin ? (
                        <span className="text-xs text-gray-500 font-normal">N/A (Admin)</span>
                      ) : (
                        `₹${parseFloat(p.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      )}
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
