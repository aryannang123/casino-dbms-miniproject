'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';
import api from '../../lib/api';

function EventDetailsBadge({ details }) {
  if (!details || Object.keys(details).length === 0) return null;

  return (
    <div className="mt-2 grid grid-cols-2 gap-1.5 p-2 bg-black/40 rounded-lg text-[11px] border border-white/5">
      {details.table && <div><span className="text-gray-400">Table:</span> <span className="text-white font-medium">{details.table}</span></div>}
      {details.dealer && <div><span className="text-gray-400">Dealer:</span> <span className="text-gold font-medium">{details.dealer}</span></div>}
      {details.playerName && <div><span className="text-gray-400">Player:</span> <span className="text-white font-medium">{details.playerName}</span></div>}
      {details.betType && <div><span className="text-gray-400">Bet Type:</span> <span className="text-purple-300 font-medium">{details.betType}</span></div>}
      {details.wager !== undefined && <div><span className="text-gray-400">Wager:</span> <span className="text-gold font-semibold">₹{Number(details.wager).toLocaleString('en-IN')}</span></div>}
      {details.payout !== undefined && Number(details.payout) > 0 && <div><span className="text-gray-400">Payout:</span> <span className="text-emerald-400 font-semibold">₹{Number(details.payout).toLocaleString('en-IN')}</span></div>}
      {details.outcome && (
        <div>
          <span className="text-gray-400">Outcome:</span>{' '}
          <span className={`font-bold ${details.outcome === 'WON' ? 'text-emerald-400' : 'text-red-400'}`}>
            {details.outcome}
          </span>
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [gameLogs, setGameLogs] = useState([]);
  const [dailyData, setDailyData] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedDate, setSelectedDate] = useState('2024-10-20');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async (dateToFetch) => {
    try {
      setLoading(true);
      setError('');
      const [logsRes, dailyRes] = await Promise.all([
        api.get('/analytics/games/all').catch(() => ({ data: { success: false, data: [] } })),
        api.get(`/analytics/daily/${dateToFetch || selectedDate}`).catch(() => ({ data: { success: false, data: null } }))
      ]);

      if (logsRes.data.success && Array.isArray(logsRes.data.data)) {
        setGameLogs(logsRes.data.data);
        if (logsRes.data.data.length > 0) {
          setSelectedGame(logsRes.data.data[0]);
        }
      }
      if (dailyRes.data.success && dailyRes.data.data) {
        setDailyData(dailyRes.data.data);
      }
    } catch (err) {
      console.warn('MongoDB Analytics fetch error:', err);
      setError('Failed to fetch NoSQL collections. Ensure MongoDB is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData(selectedDate);
    }
  }, [isAuthenticated]);

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    loadData(newDate);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold font-display text-white">MongoDB NoSQL Database Store</h1>
          <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            Document Store & Event Telemetry
          </span>
        </div>
        <p className="text-gray-400 mt-1">
          Complies with Criteria 2 & 4: High-throughput JSON Document Storage, Nested Game Events Stream & Aggregated Time-Series Analytics.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-500/50 rounded-xl text-yellow-200 text-sm">
          {error}
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-casino-card p-6 rounded-xl border border-casino-border">
          <span className="text-xs uppercase font-mono text-gray-400 block mb-1">Architecture</span>
          <h3 className="text-xl font-bold text-white mb-2">Hybrid Relational + NoSQL</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Transactional tables in MySQL (ACID) paired with MongoDB for flexible nested event streams and time-series telemetry.
          </p>
        </div>

        <div className="bg-casino-card p-6 rounded-xl border border-casino-border">
          <span className="text-xs uppercase font-mono text-gray-400 block mb-1">Collection 1: Time-Series</span>
          <h3 className="text-xl font-bold text-emerald-400 mb-2">CasinoAnalytics</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Pre-aggregated daily and hourly analytics with game breakdown, daily unique players, and peak casino traffic hours.
          </p>
        </div>

        <div className="bg-casino-card p-6 rounded-xl border border-casino-border">
          <span className="text-xs uppercase font-mono text-gray-400 block mb-1">Collection 2: Event Stream</span>
          <h3 className="text-xl font-bold text-gold mb-2">GameLog</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Nested document schema logging granular real-time table actions: player entries, bets placed, card deals, and game results.
          </p>
        </div>
      </div>

      {/* Daily Aggregated Time-Series Section */}
      <div className="bg-casino-card p-6 rounded-xl border border-casino-border mb-8 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
              <span>📊</span> Daily Casino Analytics (NoSQL Aggregation)
            </h2>
            <p className="text-xs text-gray-400">Pre-computed analytics record from collection <code className="text-white font-mono">casino_analytics</code></p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 font-medium">Select Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="px-3 py-1.5 bg-casino-dark border border-casino-border rounded-lg text-white text-xs focus:border-gold focus:outline-none"
            />
          </div>
        </div>

        {dailyData ? (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-casino-dark rounded-xl border border-casino-border">
                <span className="text-xs text-gray-400">Daily Revenue</span>
                <p className="text-2xl font-bold text-gold font-display mt-1">₹{dailyData.dailyRevenue?.toLocaleString('en-IN') || 0}</p>
              </div>
              <div className="p-4 bg-casino-dark rounded-xl border border-casino-border">
                <span className="text-xs text-gray-400">Daily Active Players</span>
                <p className="text-2xl font-bold text-white font-display mt-1">{dailyData.dailyPlayers || 0}</p>
              </div>
              <div className="p-4 bg-casino-dark rounded-xl border border-casino-border">
                <span className="text-xs text-gray-400">Peak Hour</span>
                <p className="text-2xl font-bold text-emerald-400 font-display mt-1">{dailyData.peakHour || 0}:00 hrs</p>
              </div>
              <div className="p-4 bg-casino-dark rounded-xl border border-casino-border">
                <span className="text-xs text-gray-400">Tracked Variants</span>
                <p className="text-2xl font-bold text-purple-300 font-display mt-1">{dailyData.gameTypeStats?.length || 0}</p>
              </div>
            </div>

            {/* Game Type Stats Breakdown */}
            {dailyData.gameTypeStats && (
              <div>
                <h3 className="text-xs uppercase font-mono text-gray-400 mb-3">Revenue Breakdown by Game Type</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {dailyData.gameTypeStats.map((stat) => (
                    <div key={stat.gameType} className="p-3 bg-white/5 rounded-lg border border-casino-border">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-white text-sm">{stat.gameType}</span>
                        <span className="text-gold font-mono font-semibold">₹{stat.revenue}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Games: {stat.gamesPlayed}</span>
                        <span>Players: {stat.playerCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 py-6 text-center">No aggregated time-series document found for {selectedDate}.</p>
        )}
      </div>

      {/* Game Logs & Nested Event Stream Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Available Game Logs */}
        <div className="bg-casino-card p-6 rounded-xl border border-casino-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
              <span>🗂️</span> Game Sessions (NoSQL Document Logs)
            </h2>
            <span className="text-xs text-gray-400">{gameLogs.length} logs</span>
          </div>

          {gameLogs.length === 0 ? (
            <p className="text-xs text-gray-400 py-8 text-center">
              No game logs found in MongoDB. Seed them using <code className="text-gold font-mono">node database/nosql/mongodb-setup.js</code>.
            </p>
          ) : (
            <div className="space-y-3">
              {gameLogs.map((log) => (
                <div
                  key={log.gameId}
                  onClick={() => setSelectedGame(log)}
                  className={`p-4 rounded-xl border cursor-pointer transition-colors ${
                    selectedGame?.gameId === log.gameId
                      ? 'bg-gold/10 border-gold/50 shadow-gold-sm'
                      : 'bg-casino-dark border-casino-border hover:border-gold/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-gold/20 text-gold border border-gold/40">
                        Game #{log.gameId}
                      </span>
                      <h4 className="font-bold text-white text-sm">{log.gameType} &bull; {log.tableNumber}</h4>
                    </div>
                    <span className="text-xs font-mono text-gray-400">{log.status}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-400">
                    <div>Dealer: <span className="text-white font-medium">{log.dealerName || 'Assigned'}</span></div>
                    <div>Bets: <span className="text-white font-medium">{log.totalBets || 0}</span></div>
                    <div>Wagered: <span className="text-gold font-medium">₹{log.totalWagered || 0}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Game Nested Event Stream */}
        <div className="bg-casino-card p-6 rounded-xl border border-casino-border">
          <h2 className="text-lg font-bold text-white font-display mb-2 flex items-center gap-2">
            <span>⚡</span> Nested Event Stream (Sub-document Array)
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Granular schema showing embedded sub-documents logged inside <code className="text-white font-mono">events: [...]</code>
          </p>

          {!selectedGame ? (
            <div className="text-center py-12 text-gray-400 text-xs">
              Select a game session on the left to inspect its real-time event stream.
            </div>
          ) : (
            <div>
              <div className="p-3 bg-casino-dark rounded-lg border border-casino-border mb-4 flex justify-between items-center text-xs">
                <div>
                  <span className="text-gray-400">Inspecting Game: </span>
                  <span className="text-gold font-bold">#{selectedGame.gameId} ({selectedGame.gameType})</span>
                </div>
                <div className="text-gray-400">
                  Total Events: <span className="text-emerald-400 font-bold">{selectedGame.events?.length || 0}</span>
                </div>
              </div>

              {(!selectedGame.events || selectedGame.events.length === 0) ? (
                <p className="text-xs text-gray-400 py-6 text-center">No event stream logged for this session yet.</p>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {selectedGame.events.map((ev, idx) => (
                    <div key={ev._id || idx} className="p-3 bg-casino-dark/80 rounded-lg border border-casino-border text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-gold">{ev.type}</span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {new Date(ev.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-gray-400 text-[11px]">
                        <span>Player ID: #{ev.playerId || 'N/A'}</span>
                        {ev.amount > 0 && <span className="text-emerald-400 font-semibold font-mono">₹{ev.amount}</span>}
                      </div>
                      <EventDetailsBadge details={ev.details} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
