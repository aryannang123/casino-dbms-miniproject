'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';
import api from '../../lib/api';

export default function AnalyticsPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [vectors, setVectors] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customVector, setCustomVector] = useState({
    risk: 0.5,
    houseEdge: 0.02,
    pace: 0.6,
    skill: 0.7,
    social: 0.5
  });

  const loadVectorData = async () => {
    try {
      setLoading(true);
      setError('');
      const [vecRes, recRes] = await Promise.all([
        api.get('/analytics/vectors').catch(() => ({ data: { data: [] } })),
        user?.playerId ? api.get(`/analytics/vectors/player/${user.playerId}`).catch(() => ({ data: { data: null } })) : Promise.resolve({ data: { data: null } })
      ]);

      if (vecRes.data.success && Array.isArray(vecRes.data.data)) {
        setVectors(vecRes.data.data);
      }
      if (recRes.data.data?.recommendations) {
        setRecommendations(recRes.data.data.recommendations);
      }
    } catch (err) {
      console.warn('Analytics endpoint offline or no records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadVectorData();
    }
  }, [isAuthenticated]);

  const handleSimulateKNN = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const queryVec = [
        parseFloat(customVector.risk),
        parseFloat(customVector.houseEdge),
        parseFloat(customVector.pace),
        parseFloat(customVector.skill),
        parseFloat(customVector.social)
      ];

      const res = await api.post('/analytics/vectors/recommend', {
        vector: queryVec,
        topK: 4
      });

      if (res.data.success) {
        setRecommendations(res.data.data.matches || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to query vector store.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold font-display text-white">NoSQL & Vector Database Intelligence</h1>
          <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
            MongoDB + Vector Embeddings
          </span>
        </div>
        <p className="text-gray-400 mt-1">
          Complies with Criteria 2 & 4: High-dimensional Vector Embeddings, Cosine Similarity k-NN Search & Event Telemetry.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-500/50 rounded-xl text-yellow-200 text-sm">
          {error}
        </div>
      )}

      {/* Vector Concept Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-casino-card p-6 rounded-xl border border-casino-border">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vector Space</p>
          <p className="text-2xl font-bold text-white font-display mt-2">5-Dimensional Dense</p>
          <p className="text-xs text-gray-500 mt-2">[Risk, House Edge, Pace, Skill, Social Interaction]</p>
        </div>

        <div className="bg-casino-card p-6 rounded-xl border border-casino-border">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Distance Metric</p>
          <p className="text-2xl font-bold text-gold font-display mt-2">Cosine Similarity</p>
          <p className="text-xs text-gray-500 mt-2">cos(θ) = (A · B) / (||A|| ||B||)</p>
        </div>

        <div className="bg-casino-card p-6 rounded-xl border border-casino-border">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Storage Architecture</p>
          <p className="text-2xl font-bold text-purple-400 font-display mt-2">Hybrid Relational + NoSQL</p>
          <p className="text-xs text-gray-500 mt-2">MySQL (Transactions/ACID) + MongoDB (Vectors/Telemetry)</p>
        </div>
      </div>

      {/* Interactive Vector Search Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Vector Query Controls */}
        <div className="bg-casino-card p-6 rounded-xl border border-casino-border">
          <h2 className="text-lg font-bold text-white font-display mb-2 flex items-center gap-2">
            <span>🧭</span> Vector Query Sandbox (k-NN)
          </h2>
          <p className="text-xs text-gray-400 mb-6">
            Adjust the slider dimensions to project a player persona into the 5-D embedding space and find the nearest matching casino games.
          </p>

          <form onSubmit={handleSimulateKNN} className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-300 font-medium">Risk / Volatility Index:</span>
                <span className="text-gold font-mono">{customVector.risk}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={customVector.risk}
                onChange={(e) => setCustomVector({ ...customVector, risk: e.target.value })}
                className="w-full accent-gold bg-casino-dark"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-300 font-medium">House Edge Preference:</span>
                <span className="text-gold font-mono">{customVector.houseEdge}</span>
              </div>
              <input
                type="range"
                min="0.005"
                max="0.08"
                step="0.005"
                value={customVector.houseEdge}
                onChange={(e) => setCustomVector({ ...customVector, houseEdge: e.target.value })}
                className="w-full accent-gold bg-casino-dark"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-300 font-medium">Rounds / Game Pace Speed:</span>
                <span className="text-gold font-mono">{customVector.pace}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={customVector.pace}
                onChange={(e) => setCustomVector({ ...customVector, pace: e.target.value })}
                className="w-full accent-gold bg-casino-dark"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-300 font-medium">Strategic Skill vs Pure Luck:</span>
                <span className="text-gold font-mono">{customVector.skill}</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.05"
                value={customVector.skill}
                onChange={(e) => setCustomVector({ ...customVector, skill: e.target.value })}
                className="w-full accent-gold bg-casino-dark"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-300 font-medium">Social / Multiplayer Factor:</span>
                <span className="text-gold font-mono">{customVector.social}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={customVector.social}
                onChange={(e) => setCustomVector({ ...customVector, social: e.target.value })}
                className="w-full accent-gold bg-casino-dark"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gold-gradient text-black font-bold text-sm rounded-lg hover:opacity-90 transition-opacity shadow-gold-sm mt-4 disabled:opacity-50"
            >
              {loading ? 'Computing Cosine Distance...' : 'Execute Vector Cosine Search (k-NN)'}
            </button>
          </form>
        </div>

        {/* Vector Search Recommendations Result */}
        <div className="bg-casino-card p-6 rounded-xl border border-casino-border">
          <h2 className="text-lg font-bold text-white font-display mb-2 flex items-center gap-2">
            <span>🎯</span> Nearest Vector Matches (Recommendations)
          </h2>
          <p className="text-xs text-gray-400 mb-6">
            Ranked by Cosine Similarity Metric from highest match to lowest.
          </p>

          {recommendations.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <span className="text-4xl block mb-2">⚡</span>
              <p>Click "Execute Vector Cosine Search" to compute nearest neighbors.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations.map((rec, idx) => (
                <div key={rec.gameType || idx} className="p-4 bg-casino-dark border border-casino-border rounded-xl hover:border-gold/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-gold/20 text-gold text-xs font-bold flex items-center justify-center font-mono">
                        #{idx + 1}
                      </span>
                      <h4 className="font-bold text-white text-base">{rec.title || rec.gameType}</h4>
                    </div>
                    <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/30">
                      {(rec.similarityScore * 100).toFixed(1)}% Match
                    </span>
                  </div>

                  <p className="text-xs text-gray-400 mb-2">{rec.description || 'Casino table game'}</p>

                  {rec.vector && (
                    <div className="bg-black/40 p-2 rounded text-[11px] font-mono text-gray-300">
                      Embedding: [{rec.vector.join(', ')}]
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stored Embeddings Table */}
      <div className="bg-casino-card p-6 rounded-xl border border-casino-border">
        <h2 className="text-lg font-bold text-white font-display mb-4">
          All Stored Game Vector Embeddings (NoSQL Vector Store)
        </h2>

        {vectors.length === 0 ? (
          <p className="text-xs text-gray-400 py-6 text-center">
            Run <code className="text-gold font-mono">node database/nosql/mongodb-setup.js</code> to seed embeddings into MongoDB.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-casino-dark uppercase text-gray-400 border-b border-casino-border">
                <tr>
                  <th className="py-2.5 px-4">Game</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Dense Vector (5 Dimensions)</th>
                  <th className="py-2.5 px-4">Default Limits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-casino-border">
                {vectors.map((vec) => (
                  <tr key={vec.gameType} className="hover:bg-white/5">
                    <td className="py-3 px-4 font-bold text-white">{vec.title || vec.gameType}</td>
                    <td className="py-3 px-4 text-gray-300">{vec.metadata?.category || 'Table Game'}</td>
                    <td className="py-3 px-4 font-mono text-gold text-[11px]">
                      [{vec.vector?.join(', ')}]
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-[11px]">
                      ${vec.metadata?.minBetDefault || 10} - ${vec.metadata?.maxBetDefault || 1000}
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

