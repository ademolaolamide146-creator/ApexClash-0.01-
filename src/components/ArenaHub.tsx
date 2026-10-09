import React, { useState, useEffect } from 'react';
import { GameId } from '../types';
import {
  Swords,
  Users,
  Clock,
  Zap,
  Target,
  Copy,
  Share2,
  Trash2,
  HelpCircle,
  Check,
  Flame,
  ArrowRight,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

import whotImg from '../assets/images/game_whot_showcase_1791369306866.jpg';
import chessImg from '../assets/images/game_chess_showcase_1791369330468.jpg';
import ludoImg from '../assets/images/game_ludo_showcase_1791369354246.jpg';
import triviaImg from '../assets/images/game_trivia_showcase_1791369433515.jpg';

export const ArenaHub: React.FC<{
  onOpenRules: (gameId: GameId) => void;
  onOpenQueue: (gameId: GameId, stake: number) => void;
  onOpenCreateRoom: (gameId: GameId) => void;
  onOpenJoinRoom: () => void;
  onOpenDeposit: () => void;
}> = ({ onOpenRules, onOpenQueue, onOpenCreateRoom, onOpenJoinRoom }) => {
  const { user } = useAuth();
  const [activeChallenge, setActiveChallenge] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [cancellingChallenge, setCancellingChallenge] = useState(false);

  useEffect(() => {
    if (!user) return;

    async function fetchActiveChallenge() {
      try {
        const { data } = await supabase
          .from('matches')
          .select('*, match_participants(*)')
          .eq('is_private', true)
          .eq('status', 'waiting')
          .eq('creator_id', user!.id)
          .maybeSingle();

        if (data) {
          setActiveChallenge(data);
        }
      } catch (err) {
        console.error('Error fetching active challenge:', err);
      }
    }

    fetchActiveChallenge();
  }, [user]);

  const handleCopyLink = () => {
    if (!activeChallenge) return;
    const shareUrl = `https://apexclash.ng/room/${activeChallenge.room_code}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const handleShareWhatsApp = () => {
    if (!activeChallenge) return;
    const shareUrl = `https://apexclash.ng/room/${activeChallenge.room_code}`;
    const text = encodeURIComponent(
      `⚔️ I'm challenging you to a ${activeChallenge.stake_amount} Apex Coins match in ${activeChallenge.game_id.toUpperCase()} on ApexClash! Join my room here: ${shareUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleCancelChallenge = async () => {
    if (!activeChallenge || !user) return;
    setCancellingChallenge(true);
    try {
      await supabase
        .from('matches')
        .update({ status: 'cancelled' })
        .eq('id', activeChallenge.id);

      setActiveChallenge(null);
    } catch (err) {
      console.error('Failed to cancel challenge:', err);
    } finally {
      setCancellingChallenge(false);
    }
  };

  const gamesList = [
    {
      id: 'whot' as GameId,
      name: 'Naija Whot',
      tag: "Nigeria's #1 Skill Card Game",
      desc: "Clear your hand before your opponent. Master Hold On, Pick Two, Pick Three, Suspension and General Market cards. Zero luck — purely strategic card management.",
      badge: 'Most Popular',
      livePlayers: '142',
      pace: '3m Fast Duel',
      stakes: '25 – 500 Coins',
      engine: 'Strict Naija Rules',
      icon: Zap,
      image: whotImg,
    },
    {
      id: 'chess' as GameId,
      name: 'Speed Chess',
      tag: '5-Minute Blitz Clock',
      desc: 'Server-validated moves with FIDE rules, anti-engine cheat detection, and synchronized timers. True intellectual combat with instant payout on checkmate or resignation.',
      badge: 'High Stakes',
      livePlayers: '98',
      pace: '5m Clock per side',
      stakes: '25 – 500 Coins',
      engine: 'Stockfish Validation',
      icon: Target,
      image: chessImg,
    },
    {
      id: 'trivia' as GameId,
      name: 'Speed Trivia',
      tag: 'Naija Culture & World Knowledge',
      desc: '10 rapid-fire questions testing Nigerian history, Afrobeats, sport legends, and science. Real-time scoring based on accuracy and buzzer reaction speed.',
      badge: 'Fastest Payout',
      livePlayers: '116',
      pace: '10 Questions (15s)',
      stakes: '25 – 500 Coins',
      engine: 'Split-Second Buzzer',
      icon: Users,
      image: triviaImg,
    },
    {
      id: 'ludo' as GameId,
      name: 'Ludo Classic',
      tag: 'Tactical 4-Token Race',
      desc: 'Roll 6 to launch, cut rival tokens to reset them, and strategize token blocks. First to get all 4 tokens safely into home wins the locked pot.',
      badge: 'Classic Arena',
      livePlayers: '84',
      pace: '2-Player Quick Board',
      stakes: '25 – 500 Coins',
      engine: 'Server-Authoritative Dice',
      icon: Clock,
      image: ludoImg,
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      
      {/* 1. ARENA HERO BANNER & PRIVATE ROOM QUICK BAR */}
      <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-br from-[#1A1813] via-[#121212] to-[#0A0A0A] border border-[#F5A623]/30 relative overflow-hidden shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#F5A623]/8 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5A623]/10 border border-[#F5A623]/30 text-[#F5A623] text-xs font-mono font-bold uppercase tracking-wider">
            <Swords className="w-3.5 h-3.5" />
            <span>ApexClash PvP Matchmaking</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
            The Competitive Arena
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 font-sans max-w-xl">
            Choose your battle discipline. Challenge friends privately over WhatsApp or enter the 2-minute public liquidity queue for verified Nigerian competition.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10 flex-shrink-0">
          <button
            type="button"
            onClick={onOpenJoinRoom}
            className="py-3 px-5 rounded-xl font-mono font-bold text-xs bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.15] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            <ShieldCheck className="w-4 h-4 text-[#F5A623]" />
            <span>Enter Room Code</span>
          </button>
        </div>
      </div>

      {/* 2. "MY ACTIVE WHATSAPP CHALLENGES" CARD (Top of Arena if active) */}
      {activeChallenge && (
        <div className="p-6 md:p-7 rounded-2xl bg-gradient-to-r from-[#F5A623]/15 via-[#1A1813] to-[#0A0A0A] border-2 border-[#F5A623]/50 shadow-2xl relative overflow-hidden animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#F5A623]/20 border border-[#F5A623]/40 flex items-center justify-center text-[#F5A623]">
                <Swords className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-white font-mono">
                    Active WhatsApp Challenge
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F5A623]/20 text-[#F5A623] border border-[#F5A623]/30 animate-pulse">
                    Waiting for Opponent
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5 font-mono">
                  Room Code:{' '}
                  <span className="text-[#F5A623] font-bold text-sm">
                    {activeChallenge.room_code}
                  </span>{' '}
                  • {activeChallenge.stake_amount} Coins locked in escrow (₦{(activeChallenge.stake_amount * 10).toLocaleString()})
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="py-2.5 px-4 rounded-xl text-xs font-mono font-bold bg-[#25D366] text-black hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="py-2.5 px-4 rounded-xl text-xs font-mono font-bold bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.1] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCancelChallenge}
                disabled={cancellingChallenge}
                className="py-2.5 px-4 rounded-xl text-xs font-mono font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{cancellingChallenge ? 'Cancelling...' : 'Cancel & Refund'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. THE 4 DISCIPLINE SHOWCASE CARDS (Full Screen Width, Bold & Buttons Stacked Together) */}
      <div className="space-y-8">
        {gamesList.map((game) => (
          <div
            key={game.id}
            className="p-6 md:p-8 rounded-2xl bg-gradient-to-br from-[#1A1813] via-[#121212] to-[#0A0A0A] border border-[#F5A623]/30 hover:border-[#F5A623]/70 transition-all duration-300 relative overflow-hidden shadow-2xl w-full flex flex-col justify-between"
          >
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#F5A623]/6 rounded-full blur-3xl pointer-events-none" />

            {/* Top Showcase Artwork Banner */}
            <div className="relative h-48 sm:h-56 md:h-64 w-full rounded-2xl overflow-hidden mb-6 border border-white/[0.08] group">
              <img
                src={game.image}
                alt={game.name}
                className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent" />
              
              {/* Badges on Top of Image */}
              <div className="absolute top-3.5 left-3.5 flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-emerald-500/30 text-xs font-mono text-emerald-400 font-bold flex items-center gap-1.5 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {game.livePlayers} Contenders Live
                </span>
                <span className="px-3 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-[#F5A623]/40 text-xs font-mono text-[#F5A623] font-bold shadow-lg">
                  {game.badge}
                </span>
              </div>

              {/* Title & Tag overlaid at bottom of image */}
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-[#F5A623] font-bold block mb-1">
                    {game.tag}
                  </span>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white font-mono tracking-tight drop-shadow-lg">
                    {game.name}
                  </h3>
                </div>
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-black/80 backdrop-blur-md border border-[#F5A623]/30 flex items-center justify-center text-[#F5A623] shadow-xl flex-shrink-0">
                  <game.icon className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
              </div>
            </div>

            {/* Game Description & Features */}
            <div className="space-y-4 mb-6">
              <p className="text-xs sm:text-sm text-neutral-300 font-sans leading-relaxed">
                {game.desc}
              </p>

              {/* Game Specification Strips */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-black/50 border border-white/[0.08]">
                  <span className="text-[10px] text-neutral-500 block uppercase">Match Pace</span>
                  <span className="text-white font-bold">{game.pace}</span>
                </div>
                <div className="p-3 rounded-xl bg-black/50 border border-white/[0.08]">
                  <span className="text-[10px] text-neutral-500 block uppercase">Available Stakes</span>
                  <span className="text-[#F5A623] font-bold">{game.stakes}</span>
                </div>
                <div className="p-3 rounded-xl bg-black/50 border border-white/[0.08] col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-neutral-500 block uppercase">Rule Engine</span>
                  <span className="text-emerald-400 font-bold">{game.engine}</span>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS (Stacked directly on top of each other as requested) */}
            <div className="flex flex-col gap-3 w-full pt-2">
              
              {/* Button 1: Play Public Queue */}
              <button
                type="button"
                onClick={() => onOpenQueue(game.id, 100)}
                className="w-full py-4 px-5 rounded-xl bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-black font-mono font-black text-xs sm:text-sm uppercase tracking-wider hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 shadow-xl shadow-[#F5A623]/25 cursor-pointer"
              >
                <Swords className="w-4 h-4 fill-current flex-shrink-0" />
                <span>Play Public Queue (Find Contender)</span>
              </button>

              {/* Button 2: Challenge Friend on WhatsApp */}
              <button
                type="button"
                onClick={() => onOpenCreateRoom(game.id)}
                className="w-full py-3.5 px-5 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/40 font-mono font-bold text-xs sm:text-sm uppercase tracking-wider active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-md"
              >
                <Share2 className="w-4 h-4 flex-shrink-0" />
                <span>Challenge Friend on WhatsApp</span>
              </button>

              {/* Button 3: How It Works & Official Rules */}
              <button
                type="button"
                onClick={() => onOpenRules(game.id)}
                className="w-full py-3.5 px-5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white border border-white/[0.1] font-mono font-bold text-xs tracking-wider active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-[#F5A623] flex-shrink-0" />
                <span>How It Works & Official Rules</span>
              </button>

            </div>

          </div>
        ))}
      </div>

    </div>
  );
};

