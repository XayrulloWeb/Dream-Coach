import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, toApiError } from '../lib/api';
import { fetchPlayers, type CatalogPlayer } from '../lib/players';
import {
  buildSimulationPayloadFromStarters,
  loadSquadPayload,
  saveSquadPayload,
} from '../lib/squad';
import { saveSquadSnapshot } from '../lib/savedSquads';
import type { TacticalStyle, TeamRatings } from '../types/simulation';
import MobileBottomNav from '../components/MobileBottomNav';

type Slot = {
  id: string;
  label: string;
  role: string;
  starter: boolean;
};

type AssignmentMap = Record<string, CatalogPlayer | null>;

type PitchLayoutItem = {
  slotId: string;
  className: string;
};

const STARTER_SLOTS: Slot[] = [
  { id: 'lw', label: 'LW', role: 'LW', starter: true },
  { id: 'st', label: 'ST', role: 'ST', starter: true },
  { id: 'rw', label: 'RW', role: 'RW', starter: true },
  { id: 'lcm', label: 'LCM', role: 'LCM', starter: true },
  { id: 'cdm', label: 'CDM', role: 'CDM', starter: true },
  { id: 'rcm', label: 'RCM', role: 'RCM', starter: true },
  { id: 'lb', label: 'LB', role: 'LB', starter: true },
  { id: 'lcb', label: 'LCB', role: 'LCB', starter: true },
  { id: 'rcb', label: 'RCB', role: 'RCB', starter: true },
  { id: 'rb', label: 'RB', role: 'RB', starter: true },
  { id: 'gk', label: 'GK', role: 'GK', starter: true },
];

const BENCH_SLOTS: Slot[] = [
  { id: 'b1', label: 'Bench 1', role: 'CM', starter: false },
  { id: 'b2', label: 'Bench 2', role: 'CB', starter: false },
  { id: 'b3', label: 'Bench 3', role: 'ST', starter: false },
  { id: 'b4', label: 'Bench 4', role: 'LW', starter: false },
  { id: 'b5', label: 'Bench 5', role: 'RW', starter: false },
  { id: 'b6', label: 'Bench 6', role: 'CDM', starter: false },
  { id: 'b7', label: 'Bench 7', role: 'GK', starter: false },
];

const ALL_SLOTS = [...STARTER_SLOTS, ...BENCH_SLOTS];
const STARTER_SLOT_IDS = new Set(STARTER_SLOTS.map((slot) => slot.id));
const SLOT_LABEL_BY_ID = Object.fromEntries(ALL_SLOTS.map((slot) => [slot.id, slot.label])) as Record<string, string>;

const PITCH_LAYOUT: { slotId: string, style: React.CSSProperties }[] = [
  { slotId: 'lw', style: { position: 'absolute', top: '12%', left: '14%', transform: 'translate(-50%, -50%)' } },
  { slotId: 'st', style: { position: 'absolute', top: '8%', left: '50%', transform: 'translate(-50%, -50%)' } },
  { slotId: 'rw', style: { position: 'absolute', top: '12%', right: '14%', transform: 'translate(50%, -50%)' } },
  { slotId: 'lcm', style: { position: 'absolute', top: '35%', left: '22%', transform: 'translate(-50%, -50%)' } },
  { slotId: 'cdm', style: { position: 'absolute', top: '41%', left: '50%', transform: 'translate(-50%, -50%)' } },
  { slotId: 'rcm', style: { position: 'absolute', top: '35%', right: '22%', transform: 'translate(50%, -50%)' } },
  { slotId: 'lb', style: { position: 'absolute', top: '62%', left: '14%', transform: 'translate(-50%, -50%)' } },
  { slotId: 'lcb', style: { position: 'absolute', top: '66%', left: '32%', transform: 'translate(-50%, -50%)' } },
  { slotId: 'rcb', style: { position: 'absolute', top: '66%', right: '32%', transform: 'translate(50%, -50%)' } },
  { slotId: 'rb', style: { position: 'absolute', top: '62%', right: '14%', transform: 'translate(50%, -50%)' } },
  { slotId: 'gk', style: { position: 'absolute', bottom: '6%', left: '50%', transform: 'translate(-50%, -50%)' } },
];

