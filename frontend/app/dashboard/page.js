'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthProvider';
import { walletAPI, betsAPI, gamesAPI } from '../../lib/api';

function StatCard({ label, value, icon, sub }) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-2">
        <span className="stat-label">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="stat-value">{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    WON: 'badge-green',
    LOST: 'badge-red',
    PENDING: 'badge-gray',
    SETTLED: 'badge-gold',
  };
  return <span className={`badge ${map[status] ?? 'badge-gray'}`}>{status}</span>;
}

export default function DashboardPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [wallet, setWallet] = useState(null);
  const [bets, setBets] = useState([]);
  const [games, setGames] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchAll = async () => {
      try {
        const [w, b, g] = await Promise.all([
          walletAPI.balance(),
          betsAPI.history(),
          gamesAPI.list(),
        ]);
        setWallet(w.data);
        setBets(Array.isArray(b.data) ? b.data : b.data?.bets ?? []);
        setGames(Array.isArray(g.data) ? g.data : g.data?.games ?? []);
      } catch (err) {
        setError('Failed to load dashboard data. Please refresh.');
      } finally {
        setPageLoading(false);
      }
    };
    fetchAll();
  }, [isAuthenticated]);

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" style={{ width: 40, height: 40 }} />
          <p className="text-gray-500">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const recentBets = bets.slice(0, 5);
  const totalWon = bets.filter((b) => b.status === 'WON').reduce((s, b) => s + (b.payout ?? 0), 0);
  const totalBets = bets.length;
  const winRate = totalBets > 0 ? ((bets.filter((b) => b.status === 'WON').length / totalBets) * 100).toFixed(1) : 0;

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          Welcome back, <span className="text-gold">{user?.name}</span> 👋
        </h1>
        <p className="text-gray-500 mt-1">Here's your casino overview</p>
      </div>

      {error && <div className="error-box mb-6">{error}</div>}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Wallet Balance"
          icon="💰"
          value={wallet ? `₹${Number(wallet.balance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
          sub="Available funds"
        />
        <StatCard label="Total Bets" icon="🎲" value={totalBets} sub="All time" />
        <StatCard label="Win Rate" icon="🏆" value={`${winRate}%`} sub={`${bets.filter((b) => b.status === 'WON').length} wins`} />
        <StatCard
          label="Total Won"
          icon="💵"
          value={`₹${Number(totalWon).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          sub="All time payouts"
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link href="/games" className="card-hover group flex items-center gap-4 cursor-pointer">
          <span className="text-3xl group-hover:scale-110 transition-transform">🎮</span>
          <div>
            <p className="font-semibold text-white">Browse Games</p>
            <p className="text-xs text-gray-500">{games.length} active games</p>
          </div>
        </Link>
        <Link href="/wallet" className="card-hover group flex items-center gap-4 cursor-pointer">
          <span className="text-3xl group-hover:scale-110 transition-transform">💳</span>
          <div>
            <p className="font-semibold text-white">Manage Wallet</p>
            <p className="text-xs text-gray-500">Deposit or withdraw</p>
          </div>
        </Link>
        <div className="card-hover group flex items-center gap-4 cursor-default">
          <span className="text-3xl">📊</span>
          <div>
            <p className="font-semibold text-white">Bet History</p>
            <p className="text-xs text-gray-500">{totalBets} total bets placed</p>
          </div>
        </div>
      </div>

      {/* Recent bets */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0">Recent Bets</h2>
          <span className="text-xs text-gray-500">{recentBets.length} of {totalBets}</span>
        </div>
        {recentBets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-5xl mb-4">🎲</p>
            <p className="text-gray-500">No bets yet. <Link href="/games" className="text-gold hover:underline">Start playing!</Link></p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-casino-border">
                  <th className="table-header">Game</th>
                  <th className="table-header">Bet Type</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Payout</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-casino-border">
                {recentBets.map((bet) => (
                  <tr key={bet.id ?? bet._id} className="hover:bg-white/2 transition-colors">
                    <td className="table-cell font-medium text-white">{bet.game?.name ?? bet.gameName ?? '—'}</td>
                    <td className="table-cell">{bet.betType ?? '—'}</td>
                    <td className="table-cell text-gold">₹{Number(bet.amount).toLocaleString('en-IN')}</td>
                    <td className="table-cell">
                      {bet.payout != null ? (
                        <span className={bet.payout > 0 ? 'text-green-400' : 'text-gray-500'}>
                          ₹{Number(bet.payout).toLocaleString('en-IN')}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="table-cell"><StatusBadge status={bet.status} /></td>
                    <td className="table-cell text-gray-500">
                      {bet.createdAt ? new Date(bet.createdAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
