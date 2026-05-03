import { useState, useEffect } from 'react';
import type { CatalogPlayer } from '../lib/players';
import type { SimulationPlayer, SubstitutionAction, TacticalStyle } from '../types/simulation';
import { api } from '../lib/api';

interface SubstitutionModalProps {
  matchId: string;
  isOpen: boolean;
  onClose: () => void;
  starters: SimulationPlayer[];
  bench: SimulationPlayer[];
  currentStyle: TacticalStyle;
  onApply: (substitutions: SubstitutionAction[], style: TacticalStyle | undefined, description: string) => Promise<void>;
  loading: boolean;
}

export default function SubstitutionModal({
  matchId,
  isOpen,
  onClose,
  starters,
  bench,
  currentStyle,
  onApply,
  loading,
}: SubstitutionModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [outPlayerId, setOutPlayerId] = useState('');
  const [inPlayerId, setInPlayerId] = useState('');
  const [tacticalStyle, setTacticalStyle] = useState<TacticalStyle>(currentStyle);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTacticalStyle(currentStyle);
      setPreviewData(null);
    }
  }, [isOpen, currentStyle]);

  useEffect(() => {
    if (step === 3 && outPlayerId && inPlayerId && matchId) {
      const fetchPreview = async () => {
        setLoadingPreview(true);
        try {
          const res = await api.post(`/api/matches/${matchId}/substitution-preview`, {
            substitutions: [{ playerOutId: outPlayerId, playerInId: inPlayerId }],
            tacticsChanges: tacticalStyle !== currentStyle ? { style: tacticalStyle } : undefined,
          });
          setPreviewData(res.data);
        } catch (err) {
          console.error('Failed to fetch preview:', err);
        } finally {
          setLoadingPreview(false);
        }
      };
      fetchPreview();
    }
  }, [step, tacticalStyle, outPlayerId, inPlayerId, matchId, currentStyle]);

  if (!isOpen) return null;

  const handleNextStep = () => {
    if (step === 1 && outPlayerId) setStep(2);
    else if (step === 2 && inPlayerId) setStep(3);
  };

  const handleApply = async () => {
    if (!outPlayerId || !inPlayerId) return;
    
    const inPlayer = bench.find(p => p.id === inPlayerId);
    
    await onApply(
      [{ playerOutId: outPlayerId, playerInId: inPlayerId }],
      tacticalStyle !== currentStyle ? tacticalStyle : undefined,
      `Subbed in ${inPlayer?.name} and adjusted tactics.`
    );
    onClose();
    
    // Reset state for next time
    setTimeout(() => {
      setStep(1);
      setOutPlayerId('');
      setInPlayerId('');
    }, 300);
  };

  const selectedOutPlayer = starters.find(p => p.id === outPlayerId);
  const selectedInPlayer = bench.find(p => p.id === inPlayerId);

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full bg-[var(--color-surface)] border-t sm:border border-white/10 sm:rounded-2xl rounded-t-3xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up" style={{ maxWidth: '512px' }}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[var(--color-surface-dim)]">
          <div>
            <h3 className="font-['Lexend'] text-lg text-white">Make Changes</h3>
            <p className="text-[10px] text-[var(--color-primary)] uppercase tracking-wider font-semibold">
              {step === 1 ? 'Select Player to Sub Out' : step === 2 ? 'Select Player to Sub In' : 'Review & Confirm'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1">
          {step === 1 && (
            <div className="grid grid-cols-2 gap-3">
              {starters.map((player) => (
                <button
                  key={player.id}
                  onClick={() => { setOutPlayerId(player.id); setStep(2); }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    outPlayerId === player.id 
                      ? 'border-[var(--color-warning)] bg-[var(--color-warning)]/10' 
                      : 'border-white/5 bg-[var(--color-surface-container-highest)] hover:border-white/20'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-white bg-black/40 px-2 py-0.5 rounded">{player.rolePosition}</span>
                    <span className="text-[10px] text-[var(--color-warning)] font-bold">{Math.max(30, player.stamina)}% STM</span>
                  </div>
                  <p className="font-semibold text-white truncate">{player.name}</p>
                  <p className="text-xs text-[var(--color-on-surface-variant)]">OVR {player.rating}</p>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[var(--color-warning)]">logout</span>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-on-surface-variant)] uppercase">Subbing Out</p>
                  <p className="font-bold text-white">{selectedOutPlayer?.name} <span className="text-[var(--color-on-surface-variant)] font-normal text-sm">({selectedOutPlayer?.rolePosition})</span></p>
                </div>
                <button onClick={() => setStep(1)} className="ml-auto text-xs text-[var(--color-primary)]">Change</button>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                {bench.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => { setInPlayerId(player.id); setStep(3); }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      inPlayerId === player.id 
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' 
                        : 'border-white/5 bg-[var(--color-surface-container-highest)] hover:border-white/20'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-white bg-black/40 px-2 py-0.5 rounded">{player.naturalPosition}</span>
                      <span className="text-[10px] text-[var(--color-primary)] font-bold">100% STM</span>
                    </div>
                    <p className="font-semibold text-white truncate">{player.name}</p>
                    <p className="text-xs text-[var(--color-on-surface-variant)]">OVR {player.rating}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-4">
                <div className="text-center flex-1 glass-panel rounded-xl p-3 border border-[var(--color-warning)]/30">
                  <p className="text-[10px] uppercase text-[var(--color-warning)] font-bold mb-1">OUT</p>
                  <p className="font-semibold text-white truncate">{selectedOutPlayer?.name}</p>
                  <p className="text-xs text-[var(--color-on-surface-variant)]">{selectedOutPlayer?.rolePosition}</p>
                </div>
                <span className="material-symbols-outlined text-white/40">arrow_forward</span>
                <div className="text-center flex-1 glass-panel rounded-xl p-3 border border-[var(--color-primary)]/30">
                  <p className="text-[10px] uppercase text-[var(--color-primary)] font-bold mb-1">IN</p>
                  <p className="font-semibold text-white truncate">{selectedInPlayer?.name}</p>
                  <p className="text-xs text-[var(--color-on-surface-variant)]">{selectedInPlayer?.naturalPosition}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-3 font-semibold">Tactical Style</p>
                <div className="flex flex-wrap gap-2">
                  {(['BALANCED', 'HIGH_PRESS', 'COUNTER', 'POSSESSION', 'LOW_BLOCK'] as TacticalStyle[]).map((style) => (
                    <button
                      key={style}
                      onClick={() => setTacticalStyle(style)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                        tacticalStyle === style 
                          ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]/50' 
                          : 'bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface-variant)] border-white/5'
                      }`}
                    >
                      {style.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-[var(--color-primary)] text-xl">analytics</span>
                  <h4 className="font-['Lexend'] text-white text-sm">Impact Preview</h4>
                  {loadingPreview && <span className="ml-auto text-[10px] text-[var(--color-primary)] uppercase animate-pulse">Calculating...</span>}
                </div>
                
                {previewData && !loadingPreview ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-[var(--color-on-surface-variant)]">Control</span>
                        <span className="font-bold text-white">
                          {previewData.after.control} <span className={previewData.deltas.controlDelta > 0 ? 'text-[var(--color-primary)]' : previewData.deltas.controlDelta < 0 ? 'text-[var(--color-danger)]' : 'text-white/40'}>
                            {previewData.deltas.controlDelta > 0 ? '+' : ''}{previewData.deltas.controlDelta || ''}
                          </span>
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-[var(--color-on-surface-variant)]">Chance Cr.</span>
                        <span className="font-bold text-white">
                          {previewData.after.chanceCreation} <span className={previewData.deltas.chanceCreationDelta > 0 ? 'text-[var(--color-primary)]' : previewData.deltas.chanceCreationDelta < 0 ? 'text-[var(--color-danger)]' : 'text-white/40'}>
                            {previewData.deltas.chanceCreationDelta > 0 ? '+' : ''}{previewData.deltas.chanceCreationDelta || ''}
                          </span>
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-[var(--color-on-surface-variant)]">Defense</span>
                        <span className="font-bold text-white">
                          {previewData.after.defensiveWall} <span className={previewData.deltas.defenseDelta > 0 ? 'text-[var(--color-primary)]' : previewData.deltas.defenseDelta < 0 ? 'text-[var(--color-danger)]' : 'text-white/40'}>
                            {previewData.deltas.defenseDelta > 0 ? '+' : ''}{previewData.deltas.defenseDelta || ''}
                          </span>
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-[var(--color-on-surface-variant)]">Flank Risk L</span>
                        <span className="font-bold text-white">
                          {previewData.after.leftFlankRisk} <span className={previewData.deltas.leftRiskDelta < 0 ? 'text-[var(--color-primary)]' : previewData.deltas.leftRiskDelta > 0 ? 'text-[var(--color-danger)]' : 'text-white/40'}>
                            {previewData.deltas.leftRiskDelta > 0 ? '+' : ''}{previewData.deltas.leftRiskDelta || ''}
                          </span>
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-[var(--color-on-surface-variant)]">Flank Risk R</span>
                        <span className="font-bold text-white">
                          {previewData.after.rightFlankRisk} <span className={previewData.deltas.rightRiskDelta < 0 ? 'text-[var(--color-primary)]' : previewData.deltas.rightRiskDelta > 0 ? 'text-[var(--color-danger)]' : 'text-white/40'}>
                            {previewData.deltas.rightRiskDelta > 0 ? '+' : ''}{previewData.deltas.rightRiskDelta || ''}
                          </span>
                        </span>
                      </div>
                    </div>
                    {previewData.summary && (
                      <div className="mt-3 bg-[var(--color-surface-dim)]/50 rounded-lg p-3 border border-white/5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="material-symbols-outlined text-[var(--color-primary)] text-sm">smart_toy</span>
                          <span className="text-[10px] uppercase font-bold text-[var(--color-primary)]">Coach Assistant</span>
                        </div>
                        <p className="text-xs text-[var(--color-on-surface-variant)] leading-relaxed">
                          {previewData.summary}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--color-primary)]/80">Applying this change will recalculate team balance for the remaining 30 minutes.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/5 bg-[var(--color-surface-dim)] flex gap-3 pb-safe">
          {step > 1 && (
            <button
              onClick={() => setStep(step === 3 ? 2 : 1)}
              disabled={loading}
              className="px-6 py-3 rounded-xl border border-white/10 text-white font-semibold hover:bg-white/5 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={step === 3 ? handleApply : handleNextStep}
            disabled={loading || (step === 1 && !outPlayerId) || (step === 2 && !inPlayerId)}
            className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed)] text-[var(--color-on-primary)] py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:hover:bg-[var(--color-primary)] neon-glow"
          >
            {loading ? 'Processing...' : step === 3 ? 'CONFIRM CHANGES' : 'CONTINUE'}
          </button>
        </div>
      </div>
    </div>
  );
}