export default function PlayerSelection() {
  const navigate = useNavigate();

  const [selectedSlotId, setSelectedSlotId] = useState<string>(STARTER_SLOTS[0]?.id ?? 'lw');
  const [assignments, setAssignments] = useState<AssignmentMap>(() => buildInitialAssignments());

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [positionOnly, setPositionOnly] = useState(true);
  const [items, setItems] = useState<CatalogPlayer[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [appliedPositionFilter, setAppliedPositionFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');

  const [pickerOpen, setPickerOpen] = useState(false);
  const [formation, setFormation] = useState('4-3-3');
  const [tacticalStyle, setTacticalStyle] = useState<TacticalStyle>('BALANCED');

  const [draggedSlotId, setDraggedSlotId] = useState<string | null>(null);
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);

  const selectedSlot = useMemo(
    () => ALL_SLOTS.find((slot) => slot.id === selectedSlotId) ?? STARTER_SLOTS[0],
    [selectedSlotId],
  );

  const [diagnostics, setDiagnostics] = useState<TeamRatings | null>(null);

  useEffect(() => {
    let active = true;
    const fetchDiagnostics = async () => {
      // Build temporary payload to analyze
      const missing = STARTER_SLOTS.filter((slot) => !assignments[slot.id]);
      if (missing.length > 0) {
        if (active) setDiagnostics(null);
        return;
      }

      const startersForPayload = STARTER_SLOTS.map((slot) =>
        toPayloadPlayer(assignments[slot.id] as CatalogPlayer, slot.role),
      );

      const payload = buildSimulationPayloadFromStarters(startersForPayload, tacticalStyle);
      payload.team.formation = formation;

      try {
        const response = await api.post<TeamRatings>('/api/matches/analyze-squad', payload);
        if (active) {
          setDiagnostics(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch squad diagnostics:', err);
      }
    };

    const timeout = setTimeout(fetchDiagnostics, 500); // Debounce to avoid spamming
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [assignments, formation, tacticalStyle]);

  useEffect(() => {
    const existing = loadSquadPayload();
    if (!existing) {
      return;
    }

    setFormation(existing.team.formation || '4-3-3');
    if (existing.team.tacticalStyle) {
      setTacticalStyle(existing.team.tacticalStyle);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const candidatePositions = getCandidatePositions(positionOnly ? selectedSlot?.role : undefined);
        let response = null as Awaited<ReturnType<typeof fetchPlayers>> | null;
        let usedFilter: string | null = null;

        for (const candidate of candidatePositions) {
          const result = await fetchPlayers({
            q: debouncedQuery || undefined,
            page,
            limit: 24,
            position: candidate ?? undefined,
          });

          response = result;
          usedFilter = candidate;

          if (result.items.length > 0) {
            break;
          }
        }

        if (!active) {
          return;
        }

        setItems(response?.items ?? []);
        setTotalPages(response?.pagination.totalPages ?? 1);
        setAppliedPositionFilter(usedFilter);
      } catch (reason) {
        if (!active) {
          return;
        }
        setError(toApiError(reason).message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [debouncedQuery, page, positionOnly, selectedSlot]);

  const assignedByPlayerId = useMemo(() => {
    const map = new Map<string, string>();
    for (const slot of ALL_SLOTS) {
      const player = assignments[slot.id];
      if (player?.id) {
        map.set(player.id, slot.id);
      }
    }
    return map;
  }, [assignments]);

  const assignedCount = useMemo(
    () => STARTER_SLOTS.filter((slot) => assignments[slot.id]).length,
    [assignments],
  );


  const onAssignPlayer = (player: CatalogPlayer) => {
    if (!selectedSlot) {
      return;
    }

    setAssignments((prev) => {
      const next: AssignmentMap = { ...prev };

      for (const slot of ALL_SLOTS) {
        if (next[slot.id]?.id === player.id) {
          next[slot.id] = null;
        }
      }

      next[selectedSlot.id] = player;
      return next;
    });

    setPickerOpen(false);
  };

  const handleSlotSwap = (fromSlotId: string, toSlotId: string) => {
    if (fromSlotId === toSlotId) {
      return;
    }

    if (!STARTER_SLOT_IDS.has(fromSlotId) || !STARTER_SLOT_IDS.has(toSlotId)) {
      return;
    }

    setAssignments((prev) => {
      const next: AssignmentMap = { ...prev };
      const fromPlayer = next[fromSlotId] ?? null;
      const toPlayer = next[toSlotId] ?? null;
      next[fromSlotId] = toPlayer;
      next[toSlotId] = fromPlayer;
      return next;
    });
  };

  const onSave = () => {
    setSaveError('');

    const missing = STARTER_SLOTS.filter((slot) => !assignments[slot.id]);
    if (missing.length) {
      setSaveError(`Fill all starting slots first. Missing: ${missing.map((slot) => slot.label).join(', ')}`);
      return;
    }

    // tacticalStyle is already in state

    const startersForPayload = STARTER_SLOTS.map((slot) =>
      toPayloadPlayer(assignments[slot.id] as CatalogPlayer, slot.role),
    );

    const benchForPayload = BENCH_SLOTS
      .map((slot) => assignments[slot.id])
      .filter((player): player is CatalogPlayer => Boolean(player))
      .map((player) => toPayloadPlayer(player, player.realPosition));

    const payload = buildSimulationPayloadFromStarters(
      startersForPayload,
      tacticalStyle,
      benchForPayload,
    );

    payload.team.formation = formation;

    saveSquadPayload(payload);
    saveSquadSnapshot(payload);
    navigate('/squad-builder');
  };

  return (
    <div className="min-h-screen bg-[#101415] text-[#e0e3e5] font-['Inter'] pb-24">
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <header className="flex items-center justify-between">
          <button onClick={() => navigate('/squad-builder')} className="text-[#9CA3AF]">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-['Lexend'] text-xl text-[#4be277]">PLAYER SELECTION</h1>
          <div className="text-xs text-[#9CA3AF]">{assignedCount}/11</div>
        </header>

        <section className="rounded-xl border border-[#3d4a3d] bg-[#1d2022] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Active Slot</h2>
            <p className="text-xs text-[#9CA3AF]">Drag cards on field to swap. Click slot to pick player.</p>
          </div>

          <div className="relative w-full aspect-[4/5] bg-[#0a1a12] rounded-lg border border-[#1a3a24] overflow-hidden">
            <div className="absolute inset-0 opacity-20 border border-white/30 m-4 rounded-sm" />
            <div className="absolute top-1/2 left-4 right-4 h-px bg-white/30" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-white/30" />
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-40 h-24 border border-white/30 rounded-b-sm border-t-0" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-40 h-24 border border-white/30 rounded-t-sm border-b-0" />

            {PITCH_LAYOUT.map((layout) => {
              const slot = STARTER_SLOTS.find((item) => item.id === layout.slotId);
              if (!slot) {
                return null;
              }

              const player = assignments[slot.id];
              const active = selectedSlotId === slot.id;
              const over = dragOverSlotId === slot.id;

              return (
                <button
                  key={slot.id}
                  type="button"
                  draggable={Boolean(player)}
                  onDragStart={(event) => {
                    if (!player) {
                      return;
                    }
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/slot-id', slot.id);
                    setDraggedSlotId(slot.id);
                  }}
                  onDragEnd={() => {
                    setDraggedSlotId(null);
                    setDragOverSlotId(null);
                  }}
                  onDragOver={(event) => {
                    if (!draggedSlotId || draggedSlotId === slot.id) {
                      return;
                    }
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    setDragOverSlotId(slot.id);
                  }}
                  onDragLeave={() => {
                    if (dragOverSlotId === slot.id) {
                      setDragOverSlotId(null);
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const fromSlotId = event.dataTransfer.getData('text/slot-id') || draggedSlotId;
                    if (fromSlotId) {
                      handleSlotSwap(fromSlotId, slot.id);
                    }
                    setDraggedSlotId(null);
                    setDragOverSlotId(null);
                  }}
                  onClick={() => {
                    setSelectedSlotId(slot.id);
                    setPickerOpen(true);
                  }}
                  style={{ ...layout.style, zIndex: 10 }}
                  className="flex flex-col items-center"
                >
                  <div
                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${
                      active
                        ? 'border-[#4be277] bg-[#4be27722]'
                        : over
                        ? 'border-[#A3E635] bg-[#A3E63522]'
                        : 'border-[#869585] bg-[#323537]'
                    }`}
                  >
                    <span className="text-[10px] font-bold text-[#e0e3e5]">{player ? player.rating : slot.label}</span>
                  </div>
                  <span className="text-[10px] mt-1 bg-[#1d2022cc] px-1 rounded max-w-[84px] truncate">
                    {player?.name ?? slot.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {ALL_SLOTS.map((slot) => {
              const assigned = assignments[slot.id];
              const active = selectedSlotId === slot.id;
              return (
                <button
                  key={slot.id}
                  onClick={() => {
                    setSelectedSlotId(slot.id);
                    setPickerOpen(true);
                  }}
                  className={`text-left rounded-lg border p-2 ${
                    active ? 'border-[#4be277] bg-[#4be2771f]' : 'border-[#3d4a3d] bg-[#111827]'
                  }`}
                >
                  <p className="text-[11px] text-[#9CA3AF] uppercase">{slot.label}</p>
                  <p className="text-xs mt-1 truncate">{assigned?.name ?? '-'}</p>
                  <p className="text-[11px] text-[#4be277] mt-1">{assigned ? assigned.rating : ''}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-[#3d4a3d] bg-[#1d2022] p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#9CA3AF] mb-1">Formation</p>
              <select
                value={formation}
                onChange={(e) => setFormation(e.target.value)}
                className="w-full bg-[#111827] border border-[#334155] rounded-lg px-3 py-2 outline-none focus:border-[#4be277]"
              >
                <option>4-3-3</option>
                <option>4-2-3-1</option>
                <option>4-4-2</option>
                <option>4-1-4-1</option>
                <option>5-3-2</option>
              </select>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-[#9CA3AF] mb-1">Tactical Preset</p>
              <select
                value={tacticalStyle}
                onChange={(e) => setTacticalStyle(e.target.value as TacticalStyle)}
                className="w-full bg-[#111827] border border-[#334155] rounded-lg px-3 py-2 outline-none focus:border-[#4be277]"
              >
                <option value="BALANCED">Balanced</option>
                <option value="HIGH_PRESS">High Press</option>
                <option value="COUNTER">Counter Attack</option>
                <option value="LOW_BLOCK">Low Block</option>
                <option value="POSSESSION">Possession</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-[#3d4a3d] bg-[#111827] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#4be277] uppercase font-['Lexend']">Team Diagnostics</h3>
              {diagnostics && diagnostics.vulnerabilities.length > 0 && (
                <span className="bg-[#ffb4ab]/20 text-[#ffb4ab] text-[10px] px-2 py-0.5 rounded border border-[#ffb4ab]/30">
                  {diagnostics.vulnerabilities.length} Issues
                </span>
              )}
            </div>

            {!diagnostics ? (
              <p className="text-xs text-[#9CA3AF]">Fill starting XI to see diagnostics.</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-[#0f172a] rounded p-2 border border-[#1e293b]">
                    <p className="text-[10px] text-[#9CA3AF] uppercase">Control</p>
                    <p className="text-lg font-bold text-[#e0e3e5]">{diagnostics.control}</p>
                  </div>
                  <div className="bg-[#0f172a] rounded p-2 border border-[#1e293b]">
                    <p className="text-[10px] text-[#9CA3AF] uppercase">Chance Creation</p>
                    <p className="text-lg font-bold text-[#e0e3e5]">{diagnostics.chanceCreation}</p>
                  </div>
                  <div className="bg-[#0f172a] rounded p-2 border border-[#1e293b]">
                    <p className="text-[10px] text-[#9CA3AF] uppercase">Defensive Wall</p>
                    <p className="text-lg font-bold text-[#e0e3e5]">{diagnostics.defensiveWall}</p>
                  </div>
                  <div className="bg-[#0f172a] rounded p-2 border border-[#1e293b]">
                    <p className="text-[10px] text-[#9CA3AF] uppercase">Transition Def</p>
                    <p className="text-lg font-bold text-[#e0e3e5]">{diagnostics.transitionDefense}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#0f172a] rounded p-2 border border-[#1e293b]">
                    <p className="text-[10px] text-[#9CA3AF] uppercase">Left Flank Risk</p>
                    <p className={`text-sm font-bold ${diagnostics.flankSecurity.left < 50 ? 'text-[#ffb4ab]' : 'text-[#4be277]'}`}>
                      {diagnostics.flankSecurity.left < 40 ? 'High' : diagnostics.flankSecurity.left < 60 ? 'Medium' : 'Low'} ({diagnostics.flankSecurity.left})
                    </p>
                  </div>
                  <div className="bg-[#0f172a] rounded p-2 border border-[#1e293b]">
                    <p className="text-[10px] text-[#9CA3AF] uppercase">Right Flank Risk</p>
                    <p className={`text-sm font-bold ${diagnostics.flankSecurity.right < 50 ? 'text-[#ffb4ab]' : 'text-[#4be277]'}`}>
                      {diagnostics.flankSecurity.right < 40 ? 'High' : diagnostics.flankSecurity.right < 60 ? 'Medium' : 'Low'} ({diagnostics.flankSecurity.right})
                    </p>
                  </div>
                </div>

                {diagnostics.vulnerabilities.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {diagnostics.vulnerabilities.map((vuln: any, idx) => (
                      <div key={idx} className="flex gap-2 items-start bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 p-3 rounded text-sm">
                        <span className="material-symbols-outlined text-[#ffb4ab] text-sm mt-0.5 shrink-0">warning</span>
                        <div className="space-y-1">
                          <p className="text-[#ffb4ab] font-bold text-[11px] uppercase tracking-wider">{vuln.type.replace(/_/g, ' ')}</p>
                          <p className="text-[#e0e3e5] text-xs">{vuln.message}</p>
                          {vuln.suggestedActions && vuln.suggestedActions.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-[#ffb4ab]/20">
                              <p className="text-[10px] text-[#ffb4ab]/80 uppercase mb-1 font-semibold">Suggested Action</p>
                              <ul className="text-[11px] text-[#9CA3AF] list-disc list-inside">
                                {vuln.suggestedActions.map((action: string, aidx: number) => (
                                  <li key={aidx}>{action}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 items-center">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by player name..."
              className="flex-1 bg-[#111827] border border-[#334155] rounded-lg px-3 py-2 outline-none focus:border-[#4be277]"
            />
            <label className="text-xs flex items-center gap-2 text-[#9CA3AF]">
              <input
                type="checkbox"
                checked={positionOnly}
                onChange={(e) => {
                  setPositionOnly(e.target.checked);
                  setPage(1);
                }}
              />
              Position filter
            </label>
          </div>

          {error && <p className="text-sm text-[#ffb4ab]">{error}</p>}

          {pickerOpen ? (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
              <div className="w-full max-w-4xl rounded-xl border border-[#3d4a3d] bg-[#0f172a] p-4 max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-['Lexend'] text-lg">Pick player for {selectedSlot?.label}</h3>
                  <button onClick={() => setPickerOpen(false)} className="text-[#9CA3AF]">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                {positionOnly && selectedSlot?.role && appliedPositionFilter && appliedPositionFilter !== selectedSlot.role ? (
                  <p className="text-xs text-[#9CA3AF] mb-3">
                    No exact {selectedSlot.role} list in dataset. Showing closest position: {appliedPositionFilter}.
                  </p>
                ) : null}

                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search player..."
                    className="flex-1 rounded-lg border border-[#334155] bg-[#0b1220] px-3 py-2 text-sm outline-none focus:border-[#4be277]"
                  />
                  <label className="text-xs flex items-center gap-2 text-[#9CA3AF]">
                    <input
                      type="checkbox"
                      checked={positionOnly}
                      onChange={(e) => {
                        setPositionOnly(e.target.checked);
                        setPage(1);
                      }}
                    />
                    Position filter
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {items.map((player) => {
                    const assignedSlotId = assignedByPlayerId.get(player.id);
                    const assignedElsewhere = Boolean(assignedSlotId && assignedSlotId !== selectedSlot?.id);

                    return (
                      <button
                        key={player.id}
                        onClick={() => {
                          if (!assignedElsewhere) {
                            onAssignPlayer(player);
                          }
                        }}
                        disabled={assignedElsewhere}
                        className={`relative overflow-hidden rounded-xl border p-2 text-left transition ${
                          assignedElsewhere
                            ? 'border-[#475569] bg-[#090f1b] opacity-65 cursor-not-allowed'
                            : 'border-[#1f2e4d] bg-gradient-to-b from-[#0d1b37] via-[#08142b] to-[#061026] hover:border-[#4be277] hover:shadow-[0_0_0_1px_rgba(75,226,119,0.3),0_12px_22px_rgba(4,20,44,0.55)]'
                        }`}
                      >
                        <div className="absolute -top-8 -right-6 h-20 w-20 rounded-full bg-[#4be2771a]" />
                        <div className="relative flex items-start justify-between">
                          <div className="flex items-start gap-2 min-w-0">
                            <PlayerPortrait name={player.name} faceUrl={player.faceUrl} />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#e5efff]">{player.name}</p>
                              <p className="mt-0.5 text-[11px] text-[#8fa5c8]">{player.realPosition}</p>
                            </div>
                          </div>
                          <div className="rounded-md border border-[#4be27766] bg-[#0d2c1d] px-2 py-0.5 text-sm font-bold text-[#4be277]">
                            {player.rating}
                          </div>
                        </div>
                        <p className="mt-2 text-[11px] text-[#9fb0cb]">
                          {player.preferredFoot} foot • WR {player.attackWorkRate}/{player.defenseWorkRate}
                        </p>
                        <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
                          <StatChip label="PAC" value={player.pac} />
                          <StatChip label="SHO" value={player.sho} />
                          <StatChip label="PAS" value={player.pas} />
                          <StatChip label="DRI" value={player.dri} />
                          <StatChip label="DEF" value={player.def} />
                          <StatChip label="PHY" value={player.phy} />
                        </div>
                        {assignedElsewhere ? (
                          <p className="text-[11px] text-[#F59E0B] mt-2">
                            Assigned to {SLOT_LABEL_BY_ID[assignedSlotId ?? ''] ?? assignedSlotId}
                          </p>
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                {!loading && items.length === 0 ? (
                  <div className="mt-3 rounded-lg border border-[#334155] bg-[#111827] p-4">
                    <p className="text-sm text-[#e0e3e5]">No players found for this filter.</p>
                    {positionOnly ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPositionOnly(false);
                          setPage(1);
                        }}
                        className="mt-3 rounded-lg border border-[#4be277] px-3 py-2 text-sm text-[#4be277] hover:bg-[#4be2771f]"
                      >
                        Show all players
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-2 rounded-lg border border-[#3d4a3d] disabled:opacity-50"
            >
              Prev
            </button>
            <p className="text-sm text-[#9CA3AF]">
              Page {page} / {totalPages}
            </p>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-2 rounded-lg border border-[#3d4a3d] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </section>

        {saveError && <p className="text-sm text-[#ffb4ab]">{saveError}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/player-profile')}
            className="w-full rounded-xl border border-[#3d4a3d] bg-[#111827] py-4 font-['Lexend'] text-[#e0e3e5] font-semibold uppercase"
          >
            Open Player Profile
          </button>
          <button
            onClick={onSave}
            className="w-full bg-[#4be277] text-[#003915] py-4 rounded-xl font-['Lexend'] font-semibold uppercase"
          >
            Save Squad Selection
          </button>
        </div>
      </main>
      <MobileBottomNav active="squad" />
    </div>
  );
}

function buildInitialAssignments(): AssignmentMap {
  const base: AssignmentMap = {};
  for (const slot of ALL_SLOTS) {
    base[slot.id] = null;
  }

  const payload = loadSquadPayload();
  if (!payload?.team?.players?.length) {
    return base;
  }

  const starters = payload.team.players.filter((player) => !player.isSubstitute);
  const bench = payload.team.players.filter((player) => player.isSubstitute);

  for (const slot of STARTER_SLOTS) {
    const byRole = starters.find((player) => player.rolePosition.toUpperCase() === slot.role);
    const fallback = starters.find((player) => player.naturalPosition.toUpperCase() === slot.role);
    const source = byRole ?? fallback;
    if (source) {
      base[slot.id] = simulationPlayerToCatalogPlayer(source);
    }
  }

  BENCH_SLOTS.forEach((slot, idx) => {
    const source = bench[idx];
    if (source) {
      base[slot.id] = simulationPlayerToCatalogPlayer(source);
    }
  });

  return base;
}

function simulationPlayerToCatalogPlayer(player: {
  id: string;
  name: string;
  naturalPosition: string;
  preferredPositions: string[];
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
  stamina: number;
  attackWorkRate: 'LOW' | 'MEDIUM' | 'HIGH';
  defenseWorkRate: 'LOW' | 'MEDIUM' | 'HIGH';
}): CatalogPlayer {
  const rating = Math.round((player.pac + player.sho + player.pas + player.dri + player.def + player.phy) / 6);
  return {
    id: player.id,
    name: player.name,
    fullName: player.name,
    faceUrl: null,
    age: null,
    realPosition: player.naturalPosition,
    preferredPositions: player.preferredPositions ?? [player.naturalPosition],
    rating,
    potential: rating,
    pac: player.pac,
    sho: player.sho,
    pas: player.pas,
    dri: player.dri,
    def: player.def,
    phy: player.phy,
    stamina: player.stamina,
    attackWorkRate: player.attackWorkRate,
    defenseWorkRate: player.defenseWorkRate,
    preferredFoot: 'RIGHT',
    weakFoot: 3,
    skillMoves: 3,
  };
}

function toPayloadPlayer(player: CatalogPlayer, rolePosition: string) {
  return {
    id: player.id,
    name: player.name,
    rating: player.rating,
    naturalPosition: player.realPosition.toUpperCase(),
    rolePosition: rolePosition.toUpperCase(),
    preferredPositions: player.preferredPositions.length
      ? player.preferredPositions.map((value) => value.toUpperCase())
      : [player.realPosition.toUpperCase()],
    pac: player.pac,
    sho: player.sho,
    pas: player.pas,
    dri: player.dri,
    def: player.def,
    phy: player.phy,
    stamina: player.stamina,
    attackWorkRate: player.attackWorkRate,
    defenseWorkRate: player.defenseWorkRate,
  };
}


function getCandidatePositions(role?: string): Array<string | null> {
  if (!role) {
    return [null];
  }

  const normalized = role.toUpperCase();
  const fallbackMap: Record<string, string[]> = {
    LCM: ['CM', 'CAM', 'CDM'],
    RCM: ['CM', 'CAM', 'CDM'],
    LCB: ['CB'],
    RCB: ['CB'],
  };

  const fallbacks = fallbackMap[normalized] ?? [];
  return [normalized, ...fallbacks];
}

function PlayerPortrait({ name, faceUrl }: { name: string; faceUrl?: string | null }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-[#345083] bg-[#091123]">
      {faceUrl ? (
        <img
          src={faceUrl}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
      <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-[#9cb2da]">
        {initials || 'P'}
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-[#21355f] bg-[#0a1831] px-1.5 py-1 text-center">
      <span className="text-[#6f86b0]">{label}</span>{' '}
      <span className="font-semibold text-[#d7e5ff]">{value}</span>
    </div>
  );
}

function SliderCompact({
  label,
  value,
  setValue,
}: {
  label: string;
  value: number;
  setValue: (value: number) => void;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-[#9CA3AF] mb-1">{label}: {value}</p>
      <input
        type="range"
        min={1}
        max={100}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full h-1 bg-[#334155] rounded appearance-none accent-[#4be277]"
      />
    </div>
  );
}

function FlankIndicator({
  title,
  attack,
  defense,
}: {
  title: string;
  attack: number;
  defense: number;
}) {
  const defenseColor = defense < 52 ? '#EF4444' : '#22C55E';
  const attackColor = attack > 68 ? '#A3E635' : '#22C55E';

  return (
    <div className="rounded-lg border border-[#334155] bg-[#111827] p-3">
      <p className="text-xs text-[#9CA3AF] mb-2">{title}</p>
      <div className="space-y-2">
        <MetricBar label="Attack" value={attack} color={attackColor} />
        <MetricBar label="Defense" value={defense} color={defenseColor} />
      </div>
    </div>
  );
}

function MetricBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const safe = Math.max(1, Math.min(99, value));
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-[#9CA3AF]">{label}</span>
        <span>{safe}</span>
      </div>
      <div className="h-1 rounded bg-[#334155] overflow-hidden">
        <div className="h-full" style={{ width: `${safe}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
