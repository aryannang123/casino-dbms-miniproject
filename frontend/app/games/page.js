'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthProvider';
import { gamesAPI } from '../../lib/api';

const GAME_THEMES = {
  BLACKJACK: { icon: '🃏', color: 'from-emerald-950 via-zinc-950 to-black', accent: 'border-emerald-500/40 text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' },
  ROULETTE:  { icon: '🎡', color: 'from-red-950 via-zinc-950 to-black', accent: 'border-red-500/40 text-red-400', badge: 'bg-red-500/20 text-red-300' },
  POKER:      { icon: '♠️', color: 'from-amber-950 via-zinc-950 to-black', accent: 'border-amber-500/40 text-gold', badge: 'bg-gold/20 text-gold' },
  BACCARAT:   { icon: '🎴', color: 'from-purple-950 via-zinc-950 to-black', accent: 'border-purple-500/40 text-purple-300', badge: 'bg-purple-500/20 text-purple-300' },
  SLOTS:      { icon: '🎰', color: 'from-yellow-950 via-zinc-950 to-black', accent: 'border-yellow-500/40 text-yellow-300', badge: 'bg-yellow-500/20 text-yellow-300' },
  CRAPS:      { icon: '🎲', color: 'from-blue-950 via-zinc-950 to-black', accent: 'border-blue-500/40 text-blue-300', badge: 'bg-blue-500/20 text-blue-300' },
  DEFAULT:    { icon: '🎮', color: 'from-zinc-900 to-black', accent: 'border-white/20 text-gray-300', badge: 'bg-white/10 text-gray-300' },
};

function CasinoGameCard({ game }) {
  const theme = GAME_THEMES[game.type?.toUpperCase()] || GAME_THEMES.DEFAULT;
  const isLive = game.status?.toUpperCase() === 'ACTIVE';

  return (
    <Link
      href={`/games/${game.id ?? game._id}`}
      className={`group relative overflow-hidden rounded-2xl border ${theme.accent} bg-gradient-to-b ${theme.color} p-6 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:border-gold/60 block`}
    >
      {/* Luxury felt subtle pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      {/* Top Bar */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="w-14 h-14 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 group-hover:border-gold/50 transition-all duration-300">
          {theme.icon}
        </div>
        <div className="flex items-center gap-2">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              LIVE TABLE
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/5 text-gray-400 border border-white/10">
              {game.status}
            </span>
          )}
        </div>
      </div>

      {/* Game Title & Table */}
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-gold font-bold">
            {game.type}
          </span>
          {game.tableName && (
            <span className="text-[11px] text-gray-400 font-mono">
              &bull; {game.tableName}
            </span>
          )}
        </div>
        <h3 className="text-xl font-bold font-display text-white mb-2 group-hover:text-gold transition-colors">
          {game.name}
        </h3>
        <p className="text-xs text-gray-400 mb-5 line-clamp-2 leading-relaxed">
          {game.description ?? 'High stakes live dealer action with verified fair odds and instant settlement.'}
        </p>
      </div>

      {/* Chip Limits Box */}
      <div className="relative z-10 p-3 rounded-xl bg-black/40 border border-white/5 grid grid-cols-2 gap-2 text-xs mb-4">
        <div>
          <span className="text-[10px] uppercase font-mono text-gray-400 block">Min Bet</span>
          <span className="text-white font-bold font-mono">₹{Number(game.minBet ?? 0).toLocaleString('en-IN')}</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-mono text-gray-400 block">Max Limit</span>
          <span className="text-gold font-bold font-mono">₹{Number(game.maxBet ?? 0).toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="relative z-10 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
        <span className="text-gray-400 font-medium">Dealer: <strong className="text-white">{game.dealerName || 'Assigned'}</strong></span>
        {isLive ? (
          <span className="font-bold text-gold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
            Take Seat →
          </span>
        ) : (
          <span className="text-gray-500">Inspect Results →</span>
        )}
      </div>
    </Link>
  );
}

