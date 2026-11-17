'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthProvider';
import { gamesAPI } from '../../lib/api';

const GAME_ICONS = {
  BLACKJACK: '🃏',
  ROULETTE: '🎡',
  POKER: '♠️',
  BACCARAT: '🎴',
  SLOTS: '🎰',
  CRAPS: '🎲',
  DEFAULT: '🎮',
};

const STATUS_MAP = {
  ACTIVE: { label: 'Active', cls: 'badge-green' },
  INACTIVE: { label: 'Inactive', cls: 'badge-gray' },
  COMPLETED: { label: 'Completed', cls: 'badge-gray' },
  CLOSED: { label: 'Closed', cls: 'badge-red' },
};

function GameCard({ game }) {
  const icon = GAME_ICONS[game.type?.toUpperCase()] ?? GAME_ICONS.DEFAULT;
  const status = STATUS_MAP[game.status?.toUpperCase()] ?? STATUS_MAP.ACTIVE;

  return (
    <Link href={`/games/${game.id ?? game._id}`} className="card-hover group cursor-pointer block">
      <div className="flex items-start justify-between mb-4">
        <span className="text-4xl group-hover:scale-110 transition-transform duration-300">{icon}</span>
        <span className={`badge ${status.cls}`}>{status.label}</span>
      </div>
      <h3 className="text-lg font-bold text-white mb-1 group-hover:text-gold transition-colors">{game.name}</h3>
      <p className="text-sm text-gray-500 mb-4 line-clamp-2">{game.description ?? 'No description available.'}</p>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Min: <span className="text-gold font-semibold">₹{Number(game.minBet ?? 0).toLocaleString('en-IN')}</span></span>
        <span>Max: <span className="text-gold font-semibold">₹{Number(game.maxBet ?? 0).toLocaleString('en-IN')}</span></span>
        {game.tableName && <span>🪑 {game.tableName}</span>}
      </div>
      <div className="mt-4 pt-4 border-t border-casino-border">
        {game.status?.toUpperCase() === 'ACTIVE' ? (
          <span className="text-xs font-semibold text-gold group-hover:underline">Play Now →</span>
        ) : (
          <span className="text-xs font-medium text-gray-500">View History →</span>
        )}
      </div>
    </Link>
  );
}

export default function GamesPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    gamesAPI.list()
      .then((res) => {
        const rawGames = res.data?.data?.games || res.data?.games || (Array.isArray(res.data) ? res.data : []);
        // Normalize fields from DB (game_id, game_type, minimum_bet, maximum_bet, table_number)
        const normalized = rawGames.map((g) => ({
          id: g.game_id || g.id || g._id,
          name: g.name || `${g.game_type || 'Casino'} - Table ${g.table_number || ''}`,
          type: g.game_type || g.type || 'DEFAULT',
          status: g.status,
          description: g.description || `Hosted by ${g.dealer_name || 'Dealer'}`,
          minBet: g.minimum_bet || g.minBet || 10,
          maxBet: g.maximum_bet || g.maxBet || 500,
          tableName: g.table_number ? `Table ${g.table_number}` : g.tableName,
        }));
        setGames(normalized);
      })
      .catch(() => setError('Failed to load games. Please refresh.'))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const filtered = games.filter((g) => {
    const matchSearch = g.name?.toLowerCase().includes(search.toLowerCase()) ||
      g.type?.toLowerCase().includes(search.toLowerCase());
    const isGameActive = g.status?.toUpperCase() === 'ACTIVE';
    let matchFilter = true;
    if (filter === 'ACTIVE') {
      matchFilter = isGameActive;
    } else if (filter === 'COMPLETED' || filter === 'INACTIVE') {
      matchFilter = !isGameActive; // Covers 'COMPLETED', 'INACTIVE', 'CLOSED'
    }
    return matchSearch && matchFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" style={{ width: 40, height: 40 }} />
          <p className="text-gray-500">Loading games…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Casino <span className="text-gold">Games</span></h1>
        <p className="text-gray-500">{games.length} games available</p>
      </div>

      {error && <div className="error-box mb-6">{error}</div>}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          type="text"
          placeholder="Search games…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field sm:max-w-xs"
        />
        <div className="flex gap-2">
          {['ALL', 'ACTIVE', 'COMPLETED'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-gold text-black'
                  : 'border border-casino-border text-gray-400 hover:border-gold/40 hover:text-gold'
              }`}
            >
              {f === 'COMPLETED' ? 'COMPLETED' : f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-gray-500 text-lg">No games found{search ? ` for "${search}"` : ''}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((game) => (
            <GameCard key={game.id ?? game._id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
