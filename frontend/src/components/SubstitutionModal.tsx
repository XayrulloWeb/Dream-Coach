import { useEffect, useMemo, useState } from 'react';
import type { SimulationPlayer, SubstitutionAction, TacticalStyle } from '../types/simulation';
import { api } from '../lib/api';
import type { CatalogPlayer } from '../lib/players';
import PlayerCard from './PlayerCard';

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

  const starterCards = useMemo(() => starters.map(toCatalogPlayer), [starters]);
  const benchCards = useMemo(() => bench.map(toCatalogPlayer), [bench]);

  useEffect(() => {
    if (isOpen) {
      setTacticalStyle(currentStyle);
      setPreviewData(null);
      setStep(1);
      setOutPlayerId('');
      setInPlayerId('');
    }
  }, [isOpen, currentStyle]);

  useEffect(() => {
    if (step !== 3 || !outPlayerId || !inPlayerId || !matchId) {
      return;
    }

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

    void fetchPreview();
  }, [step, tacticalStyle, outPlayerId, inPlayerId, matchId, currentStyle]);

  if (!isOpen) return null;

  const selectedOutPlayer = starterCards.find((player) => player.id === outPlayerId);
  const selectedInPlayer = benchCards.find((player) => player.id === inPlayerId);

  const apply = async () => {
    if (!selectedOutPlayer || !selectedInPlayer) {
      return;
    }

    await onApply(
      [{ playerOutId: selectedOutPlayer.id, playerInId: selectedInPlayer.id }],
      tacticalStyle !== currentStyle ? tacticalStyle : undefined,
      `Замена: ${selectedOutPlayer.name} -> ${selectedInPlayer.name}.`,
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full bg-[var(--color-surface)] border-t sm:border border-white/10 sm:rounded-2xl rounded-t-3xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up" style={{ maxWidth: '768px' }}>
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[var(--color-surface-dim)]">
          <div>
            <h3 className="font-['Lexend'] text-lg text-white">Тренерская замена</h3>
            <p className="text-[10px] text-[var(--color-primary)] uppercase tracking-wider font-semibold">
              {step === 1 ? 'Шаг 1: Кого заменить' : step === 2 ? 'Шаг 2: Кого выпустить' : 'Шаг 3: Подтверждение'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {step === 1 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {starterCards.map((player) => (
                <button
                  key={player.id}
                  onClick={() => {
                    setOutPlayerId(player.id);
                    setStep(2);
                  }}
                  className="text-left"
                >
                  <PlayerCard
                    player={player}
                    slotRole={player.realPosition}
                    compact
                    className={outPlayerId === player.id ? 'border-[var(--color-warning)] bg-[var(--color-warning)]/10' : ''}
                    assignedLabel={`Выносливость ${Math.max(30, player.stamina)}%`}
                  />
                </button>
              ))}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 p-3 text-sm text-white">
                Убираем: <span className="font-semibold">{selectedOutPlayer?.name}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {benchCards.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => {
                      setInPlayerId(player.id);
                      setStep(3);
                    }}
                    className="text-left"
                  >
                    <PlayerCard
                      player={player}
                      slotRole={selectedOutPlayer?.realPosition}
                      compact
                      className={inPlayerId === player.id ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : ''}
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedOutPlayer ? (
                  <PlayerCard
                    player={selectedOutPlayer}
                    slotRole={selectedOutPlayer.realPosition}
                    compact
                    assignedLabel="Выходит"
                    className="border-[var(--color-warning)] bg-[var(--color-warning)]/10"
                  />
                ) : null}
                {selectedInPlayer ? (
                  <PlayerCard
                    player={selectedInPlayer}
                    slotRole={selectedOutPlayer?.realPosition}
                    compact
                    assignedLabel="Входит"
                    className="border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                  />
                ) : null}
              </div>

              <div>
                <p className="text-xs text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-2 font-semibold">Тактический стиль</p>
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
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-[var(--color-primary)] text-xl">analytics</span>
                  <h4 className="font-['Lexend'] text-white text-sm">Прогноз влияния</h4>
                  {loadingPreview ? <span className="ml-auto text-[10px] text-[var(--color-primary)] uppercase animate-pulse">Расчет...</span> : null}
                </div>
                {previewData && !loadingPreview ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[var(--color-on-surface-variant)]">
                    <MetricLine label="Контроль" value={previewData.after.control} delta={previewData.deltas.controlDelta} />
                    <MetricLine label="Создание моментов" value={previewData.after.chanceCreation} delta={previewData.deltas.chanceCreationDelta} />
                    <MetricLine label="Оборона" value={previewData.after.defensiveWall} delta={previewData.deltas.defenseDelta} />
                    <MetricLine label="Риск слева" value={previewData.after.leftFlankRisk} delta={previewData.deltas.leftRiskDelta} inverseDelta />
                    <MetricLine label="Риск справа" value={previewData.after.rightFlankRisk} delta={previewData.deltas.rightRiskDelta} inverseDelta />
                  </div>
                ) : (
                  <p className="text-xs text-[var(--color-primary)]/80">После выбора замены пересчитаем баланс на оставшееся время матча.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="p-5 border-t border-white/5 bg-[var(--color-surface-dim)] flex gap-3 pb-safe">
          {step > 1 ? (
            <button
              onClick={() => setStep(step === 3 ? 2 : 1)}
              disabled={loading}
              className="px-6 py-3 rounded-xl border border-white/10 text-white font-semibold hover:bg-white/5 transition-colors"
            >
              Назад
            </button>
          ) : null}
          <button
            onClick={step === 3 ? () => void apply() : () => setStep(step === 1 ? 2 : 3)}
            disabled={loading || (step === 1 && !outPlayerId) || (step === 2 && !inPlayerId)}
            className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed)] text-[var(--color-on-primary)] py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:hover:bg-[var(--color-primary)] neon-glow"
          >
            {loading ? 'Обработка...' : step === 3 ? 'Подтвердить замену' : 'Продолжить'}
          </button>
        </div>
      </div>
    </div>
  );
}