export default function GamesPage() {
  const { isAuthenticated, isDealerOnly, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) router.replace('/login');
      else if (isAdmin) router.replace('/admin');
      else if (isDealerOnly) router.replace('/dealer');
    }
  }, [authLoading, isAuthenticated, isDealerOnly, isAdmin, router]);

  useEffect(() => {
    if (!isAuthenticated || isAdmin) return;
    gamesAPI.list()
      .then((res) => {
        const rawGames = res.data?.data?.games || res.data?.games || (Array.isArray(res.data) ? res.data : []);
        const normalized = rawGames.map((g) => ({
          id: g.game_id || g.id || g._id,
          name: g.name || `${g.game_type || 'Casino'} - Table ${g.table_number || ''}`,
          type: g.game_type || g.type || 'DEFAULT',
          status: g.status,
          description: g.description || `Hosted live by Dealer ${g.dealer_name || 'Staff'}`,
          dealerName: g.dealer_name,
          minBet: g.minimum_bet || g.minBet || 10,
          maxBet: g.maximum_bet || g.maxBet || 500,
          tableName: g.table_number ? `Table ${g.table_number}` : g.tableName,
        }));
        setGames(normalized);
      })
      .catch(() => setError('Failed to load live casino floor. Please refresh.'))
      .finally(() => setLoading(false));
  }, [isAuthenticated, isAdmin]);

  const filtered = games.filter((g) => {
    const matchSearch = g.name?.toLowerCase().includes(search.toLowerCase()) ||
      g.type?.toLowerCase().includes(search.toLowerCase());
    const isGameActive = g.status?.toUpperCase() === 'ACTIVE';
    let matchFilter = true;
    if (filter === 'ACTIVE') {
      matchFilter = isGameActive;
    } else if (filter === 'COMPLETED' || filter === 'INACTIVE') {
      matchFilter = !isGameActive;
    }
    return matchSearch && matchFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm">Entering Casino Floor...</p>
        </div>
      </div>
    );
  }

  const activeCount = games.filter(g => g.status?.toUpperCase() === 'ACTIVE').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-8">
      {/* Casino Floor Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-r from-[#0d2818] via-casino-card to-casino-dark p-8 shadow-2xl">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-gold/20 text-gold border border-gold/40 tracking-wider uppercase">
                VIP Gaming Floor
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                {activeCount} Live Tables Active
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-white tracking-wide">
              Casino <span className="text-gold">Live Tables</span> & Wagers
            </h1>
            <p className="text-gray-300 text-sm mt-2 max-w-xl leading-relaxed">
              Experience authentic table gaming across Blackjack, Roulette, Poker, Baccarat, and Craps. 
              Place wagers backed by instant wallet settlement and verified table constraints.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-black/50 p-4 rounded-2xl border border-gold/20 self-start md:self-auto shadow-inner">
            <div className="text-center px-3 border-r border-casino-border">
              <span className="text-xs uppercase font-mono text-gray-400">Total Games</span>
              <p className="text-2xl font-bold font-display text-white mt-0.5">{games.length}</p>
            </div>
            <div className="text-center px-3">
              <span className="text-xs uppercase font-mono text-emerald-400">Open Seats</span>
              <p className="text-2xl font-bold font-display text-gold mt-0.5">{activeCount}</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-casino-card p-4 rounded-2xl border border-casino-border">
        <div className="relative w-full sm:max-w-md">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Search by game variant or table (e.g. Poker, BJ-01)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-casino-dark border border-casino-border rounded-xl text-white text-xs focus:border-gold focus:outline-none placeholder-gray-500 transition-colors"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {['ALL', 'ACTIVE', 'COMPLETED'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filter === f
                  ? 'bg-gold text-black shadow-gold-sm'
                  : 'bg-casino-dark border border-casino-border text-gray-400 hover:text-white hover:border-gold/30'
              }`}
            >
              {f === 'ACTIVE' ? `Live Tables (${activeCount})` : f === 'COMPLETED' ? 'Past Games' : `All Tables (${games.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Game Cards Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-casino-card rounded-2xl border border-casino-border">
          <p className="text-5xl mb-4">🎲</p>
          <h3 className="text-lg font-bold text-white mb-1">No Casino Tables Found</h3>
          <p className="text-gray-400 text-xs">
            {search ? `No game matches "${search}". Try clearing your search.` : 'No tables currently meet the selected filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((game) => (
            <CasinoGameCard key={game.id ?? game._id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
