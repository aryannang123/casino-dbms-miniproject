'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthProvider';
import api from '../../lib/api';

export default function DealerPortal() {
  const { user, isAuthenticated, isDealer, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [games, setGames] = useState([]);
  const [tables, setTables] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [selectedDealerId, setSelectedDealerId] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameBets, setGameBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // New Game Modal Form
  const [newGameTableId, setNewGameTableId] = useState('');
  const [newGameType, setNewGameType] = useState('BLACKJACK');

  const handleTableSelect = (tableId) => {
    setNewGameTableId(tableId);
    const selected = tables.find(t => String(t.table_id) === String(tableId));
    if (selected?.game_type) {
      setNewGameType(selected.game_type);
    }
  };

  // Settle Bet Form
  const [settleBetId, setSettleBetId] = useState(null);
  const [settleOutcome, setSettleOutcome] = useState('WON');

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (!isDealer && !isAdmin) {
        router.push('/dashboard');
      }
    }
  }, [authLoading, isAuthenticated, isDealer, isAdmin, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [gamesRes, tablesRes, dealersRes] = await Promise.all([
        api.get('/games?limit=50'),
        api.get('/tables/available'),
        api.get('/games/dealers/list').catch(() => ({ data: { success: false, data: [] } }))
      ]);

      if (gamesRes.data.success) {
        setGames(gamesRes.data.data.games || []);
      }
      if (tablesRes.data.success) {
        setTables(tablesRes.data.data.tables || tablesRes.data.data || []);
      }
      if (dealersRes.data.success) {
        const dealerList = dealersRes.data.data || [];
        setDealers(dealerList);
        if (dealerList.length > 0 && !selectedDealerId) {
          setSelectedDealerId(String(dealerList[0].dealer_id));
        }
      }
    } catch (err) {
      console.error('Error loading dealer data:', err);
      setError('Failed to fetch game tables or dealer queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && (isDealer || isAdmin)) {
      loadData();
    }
  }, [isAuthenticated, isDealer, isAdmin]);

  const selectGame = async (game) => {
    setSelectedGame(game);
    setSettleBetId(null);
    try {
      const res = await api.get(`/games/${game.game_id}/bets`);
      if (res.data.success) {
        setGameBets(res.data.data.bets || res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load bets for game:', err);
    }
  };

  const handleStartGame = async (e) => {
    e.preventDefault();
    if (!newGameTableId) {
      setError('Please select a casino table.');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      setSuccess('');
      const res = await api.post('/games', {
        tableId: parseInt(newGameTableId),
        dealerId: parseInt(selectedDealerId || user.dealerId || 1),
        gameType: newGameType
      });

      if (res.data.success) {
        setSuccess('Game session initiated successfully!');
        setNewGameTableId('');
        await loadData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start game.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndGame = async (gameId) => {
    if (!confirm(`Are you sure you want to end game #${gameId}?`)) return;

    try {
      setActionLoading(true);
      const res = await api.put(`/games/${gameId}/end`);
      if (res.data.success) {
        setSuccess(`Game #${gameId} marked as COMPLETED.`);
        if (selectedGame?.game_id === gameId) {
          setSelectedGame(null);
          setGameBets([]);
        }
        await loadData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to conclude game.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickSettle = async (betId, outcome) => {
    try {
      setActionLoading(true);
      setError('');
      setSuccess('');

      const res = await api.put(`/bets/${betId}/settle`, { outcome });

      if (res.data.success) {
        const payout = res.data.data?.payout ?? 0;
        setSuccess(`Bet #${betId} settled as ${outcome}! Payout of ₹${payout} credited.`);
        setSettleBetId(null);
        if (selectedGame) {
          await selectGame(selectedGame);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to settle bet.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSettleBet = async (e) => {
    e.preventDefault();
    if (!settleBetId) return;

    try {
      setActionLoading(true);
      setError('');
      setSuccess('');

      const res = await api.put(`/bets/${settleBetId}/settle`, {
        outcome: settleOutcome
      });

      if (res.data.success) {
        const payout = res.data.data?.payout ?? 0;
        setSuccess(`Bet #${settleBetId} settled as ${settleOutcome}! Payout of ₹${payout} credited.`);
        setSettleBetId(null);
        if (selectedGame) {
          await selectGame(selectedGame);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to settle bet.');
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-casino-red/20 border-t-casino-red rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm">Loading Dealer Portal...</p>
        </div>
      </div>
    );
  }

  const activeGames = games.filter(g => g.status === 'ACTIVE');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold font-display text-white">Dealer Console</h1>
            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-casino-red/20 text-casino-red-light border border-casino-red/40">
              Role: DEALER
            </span>
          </div>
          <p className="text-gray-400 mt-1">Manage physical tables, control game lifecycles, and settle player bets.</p>
        </div>

        <button
          onClick={loadData}
          className="px-4 py-2 text-sm bg-white/5 border border-casino-border rounded-lg text-gray-300 hover:text-gold hover:border-gold/40 transition-colors self-start md:self-auto"
        >
          ↻ Refresh Games
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

      {/* Start New Game Form */}
      <div className="bg-casino-card p-6 rounded-xl border border-casino-border mb-8 shadow-md">
        <h2 className="text-lg font-bold text-white font-display mb-4 flex items-center gap-2">
          <span>🎲</span> Open New Table Session
        </h2>
        <form onSubmit={handleStartGame} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Select Available Table</label>
            <select
              value={newGameTableId}
              onChange={(e) => handleTableSelect(e.target.value)}
              className="w-full px-3 py-2.5 bg-casino-dark border border-casino-border rounded-lg text-white text-sm focus:border-gold focus:outline-none"
              required
            >
              <option value="">-- Choose a table --</option>
              {tables.map(t => (
                <option key={t.table_id} value={t.table_id}>
                  {t.table_number} ({t.game_type}) &bull; Limits: ₹{t.minimum_bet} - ₹{t.maximum_bet}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Assigned Game Variant</label>
            <input
              type="text"
              value={newGameType}
              readOnly
              className="w-full px-3 py-2.5 bg-white/5 border border-casino-border rounded-lg text-gold font-semibold text-sm cursor-not-allowed focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Select Dealer</label>
            <select
              value={selectedDealerId}
              onChange={(e) => setSelectedDealerId(e.target.value)}
              className="w-full px-3 py-2.5 bg-casino-dark border border-casino-border rounded-lg text-white text-sm focus:border-gold focus:outline-none"
              required
            >
              {dealers.map(d => (
                <option key={d.dealer_id} value={d.dealer_id}>
                  {d.name} ({d.employee_id})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-2.5 px-4 bg-gold-gradient text-black font-bold text-sm rounded-lg hover:opacity-90 transition-opacity shadow-gold-sm disabled:opacity-50"
            >
              {actionLoading ? 'Initializing...' : '+ Start Game Session'}
            </button>
          </div>
        </form>
      </div>

      {/* Main Grid: Active Games & Selected Game's Bets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Games List */}
        <div className="bg-casino-card p-6 rounded-xl border border-casino-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white font-display">Active Table Sessions ({activeGames.length})</h2>
          </div>

          {activeGames.length === 0 ? (
            <p className="text-gray-400 text-sm py-8 text-center">No active sessions. Start a game using the form above.</p>
          ) : (
            <div className="space-y-3">
              {activeGames.map((game) => (
                <div
                  key={game.game_id}
                  onClick={() => selectGame(game)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedGame?.game_id === game.game_id
                      ? 'bg-gold/10 border-gold shadow-gold-sm'
                      : 'bg-casino-dark border-casino-border hover:border-gold/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {game.game_type === 'BLACKJACK' ? '🃏' :
                         game.game_type === 'ROULETTE' ? '🎡' :
                         game.game_type === 'POKER' ? '♣️' : '🎲'}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-base">{game.game_type}</h3>
                          <span className="text-xs text-gold font-mono">Game #{game.game_id}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Table: <span className="text-white font-medium">{game.table_number || `Table #${game.table_id}`}</span> &bull; Dealer: {game.dealer_name || user.name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEndGame(game.game_id);
                        }}
                        className="px-3 py-1 bg-casino-red/20 text-casino-red-light border border-casino-red/40 rounded text-xs font-bold hover:bg-casino-red hover:text-white transition-colors"
                      >
                        End Game
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Game Details & Pending Bets */}
        <div className="bg-casino-card p-6 rounded-xl border border-casino-border">
          <h2 className="text-lg font-bold text-white font-display mb-4">
            {selectedGame ? `Manage Bets: Game #${selectedGame.game_id} (${selectedGame.game_type})` : 'Select a Game to Settle Bets'}
          </h2>

          {!selectedGame ? (
            <div className="text-center py-12 text-gray-400">
              <span className="text-4xl block mb-2">👈</span>
              <p>Click on any active game session on the left to inspect and settle player wagers.</p>
            </div>
          ) : (
            <div>
              {gameBets.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">No bets placed on this game session yet.</p>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-casino-dark uppercase text-gray-400 border-b border-casino-border">
                        <tr>
                          <th className="py-2.5 px-3">Bet ID</th>
                          <th className="py-2.5 px-3">Player</th>
                          <th className="py-2.5 px-3">Wager</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-casino-border">
                        {gameBets.map((bet) => (
                          <tr key={bet.bet_id} className="hover:bg-white/5">
                            <td className="py-2.5 px-3 font-mono">#{bet.bet_id}</td>
                            <td className="py-2.5 px-3 text-white font-medium">{bet.player_name || `Player #${bet.player_id}`}</td>
                            <td className="py-2.5 px-3 text-gold font-bold">₹{parseFloat(bet.amount).toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-gray-300">{bet.bet_type}</td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                bet.outcome === 'PENDING' ? 'bg-yellow-500/20 text-yellow-300' :
                                bet.outcome === 'WON' ? 'bg-green-500/20 text-green-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {bet.outcome}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {bet.outcome === 'PENDING' ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleQuickSettle(bet.bet_id, 'WON')}
                                    disabled={actionLoading}
                                    title="Mark as WON (Auto-credits 2x payout)"
                                    className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/40 rounded hover:bg-green-500 hover:text-black font-bold text-[11px] transition-colors disabled:opacity-40"
                                  >
                                    ✓ Won
                                  </button>
                                  <button
                                    onClick={() => handleQuickSettle(bet.bet_id, 'LOST')}
                                    disabled={actionLoading}
                                    title="Mark as LOST"
                                    className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/40 rounded hover:bg-red-500 hover:text-white font-bold text-[11px] transition-colors disabled:opacity-40"
                                  >
                                    ✗ Lost
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSettleBetId(bet.bet_id);
                                      setSettleOutcome('WON');
                                    }}
                                    disabled={actionLoading}
                                    title="More settlement options"
                                    className="px-2 py-1 bg-white/5 text-gray-300 border border-casino-border rounded hover:border-gold hover:text-gold text-[11px] transition-colors disabled:opacity-40"
                                  >
                                    Options
                                  </button>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-[11px] font-mono">
                                  ₹{parseFloat(bet.payout || 0).toFixed(2)}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Settle Bet Modal Sub-form */}
                  {settleBetId && (() => {
                    const selectedBet = gameBets.find(b => b.bet_id === settleBetId);
                    const wagerAmt = selectedBet ? parseFloat(selectedBet.amount) : 0;
                    const isBlackjack = selectedBet?.bet_type?.toUpperCase() === 'BLACKJACK';
                    const autoPayout = settleOutcome === 'WON' 
                      ? (isBlackjack ? wagerAmt * 2.5 : wagerAmt * 2.0).toFixed(2)
                      : settleOutcome === 'CANCELLED' 
                        ? wagerAmt.toFixed(2)
                        : '0.00';

                    return (
                      <div className="p-4 bg-casino-dark border border-gold/50 rounded-xl mt-4 animate-fade-in">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-gold">
                            Settle Bet #{settleBetId} ({selectedBet?.player_name || `Player #${selectedBet?.player_id}`}) - Wager: ₹{wagerAmt.toFixed(2)}
                          </h4>
                          <button onClick={() => setSettleBetId(null)} className="text-xs text-gray-400 hover:text-white">✕</button>
                        </div>

                        <form onSubmit={handleSettleBet} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] text-gray-400 mb-1">Outcome</label>
                            <select
                              value={settleOutcome}
                              onChange={(e) => setSettleOutcome(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-casino-card border border-casino-border rounded text-white text-xs"
                            >
                              <option value="WON">WON (Player Wins)</option>
                              <option value="LOST">LOST (House Wins)</option>
                              <option value="CANCELLED">PUSH / CANCELLED (Refund)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] text-gray-400 mb-1">
                              Settlement Payout (Auto-Calculated)
                            </label>
                            <div className="w-full px-2.5 py-1.5 bg-white/5 border border-casino-border rounded text-gold font-bold text-xs flex items-center justify-between">
                              <span>₹{autoPayout}</span>
                              <span className="text-[10px] text-gray-400 font-normal">
                                {settleOutcome === 'WON' ? (isBlackjack ? '2.5x Blackjack' : '2x Wager') : settleOutcome === 'CANCELLED' ? 'Full Refund' : 'House Wins'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-end">
                            <button
                              type="submit"
                              disabled={actionLoading}
                              className="w-full py-1.5 px-3 bg-gold text-black font-bold text-xs rounded hover:opacity-90 shadow-gold-sm disabled:opacity-50"
                            >
                              {actionLoading ? 'Settling...' : 'Confirm & Settle'}
                            </button>
                          </div>
                        </form>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

