import React, { useState } from 'react';
import { ShieldAlert, Check, FileText, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LegalDocType } from '../types';

interface LegalGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDoc: (doc: LegalDocType) => void;
  onVerifiedSuccess?: () => void;
}

export const LegalGateModal: React.FC<LegalGateModalProps> = ({
  isOpen,
  onClose,
  onOpenDoc,
  onVerifiedSuccess,
}) => {
  const { verify18Plus } = useAuth();
  const [ageChecked, setAgeChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [skillChecked, setSkillChecked] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!ageChecked || !termsChecked || !skillChecked) {
      setValidationError('You must acknowledge all 3 mandatory compliance verifications to proceed.');
      return;
    }
    setValidationError(null);
    try {
      localStorage.setItem('apex_18_verified', 'true');
    } catch {
      // ignore
    }
    verify18Plus();
    onClose();
    if (onVerifiedSuccess) {
      onVerifiedSuccess();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-gate-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-lg overflow-hidden bg-[#0F0F0F] border border-white/[0.08] rounded-2xl shadow-2xl">
        {/* Top Crimson Compliance Bar */}
        <div className="h-1.5 w-full bg-[#DC2626]" />

        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626]">
              <span className="text-xl font-bold font-mono">18+</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase tracking-wider font-semibold text-[#DC2626] font-mono">
                  Regulatory Compliance Checkpoint
                </span>
              </div>
              <h2 id="legal-gate-title" className="text-xl md:text-2xl font-bold text-white tracking-tight">
                Age & Fair Play Verification
              </h2>
              <p className="text-sm text-neutral-400 mt-1">
                ApexClash is an exclusive skill-based peer-to-peer competition platform in Nigeria.
              </p>
            </div>
          </div>

          {/* Validation Notice */}
          {validationError && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/30 flex items-center gap-3 text-sm text-[#FCA5A5]">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#DC2626]" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Compliance Checkboxes */}
          <div className="space-y-4 mb-6">
            {/* 1. Age Verification */}
            <label
              className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-colors cursor-pointer select-none ${
                ageChecked
                  ? 'bg-white/[0.04] border-[#F5A623]/40'
                  : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
              }`}
            >
              <input
                type="checkbox"
                checked={ageChecked}
                onChange={(e) => setAgeChecked(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 mt-0.5 rounded flex items-center justify-center border transition-all ${
                  ageChecked
                    ? 'bg-[#F5A623] border-[#F5A623] text-black font-bold'
                    : 'border-white/20 bg-black/40'
                }`}
              >
                {ageChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <div className="text-xs md:text-sm text-neutral-200 leading-snug">
                I am 18 years of age or older.
              </div>
            </label>

            {/* 2. Skill-based Non-Gambling Declaration */}
            <label
              className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-colors cursor-pointer select-none ${
                skillChecked
                  ? 'bg-white/[0.04] border-[#F5A623]/40'
                  : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
              }`}
            >
              <input
                type="checkbox"
                checked={skillChecked}
                onChange={(e) => setSkillChecked(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 mt-0.5 rounded flex items-center justify-center border transition-all ${
                  skillChecked
                    ? 'bg-[#F5A623] border-[#F5A623] text-black font-bold'
                    : 'border-white/20 bg-black/40'
                }`}
              >
                {skillChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <div className="text-xs md:text-sm text-neutral-200 leading-snug">
                I acknowledge that matches are skill-based peer-to-peer competitions, not chance.
              </div>
            </label>

            {/* 3. Terms & Fair Play Charter */}
            <label
              className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-colors cursor-pointer select-none ${
                termsChecked
                  ? 'bg-white/[0.04] border-[#F5A623]/40'
                  : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
              }`}
            >
              <input
                type="checkbox"
                checked={termsChecked}
                onChange={(e) => setTermsChecked(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 mt-0.5 rounded flex items-center justify-center border transition-all ${
                  termsChecked
                    ? 'bg-[#F5A623] border-[#F5A623] text-black font-bold'
                    : 'border-white/20 bg-black/40'
                }`}
              >
                {termsChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <div className="text-xs md:text-sm text-neutral-200 leading-snug">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDoc('terms');
                  }}
                  className="text-[#F5A623] underline hover:text-[#E0921A]"
                >
                  Terms of Service
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDoc('fair_play');
                  }}
                  className="text-[#F5A623] underline hover:text-[#E0921A]"
                >
                  Fair Play Charter
                </button>
                .
              </div>
            </label>
          </div>

          {/* Action Button */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              disabled={!ageChecked || !skillChecked || !termsChecked}
              onClick={handleConfirm}
              className="flex-1 py-3 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-[#0A0A0A] hover:brightness-105 active:scale-[0.98] transition-all shadow-lg shadow-[#F5A623]/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 text-[#0A0A0A]" />
              <span>Confirm & Continue</span>
            </button>
          </div>

          {/* Footer note */}
          <p className="mt-4 text-[11px] text-center text-neutral-500 font-mono">
            Verification timestamp recorded securely for legal compliance · NASS & NLRC guidelines adhered
          </p>
        </div>
      </div>
    </div>
  );
};
