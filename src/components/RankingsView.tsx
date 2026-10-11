import React, { useState, useEffect, useCallback } from 'react';
import {
  Crown,
  Trophy,
  Medal,
  Award,
  Zap,
  Target,
  Users,
  Clock,
  ChevronRight,
  ShieldCheck,
  User,
  Sparkles,
  Flame,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { GameId } from '../types';
import { NIGERIAN_BOT_ROSTER } from '../lib/botRoster';
import { useAuth } from '../context/AuthContext';

export interface LeaderboardEntry {
  id: string;
  username: string;
  avatar_url?: string;
  chess_rating?: number;
  whot_rating?: number;
  trivia_rating?: number;
  ludo_rating?: number;
  rating?: number;
}

export function getEloTier(rating: number): {
  tierName: string;
  badgeClass: string;
  dotColor: string;
} {
  if (rating >= 1600) {
    return {
      tierName: 'Apex Legend',
      badgeClass: 'bg-[#F5A623]/15 text-[#F5A623] border-[#F5A623]/40',
      dotColor: '#F5A623',
    };
  }
  if (rating >= 1500) {
    return {
      tierName: 'Grandmaster',
      badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/40',
      dotColor: '#A855F7',
    };
  }
  if (rating >= 1400) {
    return {
      tierName: 'Master',
      badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
      dotColor: '#10B981',
    };
  }
  if (rating >= 1300) {
    return {
      tierName: 'Diamond',
      badgeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/40',
      dotColor: '#06B6D4',
    };
  }
  return {
    tierName: 'Contender',
    badgeClass: 'bg-white/[0.05] text-white/70 border-white/[0.12]',
    dotColor: '#9CA3AF',
  };
}

export const RankingsView: React.FC = () => {
  const { user } = useAuth();
  const [selectedGame, setSelectedGame] = useState<GameId>('whot');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // User rating default
  const userRating = 1200;
  const userTier = getEloTier(userRating);

  const gamesConfig = [
    { id: 'whot' as GameId, label: 'Whot', icon: Zap },
    { id: 'chess' as GameId, label: 'Chess', icon: Target },
    { id: 'trivia' as GameId, label: 'Trivia', icon: Users },
    { id: 'ludo' as GameId, label: 'Ludo', icon: Clock },
  ];

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    setErrorNotice(null);

    const ratingCol =
      selectedGame === 'chess'
        ? 'chess_rating'
        : selectedGame === 'whot'
        ? 'whot_rating'
        : selectedGame === 'trivia'
        ? 'trivia_rating'
        : 'ludo_rating';

    try {
      const { data, error } = await supabase
        .from('bot_roster')
        .select('id, username, avatar_url, chess_rating, whot_rating, trivia_rating, ludo_rating')
        .order(ratingCol, { ascending: false })
        .limit(50);

      if (!error && data && data.length > 0) {
        const mapped = data.map((item: any) => ({
          ...item,
          rating: item[ratingCol] ?? 1200,
        }));
        setLeaderboard(mapped);
      } else {
        // Fallback to local roster sorted by the active game rating
        const fallback = [...NIGERIAN_BOT_ROSTER]
          .map((b) => ({
            ...b,
            rating: b[ratingCol] ?? 1200,
          }))
          .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
          .slice(0, 50);

        setLeaderboard(fallback);
      }
    } catch {
      // Local fallback on network error
      const fallback = [...NIGERIAN_BOT_ROSTER]
        .map((b) => ({
          ...b,
          rating: b[ratingCol] ?? 1200,
        }))
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        .slice(0, 50);

      setLeaderboard(fallback);
    } finally {
      setLoading(false);
    }
  }, [selectedGame]);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  const top3 = leaderboard.slice(0, 3);
  const ranks4to50 = leaderboard.slice(3);

  return (
    <div className="space-y-8 animate-fade-in pb-24">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#1A1813] via-[#121212] to-[#0A0A0A] border border-[#F5A623]/30 shadow-2xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5A623]/10 border border-[#F5A623]/30 text-[#F5A623] text-xs font-mono font-bold uppercase tracking-wider">
            <Crown className="w-3.5 h-3.5" />
            <span>Nigerian National Rankings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
            Top 50 Contenders
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 font-sans max-w-xl">
            Live competitive Elo ratings across Nigeria. Win staked matches to climb into Apex Legend tier.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchRankings()}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/[0.1] font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#F5A623]' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 1. Game Selector Pills */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
        {gamesConfig.map((g) => {
          const isActive = selectedGame === g.id;
          const Icon = g.icon;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelectedGame(g.id)}
              className={`px-5 py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-black shadow-lg shadow-[#F5A623]/25 font-black scale-102'
                  : 'bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.08]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{g.label}</span>
            </button>
          );
        })}
      </div>

      {/* In-Page Standing Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#F5A623]/15 via-[#1A1813] to-black border border-[#F5A623]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#F5A623] to-[#E0921A] text-black font-black flex items-center justify-center font-mono text-base shadow-lg shadow-[#F5A623]/20 flex-shrink-0">
            {(user?.username || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="text-[10px] text-[#F5A623] font-mono uppercase tracking-widest font-bold block">
              Logged-in Contender Status ({selectedGame.toUpperCase()})
            </span>
            <h3 className="text-sm sm:text-base font-black text-white font-mono mt-0.5">
              Your Rating: {userRating.toLocaleString()} Elo • {userTier.tierName}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span
            className={`px-3 py-1 rounded-full border text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${userTier.badgeClass}`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: userTier.dotColor }}
            />
            {userTier.tierName} Tier
          </span>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && leaderboard.length === 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-44 rounded-2xl bg-white/[0.02] border border-white/[0.06] animate-pulse"
              />
            ))}
          </div>
          <div className="h-96 rounded-2xl bg-white/[0.02] border border-white/[0.06] animate-pulse" />
        </div>
      ) : (
        <>
          {/* 2. Top 3 Podium Cards */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              {/* #2 Silver Podium Card */}
              {top3[1] && (
                <div className="order-2 md:order-1 p-5 rounded-2xl bg-gradient-to-b from-white/[0.06] to-black/60 border border-white/40 shadow-xl relative overflow-hidden flex flex-col justify-between h-52">
                  <div className="flex items-start justify-between">
                    <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-white font-mono font-black text-xs">
                      #2 Silver
                    </span>
                    <Medal className="w-6 h-6 text-neutral-300" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-white font-mono truncate">
                      {top3[1].username}
                    </h3>
                    <div className="text-2xl font-black text-white font-mono">
                      {top3[1].rating?.toLocaleString()} <span className="text-xs text-neutral-400 font-normal">Elo</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono pt-3 border-t border-white/10">
                    <span className="text-neutral-400">Grandmaster</span>
                    <span className="text-emerald-400 font-bold">Top 2%</span>
                  </div>
                </div>
              )}

              {/* #1 Gold Crown Podium Card (Taller & Highlighted) */}
              {top3[0] && (
                <div className="order-1 md:order-2 p-6 rounded-2xl bg-gradient-to-b from-[#F5A623]/20 via-[#1A1813] to-black border-2 border-[#F5A623] shadow-2xl shadow-[#F5A623]/20 relative overflow-hidden flex flex-col justify-between h-60 transform md:-translate-y-2">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-[#F5A623]/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="flex items-start justify-between relative z-10">
                    <span className="px-3 py-1 rounded-lg bg-[#F5A623] text-black font-mono font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                      <Crown className="w-3.5 h-3.5 fill-current" />
                      #1 Champion
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/40 text-[10px] font-mono font-bold uppercase">
                      Apex Legend
                    </span>
                  </div>

                  <div className="space-y-1 relative z-10">
                    <h3 className="text-xl sm:text-2xl font-black text-white font-mono truncate">
                      {top3[0].username}
                    </h3>
                    <div className="text-3xl sm:text-4xl font-black text-[#F5A623] font-mono">
                      {top3[0].rating?.toLocaleString()} <span className="text-xs text-[#F5A623]/70 font-normal">Elo</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono pt-3 border-t border-[#F5A623]/20 relative z-10">
                    <span className="text-neutral-300">National Leader</span>
                    <span className="text-emerald-400 font-bold">Undefeated Tier</span>
                  </div>
                </div>
              )}

              {/* #3 Bronze Podium Card */}
              {top3[2] && (
                <div className="order-3 p-5 rounded-2xl bg-gradient-to-b from-[#E0921A]/10 to-black/60 border border-[#E0921A]/60 shadow-xl relative overflow-hidden flex flex-col justify-between h-48">
                  <div className="flex items-start justify-between">
                    <span className="px-3 py-1 rounded-lg bg-[#E0921A]/20 border border-[#E0921A]/40 text-[#E0921A] font-mono font-black text-xs">
                      #3 Bronze
                    </span>
                    <Award className="w-6 h-6 text-[#E0921A]" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-white font-mono truncate">
                      {top3[2].username}
                    </h3>
                    <div className="text-2xl font-black text-white font-mono">
                      {top3[2].rating?.toLocaleString()} <span className="text-xs text-neutral-400 font-normal">Elo</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono pt-3 border-t border-[#E0921A]/20">
                    <span className="text-neutral-400">Master Tier</span>
                    <span className="text-emerald-400 font-bold">Top 5%</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Ranks 4 to 50 Leaderboard Table */}
          <div className="rounded-2xl bg-[#121212] border border-white/[0.08] shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white font-mono">
                  Contenders Leaderboard (Ranks 4 – 50)
                </h3>
                <p className="text-xs text-neutral-400 font-sans mt-0.5">
                  Synchronized with active Nigerian player ratings.
                </p>
              </div>
              <span className="text-xs font-mono text-[#F5A623] font-bold">
                {leaderboard.length} Ranked
              </span>
            </div>

            <div className="divide-y divide-white/[0.06]">
              {ranks4to50.map((item, index) => {
                const rankNum = index + 4;
                const rating = item.rating ?? 1200;
                const tier = getEloTier(rating);

                return (
                  <div
                    key={item.id || rankNum}
                    className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Rank Number & Username */}
                    <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                      <span className="font-mono font-black text-xs sm:text-sm text-neutral-400 w-8 flex-shrink-0">
                        #{rankNum}
                      </span>

                      <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.1] flex items-center justify-center font-mono font-bold text-xs text-neutral-300 flex-shrink-0">
                        {item.username.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <span className="font-bold text-white font-mono text-xs sm:text-sm truncate block">
                          {item.username}
                        </span>
                      </div>
                    </div>

                    {/* Tier Badge & Elo Rating */}
                    <div className="flex items-center gap-3 sm:gap-6 flex-shrink-0">
                      <span
                        className={`px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider hidden sm:inline-flex items-center gap-1.5 ${tier.badgeClass}`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: tier.dotColor }}
                        />
                        {tier.tierName}
                      </span>

                      <div className="text-right font-mono">
                        <span className="font-black text-sm sm:text-base text-white tabular-nums block">
                          {rating.toLocaleString()} <span className="text-[10px] text-neutral-500 font-normal">Elo</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
