import Link from 'next/link';

const features = [
  { icon: '🃏', title: 'Live Table Games', desc: 'Blackjack, Poker, Baccarat & more at real casino tables' },
  { icon: '🎲', title: 'Instant Betting', desc: 'Place bets instantly with real-time odds and payouts' },
  { icon: '💰', title: 'Secure Wallet', desc: 'Fast deposits & withdrawals with transaction history' },
  { icon: '🏆', title: 'Leaderboards', desc: 'Compete with players worldwide and climb the ranks' },
];

const stats = [
  { value: '50+', label: 'Active Games' },
  { value: '10K+', label: 'Players' },
  { value: '₹1M+', label: 'Paid Out Daily' },
  { value: '24/7', label: 'Support' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Radial glow background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,215,0,0.07)_0%,_transparent_70%)] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 py-28 text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/30 rounded-full px-4 py-1.5 mb-6 text-sm text-gold font-medium">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Live games available now
          </div>

          <h1 className="text-5xl sm:text-7xl font-display font-bold mb-6 leading-tight">
            <span className="gold-shimmer">Casino</span>
            <span className="text-white"> DBMS</span>
          </h1>

          <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            The premier online casino experience. Play your favourite table games,
            manage your wallet, and track every bet — all in one platform.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-4 bg-gold-gradient text-black font-bold text-lg rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-gold"
            >
              🎰 Start Playing
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 border border-casino-border text-gray-300 font-bold text-lg rounded-xl hover:border-gold/40 hover:text-gold transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────── */}
      <section className="border-y border-casino-border bg-casino-dark/50">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {stats.map(({ value, label }) => (
              <div key={label}>
                <p className="text-3xl font-bold text-gold">{value}</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center text-white mb-12">
          Everything you need to <span className="text-gold">win big</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map(({ icon, title, desc }) => (
            <div key={title} className="card-hover group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{icon}</div>
              <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Games preview ────────────────────────────────── */}
      <section className="bg-casino-dark/50 border-y border-casino-border">
        <div className="max-w-5xl mx-auto px-4 py-20">
          <h2 className="text-3xl font-bold text-center text-white mb-4">
            Popular <span className="text-gold">Games</span>
          </h2>
          <p className="text-center text-gray-500 mb-12">
            <Link href="/games" className="text-gold hover:underline">Browse all games →</Link>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { name: 'Blackjack', emoji: '🃏', tag: 'Most Popular' },
              { name: 'Roulette', emoji: '🎡', tag: 'High Stakes' },
              { name: 'Poker', emoji: '♠️', tag: 'Live Tables' },
            ].map(({ name, emoji, tag }) => (
              <Link key={name} href="/games" className="card-hover group text-center cursor-pointer block">
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">{emoji}</div>
                <h3 className="font-bold text-white text-lg">{name}</h3>
                <span className="badge-gold mt-2 inline-block">{tag}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Ready to play?
        </h2>
        <p className="text-gray-400 mb-8">Create your account and get started in seconds.</p>
        <Link
          href="/register"
          className="inline-block px-10 py-4 bg-gold-gradient text-black font-bold text-lg rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-gold"
        >
          Create Free Account
        </Link>
      </section>
    </div>
  );
}
