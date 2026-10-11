import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Clock,
  Share2,
  Copy,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  Swords,
  Plus,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Zap,
  Target,
  Users
} from 'lucide-react';
import { GameId, MatchData } from '../types';
import { useAuth } from '../context/AuthContext';
import { fetchUserWhatsAppChallenges, cancelPrivateRoomRpc } from '../lib/supabase';

interface WhatsAppChallengesHubProps {
  onCreateChallenge: (gameId: GameId) => void;
  onJoinRoom: () => void;
}

export const WhatsAppChallengesHub: React.FC<WhatsAppChallengesHubProps> = ({
  onCreateChallenge,
  onJoinRoom,
}) => {
  const { user, refundStakeForCancelledMatch } = useAuth();
  const [challenges, setChallenges] = useState<MatchData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'waiting' | 'in_progress' | 'all'>('waiting');
  const [now, setNow] = useState(Date.now());

  // Keep a 1-second ticker to update real-time expiration countdowns
  useEffect(() => {
    const ticker = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  const loadChallenges = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await fetchUserWhatsAppChallenges(user.id);
      setChallenges(data);
      // If there are waiting rooms expecting a friend, default to expanded so they see them immediately
      const waitingCount = data.filter((c) => c.status === 'waiting').length;
      if (waitingCount > 0 && !isExpanded) {
        setIsExpanded(true);
      }
    } catch (err) {
      console.warn('Error loading challenges in hub:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadChallenges();
    // Poll every 8 seconds for newly joined friends or created rooms
    const interval = setInterval(loadChallenges, 8000);
    return () => clearInterval(interval);
  }, [user]);

  const waitingChallenges = challenges.filter((c) => c.status === 'waiting');
  const inProgressChallenges = challenges.filter((c) => c.status === 'in_progress');
  const filteredList =
    filter === 'waiting'
      ? waitingChallenges
      : filter === 'in_progress'
      ? inProgressChallenges
      : challenges;

  const handleCopyLink = (challenge: MatchData) => {
    const url = `https://apexclash.ng/room/${challenge.room_code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(challenge.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleShareWhatsApp = (challenge: MatchData) => {
    const url = `https://apexclash.ng/room/${challenge.room_code}`;
    const text = encodeURIComponent(
      `⚔️ I'm challenging you to a ${challenge.stake_amount} Apex Coins match in ${challenge.game_id.toUpperCase()} on ApexClash! Enter my private room here: ${url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleCancelChallenge = async (challenge: MatchData) => {
    setCancellingId(challenge.id);
    try {
      // 1. Refund the locked stake back to user balance immediately
      await refundStakeForCancelledMatch(
        challenge.stake_amount,
        challenge.id,
        `WhatsApp room ${challenge.room_code} cancelled`
      );
      // 2. Cancel in Supabase / Local storage
      await cancelPrivateRoomRpc(challenge.id, challenge.room_code);
      // 3. Update local state
      setChallenges((prev) =>
        prev.map((c) => (c.id === challenge.id ? { ...c, status: 'cancelled' } : c))
      );
    } catch (err) {
      console.error('Failed to cancel challenge:', err);
    } finally {
      setCancellingId(null);
    }
  };

  const getRemainingTime = (createdAtStr: string) => {
    const createdTime = new Date(createdAtStr).getTime();
    const ageSeconds = Math.floor((now - createdTime) / 1000);
    const remainingSeconds = 15 * 60 - ageSeconds; // 15-minute window
    if (remainingSeconds <= 0) {
      return { expired: true, text: 'Expired (Auto-refunded)' };
    }
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    return {
      expired: false,
      text: `${mins}m ${secs < 10 ? '0' : ''}${secs}s`,
    };
  };

  const getGameIcon = (gameId: GameId) => {
    switch (gameId) {
      case 'whot':
        return <Zap className="w-5 h-5 text-[#F5A623]" />;
      case 'chess':
        return <Target className="w-5 h-5 text-[#F5A623]" />;
      case 'trivia':
        return <Users className="w-5 h-5 text-[#F5A623]" />;
      case 'ludo':
        return <Clock className="w-5 h-5 text-[#F5A623]" />;
      default:
        return <Swords className="w-5 h-5 text-[#F5A623]" />;
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#1C281F] via-[#141414] to-[#0A0A0A] border-2 border-[#25D366]/40 hover:border-[#25D366]/60 transition-all duration-300 shadow-2xl relative overflow-hidden">
      
      {/* TAPPABLE CARD HEADER */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setIsExpanded(!isExpanded);
          }
        }}
        className="p-5 sm:p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none group"
      >
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center text-[#25D366] shadow-lg flex-shrink-0 group-hover:scale-105 transition-transform">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-white font-mono tracking-tight">
                My WhatsApp Challenge Rooms
              </h2>
              {waitingChallenges.length > 0 ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40 animate-pulse flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                  {waitingChallenges.length} Expecting Friend to Join
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-white/[0.06] text-neutral-400 border border-white/[0.08]">
                  0 Pending Invites
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 mt-1 font-sans">
              Tap to see WhatsApp games you created, countdown timer before expiration, and friend join status.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center">
          <span className="text-xs font-mono font-bold text-[#25D366] group-hover:underline">
            {isExpanded ? 'Hide Challenges' : 'Tap to View Challenges'}
          </span>
          <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-white">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* EXPANDED CONTENT DRAWER */}
      {isExpanded && (
        <div className="p-5 sm:p-6 pt-0 border-t border-white/[0.08] space-y-5 animate-fade-in">
          
          {/* Top Bar: Filters & Quick Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/60 border border-white/[0.08] text-xs font-mono">
              <button
                type="button"
                onClick={() => setFilter('waiting')}
                className={`py-1.5 px-3 rounded-lg font-bold transition-all ${
                  filter === 'waiting'
                    ? 'bg-[#25D366] text-black shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Expecting Friend ({waitingChallenges.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('in_progress')}
                className={`py-1.5 px-3 rounded-lg font-bold transition-all ${
                  filter === 'in_progress'
                    ? 'bg-[#F5A623] text-black shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Active / Joined ({inProgressChallenges.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`py-1.5 px-3 rounded-lg font-bold transition-all ${
                  filter === 'all'
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                All ({challenges.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadChallenges}
                disabled={isLoading}
                className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/[0.08] transition-colors"
                title="Refresh challenge rooms"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => onCreateChallenge('whot')}
                className="py-1.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] text-black font-mono font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Challenge</span>
              </button>
            </div>
          </div>

          {/* LIST OF CREATED CHALLENGES */}
          {filteredList.length > 0 ? (
            <div className="space-y-3.5">
              {filteredList.map((challenge) => {
                const remaining = getRemainingTime(challenge.created_at);
                const isWaiting = challenge.status === 'waiting';

                return (
                  <div
                    key={challenge.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      isWaiting
                        ? 'bg-black/60 border-[#25D366]/40 hover:border-[#25D366]/70 shadow-lg'
                        : challenge.status === 'in_progress'
                        ? 'bg-black/60 border-[#F5A623]/40'
                        : 'bg-white/[0.02] border-white/[0.06] opacity-70'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      
                      {/* Left: Game & Status */}
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center flex-shrink-0">
                          {getGameIcon(challenge.game_id)}
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-mono font-black text-white text-base">
                              {challenge.game_id.toUpperCase()} 1v1
                            </h3>

                            {/* Status Badges */}
                            {isWaiting && !remaining.expired ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/30 flex items-center gap-1 animate-pulse">
                                <Clock className="w-3 h-3" />
                                <span>Expecting Friend to Join</span>
                              </span>
                            ) : isWaiting && remaining.expired ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                Expired (15m Limit Reached)
                              </span>
                            ) : challenge.status === 'in_progress' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30">
                                Friend Joined • In Progress
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/10 text-neutral-400">
                                {challenge.status.toUpperCase()}
                              </span>
                            )}
                          </div>

                          {/* Stake & Expiry Info */}
                          <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-neutral-300">
                            <span>
                              Stake:{' '}
                              <strong className="text-[#F5A623]">
                                {challenge.stake_amount} Coins
                              </strong>{' '}
                              (₦{(challenge.stake_amount * 10).toLocaleString()})
                            </span>
                            <span className="text-neutral-500">•</span>
                            <span>
                              Room Code:{' '}
                              <strong className="text-white bg-white/10 px-1.5 py-0.5 rounded">
                                {challenge.room_code}
                              </strong>
                            </span>

                            {/* Live Remaining Time Badge */}
                            {isWaiting && (
                              <>
                                <span className="text-neutral-500">•</span>
                                <span
                                  className={`flex items-center gap-1 font-bold ${
                                    remaining.expired ? 'text-amber-400' : 'text-[#25D366]'
                                  }`}
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Expires in: {remaining.text}</span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        {isWaiting && (
                          <>
                            {/* Share to WhatsApp */}
                            <button
                              type="button"
                              onClick={() => handleShareWhatsApp(challenge)}
                              className="py-2 px-3.5 rounded-xl font-mono font-bold text-xs bg-[#25D366] hover:bg-[#20BD5A] text-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Share Link</span>
                            </button>

                            {/* Copy Link */}
                            <button
                              type="button"
                              onClick={() => handleCopyLink(challenge)}
                              className="py-2 px-3.5 rounded-xl font-mono font-bold text-xs bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.1] transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              {copiedId === challenge.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>

                            {/* Cancel Challenge & Unlock Coins */}
                            <button
                              type="button"
                              onClick={() => handleCancelChallenge(challenge)}
                              disabled={cancellingId === challenge.id}
                              className="py-2 px-3.5 rounded-xl font-mono font-bold text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                              title="Cancel challenge and immediately refund locked coins"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>
                                {cancellingId === challenge.id
                                  ? 'Refunding...'
                                  : 'Cancel & Refund'}
                              </span>
                            </button>
                          </>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Clean Empty State */
            <div className="p-8 rounded-2xl bg-black/40 border border-white/[0.08] text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center text-[#25D366]">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white font-mono">
                {filter === 'waiting'
                  ? 'No Pending WhatsApp Challenges'
                  : 'No WhatsApp Challenges Found'}
              </h4>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto font-sans leading-relaxed">
                {filter === 'waiting'
                  ? 'You are not currently expecting any friend to join a challenge. Create a private room in Whot, Chess, Trivia or Ludo and send the link to a friend on WhatsApp!'
                  : 'Challenge your friends over WhatsApp with custom micro-stakes and 15-minute auto-refund protection.'}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onCreateChallenge('whot')}
                  className="py-2.5 px-4 rounded-xl text-xs font-mono font-bold bg-[#25D366] hover:bg-[#20BD5A] text-black transition-all flex items-center gap-1.5 mx-auto cursor-pointer shadow-lg shadow-[#25D366]/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create WhatsApp Challenge</span>
                </button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
