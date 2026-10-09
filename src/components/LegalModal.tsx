import React from 'react';
import { X, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';
import { LegalDocType } from '../types';

interface LegalModalProps {
  isOpen: boolean;
  docType: LegalDocType | null;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  docType,
  onClose,
}) => {
  if (!isOpen || !docType) return null;

  const getContent = () => {
    switch (docType) {
      case 'terms':
        return {
          title: 'Terms of Service & Contender Agreement',
          badge: 'Legal & Binding',
          body: `
1. Introduction & Acceptance
Welcome to ApexClash (apexclash.ng). By accessing, registering an account, or participating in skill-based peer-to-peer competitions on ApexClash, you agree to be legally bound by these Terms of Service. If you do not agree to these terms, please do not use the platform.

2. Eligibility & 18+ Verification
ApexClash is strictly restricted to individuals who are at least 18 years of age and reside within the Federal Republic of Nigeria. By registering, you warrant that you meet all legal age and residency criteria. Falsifying age or identity credentials will result in immediate account termination and forfeiture of funds.

3. Skill-Based Competition (Non-Gambling)
ApexClash operates strictly as a skill-based peer-to-peer gaming platform (Naija Whot, Chess, Speed Trivia, Ludo). All outcomes are determined by player strategy, tactics, speed, and intellect—not by chance or random number generation. Therefore, platform competitions are lawful and compliant with Nigerian skill gaming standards.

4. Platform Rake & Fee Transparency
ApexClash charges a flat 10% platform rake on match victories to cover server maintenance, security, and matchmaking infrastructure. The winner receives 90% of the combined stake pot instantly. In the event of a drawn match, 100% of the staked coins are fully refunded with 0% platform fee.

5. Paystack Deposits & Bank Withdrawals
Financial transactions are processed securely via Paystack-ready gateways and verified bank payout rails. Minimum withdrawal is 100 Apex Coins (₦1,000). Spendable balances can be withdrawn at any time; active stakes are locked in escrow until match resolution.
          `,
        };
      case 'privacy':
        return {
          title: 'Privacy Policy & Data Protection',
          badge: 'Data Security',
          body: `
1. Information We Collect
We collect account registration data (username, email address, hashed credentials), encrypted wallet balances, transaction audit logs, and game session telemetry necessary to maintain provably-fair matchmaking.

2. Use of Information
Your data is used strictly for authenticating your contender profile, executing secure coin transactions, resolving disputes, and ensuring compliance with Nigerian regulatory guidelines. We never sell or share your personal data with third-party advertisers.

3. Data Security & Encryption
All data transmitted between your browser and ApexClash servers is protected using industry-standard SSL/TLS encryption. Supabase database tables are secured using row-level security (RLS) policies.
          `,
        };
      case 'fair_play':
        return {
          title: 'Fair Play Charter & Anti-Cheat Rules',
          badge: 'Integrity',
          body: `
1. Absolute Zero Tolerance for Bots & Collusion
ApexClash enforces strict server-authoritative game validation and anti-cheat telemetry. The use of automated scripts, bots, UI macro automation, player collusion, or exploitation of timer clocks will result in permanent account banning and confiscation of staked balances.

2. Provably Fair Telemetry
Every move in Chess, card drawn in Whot, question answered in Trivia, and dice rolled in Ludo is cryptographically tracked and validated on our servers to ensure absolute fairness for both contenders.
          `,
        };
      case 'responsible_gaming':
        return {
          title: 'Responsible Gaming & Deposit Limits',
          badge: 'Contender Welfare',
          body: `
1. Play Within Your Means
ApexClash promotes healthy, competitive skill gaming. Only stake funds you can comfortably afford to risk. 

2. Self-Exclusion & Cooling-Off
Contenders can request voluntary cooling-off periods or permanent account self-exclusion by contacting support at support@apexclash.ng. We are committed to fostering a safe, sustainable gaming ecosystem in Nigeria.
          `,
        };
      case 'skill_compliance':
      default:
        return {
          title: 'Nigerian Skill Gaming Compliance',
          badge: 'Regulatory',
          body: `
ApexClash is structured in full compliance with Nigerian legal frameworks governing skill-based competitions, ensuring that intellectual strategy and reflexes remain the sole determinant of victory.
          `,
        };
    }
  };

  const doc = getContent();

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-[#0F0F0F] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Top Gold Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#F5A623] to-[#E0921A]" />

        {/* Header */}
        <div className="p-6 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F5A623]/10 border border-[#F5A623]/30 flex items-center justify-center text-[#F5A623]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-[#F5A623]">
                {doc.badge}
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight">{doc.title}</h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-neutral-300 font-mono leading-relaxed whitespace-pre-line">
          {doc.body}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-black/40 flex items-center justify-between">
          <span className="text-[11px] text-neutral-500 font-mono">
            ApexClash Legal Compliance · Lagos, Nigeria
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-xl text-xs font-bold bg-[#F5A623] hover:bg-[#E0921A] text-black transition-colors cursor-pointer"
          >
            Close Viewer
          </button>
        </div>

      </div>
    </div>
  );
};
