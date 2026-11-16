'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../components/AuthProvider';
import { gamesAPI, betsAPI, walletAPI } from '../../../lib/api';

const GAME_ICONS = {
  BLACKJACK: '🃏', ROULETTE: '🎡', POKER: '♠️',
  BACCARAT: '🎴', SLOTS: '🎰', CRAPS: '🎲', DEFAULT: '🎮',
};

export default function GameDetailPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const gameId = params.id;

  const [game, setGame] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Bet form state
  const [betAmount, setBetAmount] = useState('');
  const [betType, setBetType] = useState('');
  const [betLoading, setBetLoading] = useState(false);
  const [betError, setBetError] = useState('');
  const [betSuccess, setBetSuccess] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated || !gameId) return;
    Promise.all([gamesAPI.get(gameId), walletAPI.balance()])
      .then(([g, w]) => {
        const rawGame = g.data?.data || g.data?.game || g.data;
        const normalized = {
          ...rawGame,
          id: rawGame.game_id || rawGame.id,
          name: rawGame.name || `${rawGame.game_type} - Table ${rawGame.table_number || ''}`,
          type: rawGame.game_type || rawGame.type,
          minBet: rawGame.minimum_bet || rawGame.minBet || 10,
          maxBet: rawGame.maximum_bet || rawGame.maxBet || 1000,
          tableName: rawGame.table_number ? `Table ${rawGame.table_number}` : rawGame.tableName,
        };
        setGame(normalized);
        setWallet(w.data?.data || w.data);
      })
      .catch(() => setError('Failed to load game details.'))
      .finally(() => setLoading(false));
  }, [isAuthenticated, gameId]);

  const handleBet = async (e) => {
    e.preventDefault();
    setBetError('');
    setBetSuccess('');

    const amount = parseFloat(betAmount);
    if (!betType) { setBetError('Please select a bet type.'); return; }
    if (!amount || amount <= 0) { setBetError('Enter a valid bet amount.'); return; }
    if (game?.minBet && amount < game.minBet) { setBetError(`Minimum bet is ₹${game.minBet}.`); return; }
    if (game?.maxBet && amount > game.maxBet) { setBetError(`Maximum bet is ₹${game.maxBet}.`); return; }
    if (wallet && amount > wallet.balance) { setBetError('Insufficient wallet balance.'); return; }

    setBetLoading(true);
    try {
      await betsAPI.place({ gameId, amount, betType });
      setBetSuccess(`Bet of ₹${amount} placed successfully! Good luck! 🤞`);
      setBetAmount('');
      setBetType('');
      // Refresh wallet balance
      const w = await walletAPI.balance();
      setWallet(w.data);
    } catch (err) {
      setBetError(err.response?.data?.message || 'Failed to place bet. Please try again.');
    } finally {
      setBetLoading(false);
    }
  };

  const quickAmounts = [100, 500, 1000, 5000];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="page-wrapper text-center py-20">
        <p className="text-5xl mb-4">❌</p>
        <p className="text-gray-500 mb-6">{error || 'Game not found.'}</p>
        <Link href="/games" className="text-gold hover:underline">← Back to Games</Link>
      </div>
    );
  }

  const icon = GAME_ICONS[game.type?.toUpperCase()] ?? GAME_ICONS.DEFAULT;

  // Derive bet type options from game type
  const betTypes = {
    BLACKJACK: ['Hit', 'Stand', 'Double Down', 'Split', 'Surrender'],
    ROULETTE: ['Red', 'Black', 'Even', 'Odd', 'Single Number', '1-18', '19-36', 'Dozen'],
    POKER: ['Fold', 'Call', 'Raise', 'All In'],
    BACCARAT: ['Player', 'Banker', 'Tie'],
    CRAPS: ["Pass Line", "Don't Pass", "Come", "Don't Come", "Any 7"],
    SLOTS: ['Spin'],
  }[game.type?.toUpperCase()] ?? ['Standard Bet'];

  return (
    <div className="page-wrapper">
      <Link href="/games" className="text-gray-500 hover:text-gold text-sm mb-6 inline-block transition-colors">
        ← Back to Games
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left — game info */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="card">
            <div className="flex items-start gap-4 mb-6">
              <span className="text-5xl">{icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-white">{game.name}</h1>
                  <span className={`badge ${game.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>
                    {game.status ?? 'Active'}
                  </span>
                </div>
                {game.type && <p className="text-gray-500 text-sm mt-1">Game Type: <span className="text-gold">{game.type}</span></p>}
              </div>
            </div>

            <p className="text-gray-400 leading-relaxed mb-6">
              {game.description ?? 'No description available for this game.'}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-casino-black rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">Min Bet</p>
                <p className="text-gold font-bold text-lg">₹{Number(game.minBet ?? 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-casino-black rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">Max Bet</p>
                <p className="text-gold font-bold text-lg">₹{Number(game.maxBet ?? 0).toLocaleString('en-IN')}</p>
              </div>
              {game.tableName && (
                <div className="bg-casino-black rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Table</p>
                  <p className="text-white font-bold">{game.tableName}</p>
                </div>
              )}
              {game.dealerName && (
                <div className="bg-casino-black rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Dealer</p>
                  <p className="text-white font-bold">{game.dealerName}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right — bet form */}
        <div className="flex flex-col gap-6">
          {/* Wallet balance */}
          <div className="card text-center border border-gold/20">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Your Balance</p>
            <p className="text-3xl font-bold text-gold">
              ₹{wallet ? Number(wallet.balance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
            </p>
            <Link href="/wallet" className="text-xs text-gray-500 hover:text-gold mt-1 inline-block">
              Top up →
            </Link>
          </div>

          {/* Bet form */}
          <div className="card">
            <h2 className="section-title">Place Your Bet</h2>

            <form onSubmit={handleBet} className="flex flex-col gap-4">
              {betError && <div className="error-box">{betError}</div>}
              {betSuccess && <div className="success-box">{betSuccess}</div>}

              {/* Bet type */}
              <div>
                <label className="label">Bet Type</label>
                <select
                  value={betType}
                  onChange={(e) => setBetType(e.target.value)}
                  className="input-field"
                  disabled={betLoading}
                >
                  <option value="">Select bet type…</option>
                  {betTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="label">Amount (₹)</label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder={`Min ₹${game.minBet ?? 1}`}
                  min={game.minBet ?? 1}
                  max={game.maxBet ?? undefined}
                  step="any"
                  className="input-field"
                  disabled={betLoading}
                />
              </div>

              {/* Quick amounts */}
              <div>
                <p className="text-xs text-gray-500 mb-2">Quick amounts</p>
                <div className="flex gap-2 flex-wrap">
                  {quickAmounts.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setBetAmount(String(amt))}
                      className="px-3 py-1.5 border border-casino-border rounded-lg text-xs text-gray-400 hover:border-gold/40 hover:text-gold transition-colors"
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={betLoading || game.status !== 'ACTIVE'}>
                {betLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="spinner" /> Placing bet…
                  </span>
                ) : game.status !== 'ACTIVE' ? (
                  'Game Not Active'
                ) : (
                  '🎲 Place Bet'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
