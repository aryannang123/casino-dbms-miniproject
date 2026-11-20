'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthProvider';
import api from '../../lib/api';

export default function WalletPage() {
  const { user, isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [activeTab, setActiveTab] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (isAdmin) {
        router.replace('/admin');
      }
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);

  const fetchWalletData = async () => {
    if (isAdmin) return;
    try {
      setLoading(true);
      const [walletRes, transRes] = await Promise.all([
        api.get('/wallet'),
        api.get('/wallet/transactions?limit=25')
      ]);

      if (walletRes.data.success) {
        setWallet(walletRes.data.data);
      }
      if (transRes.data.success) {
        setTransactions(transRes.data.data.transactions || []);
      }
    } catch (err) {
      console.error('Failed to load wallet:', err);
      setError('Unable to load wallet data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchWalletData();
    }
  }, [isAuthenticated]);

  const handleTransaction = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    if (activeTab === 'withdraw' && wallet && numericAmount > parseFloat(wallet.balance)) {
      setError('Insufficient funds for this withdrawal.');
      return;
    }

    try {
      setSubmitting(true);
      const endpoint = activeTab === 'deposit' ? '/wallet/deposit' : '/wallet/withdraw';
      const res = await api.post(endpoint, {
        amount: numericAmount,
        description: description.trim() || (activeTab === 'deposit' ? 'Player Deposit' : 'Player Cashout')
      });

      if (res.data.success) {
        setSuccess(`${activeTab === 'deposit' ? 'Deposit' : 'Withdrawal'} of $${numericAmount.toFixed(2)} completed successfully!`);
        setAmount('');
        setDescription('');
        await fetchWalletData();
      }
    } catch (err) {
      setError(err.response?.data?.message || `Failed to process ${activeTab}.`);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm">Loading secure wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-white">Casino Wallet & Ledger</h1>
        <p className="text-gray-400 mt-1">Manage deposits, withdrawals, and inspect the double-entry transaction audit trail.</p>
      </div>

      {/* Balance Card & Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-casino-card to-casino-dark p-6 rounded-xl border border-gold/30 shadow-gold-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Available Balance</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-4xl font-extrabold text-gold font-display">
              ${parseFloat(wallet?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/30">Active</span>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Wallet ID: #{wallet?.wallet_id} &bull; Updated: {wallet?.last_updated ? new Date(wallet.last_updated).toLocaleTimeString() : 'Just now'}
          </p>
        </div>

        <div className="bg-casino-card p-6 rounded-xl border border-casino-border">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Transactions</p>
          <p className="text-3xl font-bold text-white mt-2 font-display">{transactions.length}</p>
          <p className="text-xs text-gray-400 mt-3">Immutable audit records in relational table</p>
        </div>

        <div className="bg-casino-card p-6 rounded-xl border border-casino-border">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Security & Compliance</p>
          <p className="text-sm text-green-400 font-semibold mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-ping"></span>
            ACID Compliant Transactions
          </p>
          <p className="text-xs text-gray-500 mt-2">Enforced by MySQL Check Constraints & Triggers</p>
        </div>
      </div>

      {/* Action Form & Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Deposit / Withdraw Panel */}
        <div className="lg:col-span-1 bg-casino-card p-6 rounded-xl border border-casino-border h-fit">
          <div className="flex rounded-lg bg-casino-dark p-1 border border-casino-border mb-6">
            <button
              onClick={() => { setActiveTab('deposit'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                activeTab === 'deposit'
                  ? 'bg-gold text-black shadow-gold-sm font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Deposit Funds
            </button>
            <button
              onClick={() => { setActiveTab('withdraw'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                activeTab === 'withdraw'
                  ? 'bg-casino-red text-white shadow font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Withdraw Funds
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-xs text-red-200">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-900/30 border border-green-500/50 rounded-lg text-xs text-green-200">
              {success}
            </div>
          )}

          <form onSubmit={handleTransaction} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Amount (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="100.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 bg-casino-dark border border-casino-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Reference Note / Description (Optional)
              </label>
              <input
                type="text"
                placeholder={activeTab === 'deposit' ? 'Card / Bank deposit' : 'Bank wire transfer'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-casino-dark border border-casino-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold text-sm"
              />
            </div>

            {/* Quick preset buttons */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {[25, 50, 100, 500].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setAmount(preset.toString())}
                  className="py-1 px-2 text-xs bg-white/5 border border-casino-border rounded hover:border-gold/50 text-gray-300 hover:text-gold transition-colors"
                >
                  +${preset}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3 rounded-lg font-bold text-sm transition-all shadow-md mt-4 ${
                activeTab === 'deposit'
                  ? 'bg-gold-gradient text-black hover:opacity-90 shadow-gold-sm'
                  : 'bg-casino-red hover:bg-casino-red/90 text-white'
              } disabled:opacity-50`}
            >
              {submitting ? 'Processing Stored Procedure...' : activeTab === 'deposit' ? 'Confirm Deposit' : 'Confirm Withdrawal'}
            </button>
          </form>
        </div>

        {/* Transaction History Table */}
        <div className="lg:col-span-2 bg-casino-card p-6 rounded-xl border border-casino-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white font-display">Audit Ledger & Transaction History</h2>
            <button
              onClick={fetchWalletData}
              className="text-xs text-gold hover:underline flex items-center gap-1"
            >
              ↻ Refresh Ledger
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">💳</p>
              <p>No transactions found for this wallet yet.</p>
              <p className="text-xs text-gray-500 mt-1">Make your first deposit to start playing casino games.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-casino-dark text-xs uppercase text-gray-400 border-b border-casino-border">
                  <tr>
                    <th className="py-3 px-4">Tx ID</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Balance Before</th>
                    <th className="py-3 px-4">Balance After</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-casino-border">
                  {transactions.map((tx) => {
                    const isCredit = ['DEPOSIT', 'PAYOUT', 'BONUS_ADJUSTMENT'].includes(tx.transaction_type);
                    return (
                      <tr key={tx.transaction_id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs text-gray-400">#{tx.transaction_id}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            tx.transaction_type === 'DEPOSIT' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            tx.transaction_type === 'PAYOUT' ? 'bg-gold/20 text-gold border border-gold/30' :
                            tx.transaction_type === 'BET' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                            'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {tx.transaction_type}
                          </span>
                        </td>
                        <td className={`py-3 px-4 font-semibold ${isCredit ? 'text-green-400' : 'text-casino-red-light'}`}>
                          {isCredit ? '+' : '-'}${Math.abs(parseFloat(tx.amount)).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-gray-400 text-xs">${parseFloat(tx.balance_before || 0).toFixed(2)}</td>
                        <td className="py-3 px-4 text-white font-medium text-xs">${parseFloat(tx.balance_after || 0).toFixed(2)}</td>
                        <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">
                          {tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

