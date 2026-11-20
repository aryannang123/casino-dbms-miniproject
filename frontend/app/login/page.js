'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthProvider';

export default function LoginPage() {
  const { login, isAuthenticated, isDealerOnly, isDealer, isAdmin } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Already logged in — redirect
  if (isAuthenticated) {
    if (isAdmin) router.replace('/admin');
    else if (isDealerOnly) router.replace('/dealer');
    else router.replace('/dashboard');
    return null;
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      const roles = Array.isArray(user?.roles) ? user.roles : (user?.role ? [user.role] : []);
      if (roles.includes('ADMIN') || user?.role === 'ADMIN') {
        router.push('/admin');
      } else if (roles.includes('DEALER') && !roles.includes('PLAYER')) {
        router.push('/dealer');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,215,0,0.04)_0%,_transparent_60%)] pointer-events-none" />

      <div className="w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-5xl">🎰</span>
          <h1 className="text-3xl font-bold text-white mt-4">Welcome back</h1>
          <p className="text-gray-500 mt-2">Sign in to continue playing</p>
        </div>

        {/* Card */}
        <div className="card">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && <div className="error-box">{error}</div>}

            <div>
              <label className="label">Email address</label>
              <input
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="input-field"
                disabled={loading}
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="input-field"
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn-primary mt-1" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spinner" /> Signing in…
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="divider" />

          <p className="text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-gold hover:text-gold-light font-semibold">
              Create one →
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          By signing in you agree to our Terms & Conditions.
        </p>
      </div>
    </div>
  );
}
