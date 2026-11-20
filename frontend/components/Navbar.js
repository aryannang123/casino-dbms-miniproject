'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, isDealer, isPlayer, isDealerOnly, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const linkClass = (href) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
      pathname === href
        ? 'text-gold bg-gold/10 border border-gold/30'
        : 'text-gray-300 hover:text-gold hover:bg-white/5'
    }`;

  return (
    <nav className="bg-casino-dark border-b border-casino-border sticky top-0 z-50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl">🎰</span>
            <span className="font-display text-xl font-bold text-gold group-hover:text-gold-light transition-colors">
              Casino<span className="text-white">DBMS</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {isAuthenticated ? (
              <>
                {!isAdmin && !isDealerOnly && <Link href="/dashboard" className={linkClass('/dashboard')}>Dashboard</Link>}
                {!isAdmin && !isDealerOnly && <Link href="/games" className={linkClass('/games')}>Games</Link>}
                {!isAdmin && <Link href="/wallet" className={linkClass('/wallet')}>Wallet</Link>}
                {isAdmin && (
                  <Link href="/admin" className={linkClass('/admin')}>
                    <span className="text-gold font-bold">Admin Console</span>
                  </Link>
                )}
                {isAdmin && (
                  <Link href="/analytics" className={linkClass('/analytics')}>
                    <span className="text-emerald-400 font-medium">MongoDB NoSQL</span>
                  </Link>
                )}
                {isDealer && (
                  <Link href="/dealer" className={linkClass('/dealer')}>
                    <span className="text-casino-red-light font-bold">Dealer Console</span>
                  </Link>
                )}
                <div className="ml-4 flex items-center gap-3 border-l border-casino-border pl-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-gray-400">Signed in as</p>
                    <p className="text-sm font-semibold text-gold truncate max-w-[120px]">{user?.name}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                    isAdmin ? 'bg-gold/20 text-gold border border-gold/40' :
                    isDealer ? 'bg-casino-red/20 text-casino-red-light border border-casino-red/40' :
                    'bg-white/10 text-gray-300 border border-white/20'
                  }`}>
                    {Array.isArray(user?.roles) ? user.roles.join(', ') : (user?.role || 'PLAYER')}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 text-sm font-medium text-gray-300 border border-casino-border rounded-md hover:border-casino-red hover:text-casino-red-light transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className={linkClass('/login')}>Login</Link>
                <Link
                  href="/register"
                  className="ml-2 px-4 py-2 bg-gold-gradient text-black font-bold text-sm rounded-md hover:opacity-90 transition-opacity shadow-gold-sm"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-md text-gray-400 hover:text-gold hover:bg-white/5 transition-colors"
          >
            <span className="text-xl">{menuOpen ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-casino-border bg-casino-dark animate-fade-in">
          <div className="px-4 py-3 flex flex-col gap-1">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 py-2 border-b border-casino-border mb-2">
                  <span className="text-gold font-semibold">{user?.name}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                    isAdmin ? 'bg-gold/20 text-gold' :
                    isDealer ? 'bg-casino-red/20 text-casino-red-light' :
                    'bg-white/10 text-gray-300'
                  }`}>{Array.isArray(user?.roles) ? user.roles.join(', ') : (user?.role || 'PLAYER')}</span>
                </div>
                {!isAdmin && !isDealerOnly && <Link href="/dashboard" className={linkClass('/dashboard')} onClick={() => setMenuOpen(false)}>Dashboard</Link>}
                {!isAdmin && !isDealerOnly && <Link href="/games" className={linkClass('/games')} onClick={() => setMenuOpen(false)}>Games</Link>}
                {!isAdmin && <Link href="/wallet" className={linkClass('/wallet')} onClick={() => setMenuOpen(false)}>Wallet</Link>}
                {isAdmin && <Link href="/admin" className={linkClass('/admin')} onClick={() => setMenuOpen(false)}>Admin Console</Link>}
                {isAdmin && <Link href="/analytics" className={linkClass('/analytics')} onClick={() => setMenuOpen(false)}>MongoDB NoSQL</Link>}
                {isDealer && <Link href="/dealer" className={linkClass('/dealer')} onClick={() => setMenuOpen(false)}>Dealer Panel</Link>}
                <button onClick={handleLogout} className="mt-2 w-full text-left px-3 py-2 text-sm text-casino-red-light hover:bg-casino-red/10 rounded-md transition-colors">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className={linkClass('/login')} onClick={() => setMenuOpen(false)}>Login</Link>
                <Link href="/register" className="px-3 py-2 bg-gold-gradient text-black font-bold text-sm rounded-md text-center" onClick={() => setMenuOpen(false)}>Register</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
