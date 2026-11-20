'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../components/AuthProvider';
import { gamesAPI, betsAPI, walletAPI } from '../../../lib/api';

const GAME_ICONS = {
  BLACKJACK: '🃏',
  ROULETTE: '🎡',
  POKER: '♠️',
  BACCARAT: '🎴',
  SLOTS: '🎰',
  CRAPS: '🎲',
  DEFAULT: '🎮',
};

const CHIPS = [
  { amount: 50, label: '50', color: 'bg-zinc-100 text-zinc-900 border-dashed border-zinc-400' },
  { amount: 100, label: '100', color: 'bg-red-600 text-white border-dashed border-red-300' },
  { amount: 500, label: '500', color: 'bg-emerald-600 text-white border-dashed border-emerald-300' },
  { amount: 1000, label: '1K', color: 'bg-zinc-900 text-gold border-dashed border-gold' },
  { amount: 5000, label: '5K', color: 'bg-gradient-to-r from-amber-400 to-yellow-600 text-black border-dashed border-white font-extrabold' }
];

export default function GameDetailPage() {
  const { isAuthenticated, isDealerOnly, isAdmin, loading: authLoading } = useAuth();
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
    if (!authLoading) {
      if (!isAuthenticated) router.replace('/login');
      else if (isAdmin) router.replace('/admin');
      else if (isDealerOnly) router.replace('/dealer');
    }
  }, [authLoading, isAuthenticated, isDealerOnly, isAdmin, router]);

  useEffect(() => {
    if (!isAuthenticated || isAdmin || !gameId) return;
    Promise.all([gamesAPI.get(gameId), walletAPI.balance()])
      .then(([g, w]) => {
        const rawGame = g.data?.data || g.data?.game || g.data;
        const minVal = Number(rawGame.minimum_bet ?? rawGame.minBet ?? 10);
        const maxVal = Number(rawGame.maximum_bet ?? rawGame.maxBet ?? 1000);
        const normalized = {
          ...rawGame,
          id: rawGame.game_id || rawGame.id,
          name: rawGame.name || `${rawGame.game_type} - Table ${rawGame.table_number || ''}`,
          type: rawGame.game_type || rawGame.type,
          minBet: minVal,
          maxBet: maxVal,
          tableName: rawGame.table_number ? `Table ${rawGame.table_number}` : rawGame.tableName,
        };
        setGame(normalized);
        setWallet(w.data?.data || w.data);
      })
      .catch(() => setError('Failed to load table session.'))
      .finally(() => setLoading(false));
  }, [isAuthenticated, isAdmin, gameId]);

  const handleBet = async (e) => {
    e.preventDefault();
    setBetError('');
    setBetSuccess('');

    const amount = parseFloat(betAmount);
    if (!betType) { setBetError('Please choose a betting option on the felt table.'); return; }
    if (!amount || amount <= 0) { setBetError('Enter a valid chip wager amount.'); return; }
    if (game?.minBet && amount < game.minBet) { setBetError(`Table minimum bet is ₹${game.minBet}.`); return; }
    if (game?.maxBet && amount > game.maxBet) { setBetError(`Table maximum bet is ₹${game.maxBet}.`); return; }
    if (wallet && amount > parseFloat(wallet.balance || 0)) { setBetError('Insufficient wallet balance. Please top up your chips.'); return; }

    setBetLoading(true);
    try {
      await betsAPI.place({ gameId, amount, betType });
      setBetSuccess(`Wager of ₹${amount} placed on [${betType}]! Good luck! 🤞`);
      setBetAmount('');
      setBetType('');
      const w = await walletAPI.balance();
      setWallet(w.data?.data || w.data);
    } catch (err) {
      setBetError(err.response?.data?.message || 'Failed to place wager. Please try again.');
    } finally {
      setBetLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm">Approaching Table...</p>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">❌</p>
        <p className="text-gray-400 mb-6 text-sm">{error || 'Table not found.'}</p>
        <Link href="/games" className="text-gold hover:underline text-xs">← Return to Casino Floor</Link>
      </div>
    );
  }

  const icon = GAME_ICONS[game.type?.toUpperCase()] ?? GAME_ICONS.DEFAULT;
  const isLive = game.status === 'ACTIVE';

  const betTypes = {
    BLACKJACK: ['Hit', 'Stand', 'Double Down', 'Split', 'Surrender'],
    ROULETTE: ['Red', 'Black', 'Even', 'Odd', 'Single Number', '1-18', '19-36', 'Dozen'],
    POKER: ['Fold', 'Call', 'Raise', 'All In'],
    BACCARAT: ['Player', 'Banker', 'Tie'],
    CRAPS: ["Pass Line", "Don't Pass", "Come", "Don't Come", "Any 7"],
    SLOTS: ['Spin'],
  }[game.type?.toUpperCase()] ?? ['Standard Bet'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-6">
      <Link href="/games" className="text-gray-400 hover:text-gold text-xs inline-flex items-center gap-1.5 transition-colors">
        ← Exit Table to Casino Floor
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: The Realistic Casino Felt Table */}
        <div className="lg:col-span-2">
          <div className="relative rounded-3xl border-4 border-amber-600/40 bg-gradient-to-b from-[#0b331e] via-[#072415] to-[#04120a] p-8 shadow-2xl overflow-hidden min-h-[520px] flex flex-col justify-between">
            {/* Table Felt Subtle Texture & Inner Golden Rail */}
            <div className="absolute inset-2 rounded-2xl border border-gold/30 pointer-events-none" />
            <div className="absolute inset-4 rounded-xl border border-dashed border-gold/15 pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

            {/* Dealer Station at Top */}
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gold/20">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-black/60 border border-gold/40 flex items-center justify-center text-4xl shadow-lg">
                  {icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold font-display text-white">{game.name}</h1>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isLive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse' :
                      'bg-white/10 text-gray-300'
                    }`}>
                      {isLive ? '● LIVE IN PLAY' : game.status}
                    </span>
                  </div>
                  <p className="text-xs text-gold/80 font-mono mt-0.5">
                    {game.tableName || 'VIP Table'} &bull; Variant: <strong className="text-white">{game.type}</strong>
                  </p>
                </div>
              </div>

              {/* Dealer Badge */}
              <div className="bg-black/50 px-4 py-2 rounded-xl border border-gold/20 flex items-center gap-3">
                <span className="text-xl">🤵</span>
                <div>
                  <span className="text-[10px] uppercase font-mono text-gray-400 block">Host Dealer</span>
                  <span className="text-xs font-bold text-white">{game.dealer_name || game.dealerName || 'House Dealer'}</span>
                </div>
              </div>
            </div>

            {/* Center Table Felt Watermark & Limits */}
            <div className="relative z-10 my-8 text-center">
              <div className="inline-block px-6 py-2 rounded-full bg-black/30 border border-gold/20 text-gold/70 font-display text-sm tracking-widest uppercase mb-4">
                CASINO ROYALE &bull; CERTIFIED FAIR PLAY
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto">
                <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-[10px] uppercase font-mono text-gray-400 block">Minimum Bet</span>
                  <span className="text-sm font-bold text-white font-mono">₹{Number(game.minBet).toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-[10px] uppercase font-mono text-gray-400 block">Maximum Bet</span>
                  <span className="text-sm font-bold text-gold font-mono">₹{Number(game.maxBet).toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-[10px] uppercase font-mono text-gray-400 block">Payout Speed</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">Instant</span>
                </div>
                <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-[10px] uppercase font-mono text-gray-400 block">Table Status</span>
                  <span className="text-sm font-bold text-white font-mono">{game.status}</span>
                </div>
              </div>
            </div>

            {/* Bottom Felt Instructions */}
            <div className="relative z-10 pt-4 border-t border-gold/20 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-400 gap-2">
              <span>Select your betting spot and chip value on the right panel to place your wager.</span>
              <span className="text-gold font-mono">House Rules Apply</span>
            </div>
          </div>
        </div>

        {/* Right Col: Casino Bet Control Panel */}
        <div className="space-y-6">
          {/* Chip Vault / Player Wallet Display */}
          <div className="bg-casino-card p-6 rounded-2xl border border-gold/40 shadow-gold-sm text-center">
            <span className="text-xs uppercase font-mono text-gray-400 tracking-wider block mb-1">
              Your Chip Balance
            </span>
            <p className="text-3xl font-extrabold text-gold font-display">
              ₹{wallet ? Number(wallet.balance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
            </p>
            <Link
              href="/wallet"
              className="text-xs text-gray-400 hover:text-gold mt-2 inline-flex items-center gap-1 transition-colors"
            >
              <span>💳</span> Deposit or Withdraw Chips →
            </Link>
          </div>

          {/* Bet Slip */}
          <div className="bg-casino-card p-6 rounded-2xl border border-casino-border shadow-xl">
            <h2 className="text-base font-bold font-display text-white mb-4 flex items-center gap-2">
              <span>🎯</span> Place Table Wager
            </h2>

            <form onSubmit={handleBet} className="space-y-5">
              {betError && (
                <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200 text-xs">
                  {betError}
                </div>
              )}

              {betSuccess && (
                <div className="p-3 bg-green-900/30 border border-green-500/50 rounded-xl text-green-200 text-xs">
                  {betSuccess}
                </div>
              )}

              {/* Bet Type Buttons */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-2">
                  Select Bet Box / Outcome
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {betTypes.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setBetType(t)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                        betType === t
                          ? 'bg-gold text-black border-2 border-white shadow-gold-sm'
                          : 'bg-casino-dark border border-casino-border text-gray-300 hover:border-gold/50 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Casino Chip Selectors */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-2">
                  Chip Denominations (Click to Set)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { amount: Number(game.minBet), label: `Min ₹${game.minBet}`, color: 'bg-zinc-800 text-gold border-gold' },
                    { amount: 25, label: '25', color: 'bg-blue-600 text-white border-dashed border-blue-300' },
                    { amount: 50, label: '50', color: 'bg-zinc-100 text-zinc-900 border-dashed border-zinc-400' },
                    { amount: 100, label: '100', color: 'bg-red-600 text-white border-dashed border-red-300' },
                    { amount: 500, label: '500', color: 'bg-emerald-600 text-white border-dashed border-emerald-300' },
                    { amount: 1000, label: '1K', color: 'bg-zinc-900 text-gold border-dashed border-gold' },
                    { amount: Number(game.maxBet), label: `Max ₹${game.maxBet}`, color: 'bg-gradient-to-r from-amber-400 to-yellow-600 text-black border-dashed border-white font-extrabold' }
                  ]
                    .filter((c, idx, arr) => c.amount >= Number(game.minBet) && c.amount <= Number(game.maxBet) && arr.findIndex(x => x.amount === c.amount) === idx)
                    .map((chip) => (
                      <button
                        key={chip.amount}
                        type="button"
                        onClick={() => setBetAmount(String(chip.amount))}
                        className={`px-3 py-1.5 rounded-full border-2 flex items-center justify-center text-xs font-bold shadow-md transform hover:scale-105 active:scale-95 transition-all ${chip.color} ${
                          betAmount === String(chip.amount) ? 'ring-4 ring-gold' : ''
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                </div>
              </div>

              {/* Custom Amount Input */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Or Custom Wager Amount (₹)
                </label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder={`Min ₹${game.minBet} - Max ₹${game.maxBet}`}
                  min={game.minBet ?? 1}
                  max={game.maxBet ?? undefined}
                  step="any"
                  className="w-full px-3 py-2 bg-casino-dark border border-casino-border rounded-xl text-white text-xs focus:border-gold focus:outline-none"
                  disabled={betLoading}
                />
              </div>

              {/* Submit Bet Button */}
              <button
                type="submit"
                disabled={betLoading || !isLive}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-black font-extrabold text-sm rounded-xl shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:opacity-95 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
              >
                {betLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Placing Wager...
                  </span>
                ) : !isLive ? (
                  'Table Currently Closed'
                ) : (
                  `🎲 Place ₹${betAmount || '0'} Bet`
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
