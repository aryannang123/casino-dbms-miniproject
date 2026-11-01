'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthProvider';

export default function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    router.replace('/dashboard');
    return null;
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, phone, password, confirmPassword, dateOfBirth } = form;

    if (!name || !email || !phone || !password || !dateOfBirth) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    // Age check (18+)
    const dob = new Date(dateOfBirth);
    const ageDiff = Date.now() - dob.getTime();
    const ageDate = new Date(ageDiff);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    if (age < 18) {
      setError('You must be 18 or older to register.');
      return;
    }

    setLoading(true);
    try {
      await register({ name, email, phone, password, dateOfBirth });
      router.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,215,0,0.04)_0%,_transparent_60%)] pointer-events-none" />

      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <span className="text-5xl">🎰</span>
          <h1 className="text-3xl font-bold text-white mt-4">Create Account</h1>
          <p className="text-gray-500 mt-2">Join and start winning today</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <div className="error-box">{error}</div>}

            <div>
              <label className="label">Full Name <span className="text-casino-red-light">*</span></label>
              <input name="name" type="text" autoComplete="name" value={form.name} onChange={handleChange}
                placeholder="John Doe" className="input-field" disabled={loading} />
            </div>

            <div>
              <label className="label">Email address <span className="text-casino-red-light">*</span></label>
              <input name="email" type="email" autoComplete="email" value={form.email} onChange={handleChange}
                placeholder="you@example.com" className="input-field" disabled={loading} />
            </div>

            <div>
              <label className="label">Phone Number <span className="text-casino-red-light">*</span></label>
              <input name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={handleChange}
                placeholder="+91 98765 43210" className="input-field" disabled={loading} />
            </div>

            <div>
              <label className="label">Date of Birth <span className="text-casino-red-light">*</span></label>
              <input name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange}
                className="input-field" disabled={loading} max={new Date().toISOString().split('T')[0]} />
            </div>

            <div>
              <label className="label">Password <span className="text-casino-red-light">*</span></label>
              <input name="password" type="password" autoComplete="new-password" value={form.password} onChange={handleChange}
                placeholder="Min 6 characters" className="input-field" disabled={loading} />
            </div>

            <div>
              <label className="label">Confirm Password <span className="text-casino-red-light">*</span></label>
              <input name="confirmPassword" type="password" autoComplete="new-password" value={form.confirmPassword}
                onChange={handleChange} placeholder="Repeat password" className="input-field" disabled={loading} />
            </div>

            <button type="submit" className="btn-primary mt-2" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spinner" /> Creating account…
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="divider" />

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-gold hover:text-gold-light font-semibold">
              Sign in →
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Must be 18 or older. Gamble responsibly.
        </p>
      </div>
    </div>
  );
}