function toCatalogPlayer(player: SimulationPlayer): CatalogPlayer {
  const position = player.naturalPosition.toUpperCase();
  const positions = player.preferredPositions?.length
    ? player.preferredPositions.map((value) => value.toUpperCase())
    : [position];
  const rating = typeof player.rating === 'number'
    ? player.rating
    : Math.round((player.pac + player.sho + player.pas + player.dri + player.def + player.phy) / 6);

  return {
    id: player.id,
    displayName: player.name,
    name: player.name,
    fullName: player.name,
    playerType: 'CURRENT',
    cardType: undefined,
    rarity: undefined,
    nationality: undefined,
    age: undefined,
    heightCm: undefined,
    primaryPosition: position,
    positions,
    realPosition: position,
    preferredPositions: positions,
    rating,
    potential: rating,
    pac: player.pac,
    sho: player.sho,
    pas: player.pas,
    dri: player.dri,
    def: player.def,
    phy: player.phy,
    stamina: player.stamina,
    weakFoot: 3,
    skillMoves: 3,
    attackWorkRate: player.attackWorkRate ?? 'MEDIUM',
    defenseWorkRate: player.defenseWorkRate ?? 'MEDIUM',
    role: undefined,
    photoUrl: undefined,
    faceUrl: null,
    hasPhoto: false,
    tags: [],
    preferredFoot: 'RIGHT',
  };
}

function MetricLine({
  label,
  value,
  delta,
  inverseDelta = false,
}: {
  label: string;
  value: number;
  delta: number;
  inverseDelta?: boolean;
}) {
  const positive = inverseDelta ? delta < 0 : delta > 0;
  const neutral = delta === 0;
  const color = neutral ? 'text-white/60' : positive ? 'text-[var(--color-primary)]' : 'text-[var(--color-danger)]';
  const signed = delta > 0 ? `+${delta}` : `${delta}`;

  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-1">
      <span>{label}</span>
      <span className="font-bold text-white">
        {value} <span className={color}>{neutral ? '' : signed}</span>
      </span>
    </div>
  );
}
