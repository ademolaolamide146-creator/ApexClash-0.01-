import React, { useState } from 'react';
import {
  ArrowRight,
  ShieldAlert,
  Coins,
  Share2,
  Clock,
  Scale,
  Sparkles,
  CheckCircle2,
  Zap,
  Award,
  ChevronRight,
  Percent,
  Lock,
  ArrowUpRight,
} from 'lucide-react';
import { GameId, StakeTier, LegalDocType } from '../types';

// Asset paths
import heroImg from '../assets/images/apex_hero_arena_1791369206920.jpg';
import whotImg from '../assets/images/game_whot_showcase_1791369306866.jpg';
import chessImg from '../assets/images/game_chess_showcase_1791369330468.jpg';
import ludoImg from '../assets/images/game_ludo_showcase_1791369354246.jpg';
import triviaImg from '../assets/images/game_trivia_showcase_1791369433515.jpg';

interface LandingPageProps {
  onOpenAuth: (mode: 'signin' | 'signup') => void;
  onOpenWhatsAppModal: () => void;
  onOpenLegalGate: () => void;
  onOpenDoc: (doc: LegalDocType) => void;
  onQuickPlay: (gameId: GameId, stake: number) => void;
}

const STAKE_TIERS: StakeTier[] = [
  { coins: 25, naira: 250, label: 'Micro Starter' },
  { coins: 50, naira: 500, label: 'Standard Dual' },
  { coins: 100, naira: 1000, popular: true, label: 'Pro Contender' },
  { coins: 200, naira: 2000, label: 'Master Arena' },
  { coins: 500, naira: 5000, label: 'Apex High Stake' },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenAuth,
  onOpenWhatsAppModal,
  onOpenLegalGate,
  onOpenDoc,
  onQuickPlay,
}) => {
  const [selectedStake, setSelectedStake] = useState<number>(100);
  const [activeGameTab, setActiveGameTab] = useState<GameId>('whot');

  const selectedTier = STAKE_TIERS.find((t) => t.coins === selectedStake) || STAKE_TIERS[2];
  const pot = selectedTier.coins * 2;
  const winnerPayout = Math.floor(pot * 0.9);
  const rake = pot - winnerPayout;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-neutral-100 flex flex-col">
      
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden border-b border-white/[0.06]">
        {/* Ambient lighting glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#F5A623]/8 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Proposition & CTA */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Compliance & Skill kicker */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] font-mono font-bold">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  18+ ONLY
                </span>
                <span className="text-neutral-500" aria-hidden="true">·</span>
                <span className="text-neutral-400 font-medium">Non-Gambling Skill Gaming</span>
                <span className="text-neutral-500" aria-hidden="true">·</span>
                <span className="text-neutral-400 font-mono">100 AC = ₦1,000</span>
              </div>

              {/* Dominant Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.08] text-balance">
                Stake. Outsmart. <br />
                <span className="bg-gradient-to-r from-[#F5A623] via-[#FDD385] to-[#E0921A] bg-clip-text text-transparent">
                  Win Real Naira
                </span>{' '}
                in Nigeria.
              </h1>

              {/* Value Proposition */}
              <p className="text-base sm:text-lg text-neutral-300 max-w-xl leading-relaxed">
                Skill-based peer-to-peer competition across Naija Whot, Chess, Speed Trivia, and Ludo with instant Paystack-ready withdrawals. No luck, no house edge—pure strategy.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="py-3.5 px-7 rounded-xl font-black text-sm bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-[#0A0A0A] hover:brightness-105 active:scale-[0.98] transition-all shadow-xl shadow-[#F5A623]/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Join ApexClash Arena</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
                <button
                  type="button"
                  onClick={onOpenWhatsAppModal}
                  className="py-3.5 px-6 rounded-xl font-bold text-sm bg-white/[0.04] hover:bg-white/[0.08] text-neutral-200 border border-white/[0.12] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-[#25D366]" />
                  <span>Create WhatsApp Room</span>
                </button>
              </div>

              {/* Proof / Assurance inline */}
              <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-neutral-400 font-mono">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#F5A623]" />
                  <span>10% Flat Victory Rake</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>0% Fee on Draws (100% Refund)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#00C3F7]" />
                  <span>Paystack-Ready Payouts</span>
                </div>
              </div>

            </div>

            {/* Right Column: High-Impact Visual Asset */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl overflow-hidden border border-white/[0.1] bg-white/[0.02] shadow-2xl group">
                <img
                  src={heroImg}
                  alt="ApexClash high-stakes competitive esports table in Nigeria with golden coins and cards"
                  referrerPolicy="no-referrer"
                  className="w-full h-auto aspect-[16/10] object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-mono text-[#F5A623] uppercase tracking-wider block">
                        Live Matchmaking Active
                      </span>
                      <span className="text-sm font-bold text-white">
                        Lagos · Abuja · Port Harcourt · Ibadan
                      </span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-xs text-neutral-400 block">Minimum Stake</span>
                      <span className="text-sm font-bold text-emerald-400">25 Coins (₦250)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 2. MICRO-STAKES & ECONOMY BAR (Section 2) */}
      <section id="economics" className="py-16 md:py-24 border-b border-white/[0.06] bg-black/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-mono uppercase tracking-wider text-[#F5A623] font-semibold block mb-2">
              Micro-Stakes & Transparent Economics
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              100 Apex Coins = ₦1,000 NGN
            </h2>
            <p className="text-sm text-neutral-400 mt-2">
              Every coin is fixed at ₦10. Low barrier micro-stakes mean high adrenaline with disciplined risk management.
            </p>
          </div>

          {/* Micro-Stake Badges Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mb-8">
            {STAKE_TIERS.map((tier) => (
              <button
                key={tier.coins}
                type="button"
                onClick={() => setSelectedStake(tier.coins)}
                className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                  selectedStake === tier.coins
                    ? 'bg-[#F5A623]/15 border-[#F5A623] shadow-lg shadow-[#F5A623]/10 ring-1 ring-[#F5A623]'
                    : 'bg-white/[0.03] border-white/[0.08] hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono text-neutral-400 uppercase">
                    {tier.label}
                  </span>
                  {tier.popular && (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#F5A623] text-black">
                      POPULAR
                    </span>
                  )}
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-white">
                  {tier.coins} <span className="text-xs text-[#F5A623]">COINS</span>
                </div>
                <div className="text-xs font-mono text-neutral-300 mt-0.5 font-medium">
                  ₦{tier.naira.toLocaleString()} NGN
                </div>
                <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-neutral-400">
                  <span>Pot:</span>
                  <span className="text-white font-bold">{tier.coins * 2} AC</span>
                </div>
              </button>
            ))}
          </div>

          {/* Claim-to-Proof Adjacency: Transparent 10% Rake Math Breakdown */}
          <div className="p-6 md:p-8 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              
              <div>
                <span className="text-xs font-mono text-[#F5A623] uppercase tracking-wider block mb-1">
                  Selected Tier Calculation
                </span>
                <h3 className="text-xl font-bold text-white">
                  {selectedTier.coins} Coins Duel (₦{selectedTier.naira.toLocaleString()})
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Two players contribute {selectedTier.coins} Coins each. Match victor claims 90% of total pot.
                </p>
              </div>

              {/* Pot Math Cards */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-black/60 border border-white/[0.06] text-center font-mono">
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase block">Total Pot</span>
                  <span className="text-base sm:text-lg font-bold text-white">{pot} AC</span>
                  <span className="text-[10px] text-neutral-500 block">₦{(pot * 10).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#F5A623] uppercase block">10% Rake</span>
                  <span className="text-base sm:text-lg font-bold text-[#F5A623]">-{rake} AC</span>
                  <span className="text-[10px] text-neutral-500 block">₦{(rake * 10).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-400 uppercase block">Winner Takes</span>
                  <span className="text-base sm:text-lg font-bold text-emerald-400">{winnerPayout} AC</span>
                  <span className="text-[10px] text-neutral-500 block">₦{(winnerPayout * 10).toLocaleString()}</span>
                </div>
              </div>

              {/* Action */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onQuickPlay('whot', selectedTier.coins)}
                  className="py-3 px-5 rounded-xl font-bold text-xs bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-[#0A0A0A] hover:brightness-105 transition-all shadow-md shadow-[#F5A623]/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Play {selectedTier.coins} Coins Match</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] text-center text-neutral-400 font-mono">
                  100% refund for both players if match ends in draw
                </span>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 3. THE 4 LAUNCH GAMES SHOWCASE (Section 3) */}
      <section id="games" className="py-16 md:py-24 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#F5A623] font-semibold block mb-2">
                Launch Title Roster
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                4 Verified Skill Competitions
              </h2>
              <p className="text-sm text-neutral-400 mt-1 max-w-xl">
                Every title is engineered with server-authoritative logic, instant move clocks, and anti-cheat validation.
              </p>
            </div>

            {/* Interactive Game Selector Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] self-start md:self-auto overflow-x-auto max-w-full">
              {[
                { id: 'whot' as const, name: 'Whot' },
                { id: 'chess' as const, name: 'Chess' },
                { id: 'trivia' as const, name: 'Trivia' },
                { id: 'ludo' as const, name: 'Ludo' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveGameTab(tab.id)}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    activeGameTab === tab.id
                      ? 'bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-[#0A0A0A] shadow-md shadow-[#F5A623]/20'
                      : 'text-neutral-300 hover:text-white'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>
          </div>

          {/* Active Featured Game Spotlight */}
          <div className="p-6 md:p-8 rounded-2xl bg-white/[0.03] border border-white/[0.08] mb-12">
            
            {activeGameTab === 'whot' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-white/[0.08] bg-black">
                  <img
                    src={whotImg}
                    alt="Nigerian Whot Card Game with Whot 20 Star Card and traditional suits"
                    referrerPolicy="no-referrer"
                    className="w-full h-auto aspect-[4/3] object-cover"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md border border-[#F5A623]/40 text-[#F5A623] font-mono text-xs font-bold">
                    Nigerian National Card Game
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
                    <span>Card Strategy</span>
                    <span aria-hidden="true">·</span>
                    <span>3–5 Mins</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#F5A623]">Server Deck Shuffling</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-white">
                    Whot: Classic Nigerian Rules
                  </h3>

                  <p className="text-sm text-neutral-300 leading-relaxed">
                    Outplay your challenger in the most popular card game in West Africa. Master all authoritative tactical action cards under strict timed turn clocks.
                  </p>

                  {/* Rules Highlight Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                    {[
                      { num: '1', name: 'Hold On', desc: 'Opponent misses turn' },
                      { num: '2', name: 'Pick Two', desc: 'Draw 2 cards penalty' },
                      { num: '5', name: 'Pick Three', desc: 'Draw 3 cards penalty' },
                      { num: '8', name: 'Suspension', desc: 'Skips opponent round' },
                      { num: '14', name: 'General Market', desc: 'All draw 1 card' },
                      { num: '20', name: 'Whot Star', desc: 'Call any shape of choice' },
                    ].map((rule) => (
                      <div
                        key={rule.num}
                        className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-[#F5A623]/20 text-[#F5A623] font-mono font-bold text-xs flex items-center justify-center">
                            {rule.num}
                          </span>
                          <span className="font-bold text-xs text-white">{rule.name}</span>
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-1">{rule.desc}</p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => onQuickPlay('whot', selectedStake)}
                      className="py-3 px-6 rounded-xl font-bold text-xs bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-[#0A0A0A] hover:brightness-105 transition-all inline-flex items-center gap-2 cursor-pointer"
                    >
                      <span>Challenge in Naija Whot ({selectedStake} Coins)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeGameTab === 'chess' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-white/[0.08] bg-black">
                  <img
                    src={chessImg}
                    alt="Luxury Speed Chess board with obsidian and brass pieces"
                    referrerPolicy="no-referrer"
                    className="w-full h-auto aspect-[4/3] object-cover"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md border border-[#F5A623]/40 text-[#F5A623] font-mono text-xs font-bold">
                    Rapid Speed Chess
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
                    <span>Pure Intellect</span>
                    <span aria-hidden="true">·</span>
                    <span>3 min + 2s Blitz</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-400">Anti-Engine Detection</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-white">
                    Speed Chess: Tactical Blitz
                  </h3>

                  <p className="text-sm text-neutral-300 leading-relaxed">
                    Rapid timed duels with server-authoritative FIDE move validation. Move timing entropy analysis and automated Stockfish bot prevention keep the arena pristine.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <h4 className="font-bold text-xs text-white mb-1">Server Clock Synchronization</h4>
                      <p className="text-xs text-neutral-400">Lag-compensated millisecond timestamps eliminate connection-speed advantages.</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <h4 className="font-bold text-xs text-white mb-1">100% Stalemate Draw Refund</h4>
                      <p className="text-xs text-neutral-400">Stalemates, 3-fold repetition, and mutual agreements refund 100% of stakes with 0% platform fee.</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => onQuickPlay('chess', selectedStake)}
                      className="py-3 px-6 rounded-xl font-bold text-xs bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-[#0A0A0A] hover:brightness-105 transition-all inline-flex items-center gap-2 cursor-pointer"
                    >
                      <span>Play Speed Chess ({selectedStake} Coins)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeGameTab === 'trivia' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-white/[0.08] bg-black">
                  <img
                    src={triviaImg}
                    alt="High-tech Live Trivia podium arena with digital timer"
                    referrerPolicy="no-referrer"
                    className="w-full h-auto aspect-[4/3] object-cover"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md border border-[#F5A623]/40 text-[#F5A623] font-mono text-xs font-bold">
                    Speed Quiz Arena
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
                    <span>Knowledge & Reflexes</span>
                    <span aria-hidden="true">·</span>
                    <span>10 Questions</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#F5A623]">24+ African & Global Categories</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-white">
                    Trivia: Synchronized Speed Quiz
                  </h3>

                  <p className="text-sm text-neutral-300 leading-relaxed">
                    10 head-to-head questions delivered synchronously with a 10-second buzzer clock. Score points for correct answers with bonus multipliers for faster buzzer speed.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <h4 className="font-bold text-xs text-white mb-1">Deep African & Naija Topics</h4>
                      <p className="text-xs text-neutral-400">Nollywood classics, Afrobeats history, Nigerian politics, geography, and world sports trivia.</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <h4 className="font-bold text-xs text-white mb-1">Zero Latency Peering</h4>
                      <p className="text-xs text-neutral-400">Both contestants view questions at the exact same split-second to guarantee complete fairness.</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => onQuickPlay('trivia', selectedStake)}
                      className="py-3 px-6 rounded-xl font-bold text-xs bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-[#0A0A0A] hover:brightness-105 transition-all inline-flex items-center gap-2 cursor-pointer"
                    >
                      <span>Enter Speed Trivia ({selectedStake} Coins)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeGameTab === 'ludo' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-white/[0.08] bg-black">
                  <img
                    src={ludoImg}
                    alt="Luxury wooden crafted Nigerian Ludo board with gold and red tokens"
                    referrerPolicy="no-referrer"
                    className="w-full h-auto aspect-[4/3] object-cover"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md border border-[#F5A623]/40 text-[#F5A623] font-mono text-xs font-bold">
                    Classic Board Game
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
                    <span>Tactical Racing</span>
                    <span aria-hidden="true">·</span>
                    <span>4 Tokens</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-400">Provably-Fair Dice RNG</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-white">
                    Ludo: Cut Mechanics & Home Run Race
                  </h3>

                  <p className="text-sm text-neutral-300 leading-relaxed">
                    The beloved Nigerian parlor game brought to digital perfection. Strategize which of your 4 tokens to advance, block opponents on safe squares, and cut enemy tokens back to base.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <h4 className="font-bold text-xs text-white mb-1">Authentic Nigerian Cut Rules</h4>
                      <p className="text-xs text-neutral-400">Landing on opponent’s token captures it, returning it directly to home yard while awarding a bonus roll.</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <h4 className="font-bold text-xs text-white mb-1">Cryptographic Dice Rolls</h4>
                      <p className="text-xs text-neutral-400">Dice entropy is verifiable on the blockchain or server audit log—zero loaded dice.</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => onQuickPlay('ludo', selectedStake)}
                      className="py-3 px-6 rounded-xl font-bold text-xs bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-[#0A0A0A] hover:brightness-105 transition-all inline-flex items-center gap-2 cursor-pointer"
                    >
                      <span>Challenge in Ludo ({selectedStake} Coins)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* 4 Cards Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                id: 'whot' as const,
                name: 'Naija Whot',
                sub: 'Hold On 1, Pick Two 2, Whot 20',
                img: whotImg,
              },
              {
                id: 'chess' as const,
                name: 'Speed Chess',
                sub: 'Timed FIDE blitz & anti-cheat engine',
                img: chessImg,
              },
              {
                id: 'trivia' as const,
                name: 'Live Trivia',
                sub: '10 speed-scored questions & buzzer clock',
                img: triviaImg,
              },
              {
                id: 'ludo' as const,
                name: 'Ludo Classic',
                sub: '4 tokens, cut mechanics & provably-fair dice',
                img: ludoImg,
              },
            ].map((g) => (
              <div
                key={g.id}
                onClick={() => setActiveGameTab(g.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                  activeGameTab === g.id
                    ? 'bg-white/[0.06] border-[#F5A623]/60 shadow-lg'
                    : 'bg-white/[0.02] border-white/[0.06] hover:border-white/20'
                }`}
              >
                <div className="aspect-[16/10] rounded-xl overflow-hidden mb-3 bg-black">
                  <img
                    src={g.img}
                    alt={g.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <h4 className="font-bold text-sm text-white group-hover:text-[#F5A623] transition-colors">
                  {g.name}
                </h4>
                <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
                  {g.sub}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 4. CORE PRODUCTION FEATURES BANNER (Section 4) */}
      <section id="features" className="py-16 md:py-24 border-b border-white/[0.06] bg-black/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-mono uppercase tracking-wider text-[#F5A623] font-semibold block mb-2">
              Architecture & Features
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Feature 1: WhatsApp Rooms */}
            <div className="p-6 md:p-8 rounded-2xl bg-white/[0.03] border border-white/[0.08] relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 flex items-center justify-center text-[#25D366] mb-5">
                  <Share2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  WhatsApp Challenge Rooms
                </h3>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Generate private challenge links in seconds (e.g. <span className="font-mono text-[#F5A623]">apexclash.ng/room/XXXX</span>). Share directly into group chats or DMs on WhatsApp. Friends tap once to accept the stake and enter the room lobby.
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={onOpenWhatsAppModal}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#25D366] hover:bg-[#20BD5A] text-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Generate Test Room Link</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Feature 2: High-Liquidity Matchmaking Protocol */}
            <div className="p-6 md:p-8 rounded-2xl bg-white/[0.03] border border-white/[0.08] relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#F5A623]/10 border border-[#F5A623]/30 flex items-center justify-center text-[#F5A623] mb-5">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  High-Liquidity Arena Pairing
                </h3>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Real-time skill matchmaking pairs you with active Nigerian contenders instantly. Background liquidity algorithms ensure match execution within 2 minutes so you never sit in idle queues.
                </p>
              </div>

            </div>

            {/* Feature 3: Transparent 10% Platform Rake */}
            <div className="p-6 md:p-8 rounded-2xl bg-white/[0.03] border border-white/[0.08] relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-white mb-5">
                  <Percent className="w-6 h-6 text-[#F5A623]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Transparent 10% Flat Rake
                </h3>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Zero hidden transaction fees. A flat 10% platform fee is deducted solely on victory (winner receives 90% of pot). In the event of a draw or stalemate, both players receive a 100% refund with 0% fee.
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-emerald-400 font-semibold">
                <span>Draws: 100% Refund</span>
                <span>Wins: 90% Payout</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 5. STATUTORY SKILL DISCLOSURE BANNER */}
      <section className="py-12 bg-white/[0.02] border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-6 rounded-2xl bg-black/60 border border-white/[0.08] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#DC2626]/20 border border-[#DC2626]/40 flex items-center justify-center text-[#DC2626] flex-shrink-0">
                <span className="font-mono font-bold text-sm">18+</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  Regulatory Compliance & Responsible Competition Notice
                </h4>
                <p className="text-xs text-neutral-400 mt-0.5 max-w-3xl leading-relaxed">
                  ApexClash hosts skill-based contests exclusively for players aged 18 and older in Nigeria. Games of skill are legally distinct from gambling under Nigerian law. Play responsibly and never stake funds exceeding your discretionary budget.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenDoc('skill_compliance')}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.1] transition-colors whitespace-nowrap cursor-pointer"
            >
              Read Legal Opinion
            </button>
          </div>
        </div>
      </section>

      {/* 6. PRODUCTION LEGAL FOOTER */}
      <footer className="mt-auto py-12 bg-[#080808] border-t border-white/[0.08] text-xs text-neutral-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10 pb-10 border-b border-white/[0.06]">
            
            {/* Col 1: Brand */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#F5A623] to-[#DC2626] p-[1px]">
                  <div className="w-full h-full bg-[#0A0A0A] rounded-[7px] flex items-center justify-center">
                    <span className="font-mono font-extrabold text-xs text-[#F5A623]">AC</span>
                  </div>
                </div>
                <span className="text-base font-black tracking-tight text-white uppercase">
                  Apex<span className="text-[#F5A623]">Clash</span>
                </span>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed">
                The premier skill-based PvP arena in Nigeria. Whot, Chess, Trivia, and Ludo with instant Naira payouts.
              </p>
              <div className="text-[11px] font-mono text-neutral-500">
                Apex Technology Ltd · Lagos, Nigeria
              </div>
            </div>

            {/* Col 2: Launch Titles */}
            <div className="space-y-2">
              <h5 className="font-bold text-white text-xs uppercase tracking-wider font-mono">
                Launch Games
              </h5>
              <ul className="space-y-1.5 text-xs text-neutral-400">
                <li><button type="button" onClick={() => setActiveGameTab('whot')} className="hover:text-white transition-colors">Naija Whot (Hold On, Pick Two)</button></li>
                <li><button type="button" onClick={() => setActiveGameTab('chess')} className="hover:text-white transition-colors">Speed Chess (FIDE Blitz)</button></li>
                <li><button type="button" onClick={() => setActiveGameTab('trivia')} className="hover:text-white transition-colors">Live Speed Trivia (24+ Topics)</button></li>
                <li><button type="button" onClick={() => setActiveGameTab('ludo')} className="hover:text-white transition-colors">Ludo Classic (Cut Mechanics)</button></li>
              </ul>
            </div>

            {/* Col 3: Legal & Regulatory */}
            <div className="space-y-2">
              <h5 className="font-bold text-white text-xs uppercase tracking-wider font-mono">
                Legal & Governance
              </h5>
              <ul className="space-y-1.5 text-xs text-neutral-400">
                <li>
                  <button type="button" onClick={() => onOpenDoc('terms')} className="hover:text-[#F5A623] transition-colors">
                    Terms & Conditions
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onOpenDoc('privacy')} className="hover:text-[#F5A623] transition-colors">
                    Privacy Policy (NDPA)
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onOpenDoc('fair_play')} className="hover:text-[#F5A623] transition-colors">
                    Fair Play Anti-Cheating Charter
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onOpenDoc('responsible_gaming')} className="hover:text-[#F5A623] transition-colors">
                    Responsible Gaming & Loss Caps
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onOpenDoc('skill_compliance')} className="hover:text-[#F5A623] transition-colors">
                    Skill-Based Statutory Framing
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 4: Economy Disclosure */}
            <div className="space-y-2">
              <h5 className="font-bold text-white text-xs uppercase tracking-wider font-mono">
                Platform Disclosures
              </h5>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11px] font-mono space-y-1">
                <div className="text-[#F5A623]">100 Coins = ₦1,000 (1 AC = ₦10)</div>
                <div className="text-neutral-400">Flat 10% rake on victory only</div>
                <div className="text-emerald-400">100% refund on match draws</div>
                <div className="text-neutral-500 pt-1 border-t border-white/[0.06]">18+ Nigerian Residents Only</div>
              </div>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-500 font-mono">
            <div>
              © 2026 APEXCLASH. All rights reserved. Peer-to-peer skill-based competition.
            </div>
            <div className="flex items-center gap-4">
              <button type="button" onClick={onOpenLegalGate} className="hover:text-neutral-300">
                Verify 18+ Status
              </button>
              <span>·</span>
              <button type="button" onClick={() => onOpenAuth('signin')} className="hover:text-neutral-300">
                Contender Sign In
              </button>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};
