import { useEffect, useMemo, useState, useRef } from 'react';
import type { CSSProperties } from 'react';
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
import AppShell from '../components/AppShell';
import PlayerCard from '../components/PlayerCard';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';

type Slot = {
  id: string;
  label: string;
  role: string;
  starter: boolean;
};

type AssignmentMap = Record<string, CatalogPlayer | null>;

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
const SLOT_LABEL_BY_ID = Object.fromEntries(ALL_SLOTS.map((slot) => [slot.id, slot.label])) as Record<string, string>;

const FORMATION_LAYOUTS: Record<string, { slotId: string, x: number, y: number }[]> = {
  '4-3-3': [
    { slotId: 'lw', x: 14, y: 15 }, { slotId: 'st', x: 50, y: 8 }, { slotId: 'rw', x: 86, y: 15 },
    { slotId: 'lcm', x: 25, y: 40 }, { slotId: 'cdm', x: 50, y: 55 }, { slotId: 'rcm', x: 75, y: 40 },
    { slotId: 'lb', x: 14, y: 75 }, { slotId: 'lcb', x: 35, y: 75 }, { slotId: 'rcb', x: 65, y: 75 }, { slotId: 'rb', x: 86, y: 75 },
    { slotId: 'gk', x: 50, y: 94 },
  ],
  '4-2-3-1': [
    { slotId: 'lw', x: 20, y: 35 }, { slotId: 'st', x: 50, y: 10 }, { slotId: 'rw', x: 80, y: 35 },
    { slotId: 'lcm', x: 35, y: 55 }, { slotId: 'cdm', x: 50, y: 35 }, { slotId: 'rcm', x: 65, y: 55 },
    { slotId: 'lb', x: 14, y: 75 }, { slotId: 'lcb', x: 35, y: 75 }, { slotId: 'rcb', x: 65, y: 75 }, { slotId: 'rb', x: 86, y: 75 },
    { slotId: 'gk', x: 50, y: 94 },
  ],
  '4-4-2': [
    { slotId: 'lw', x: 15, y: 45 }, { slotId: 'st', x: 35, y: 15 }, { slotId: 'rw', x: 85, y: 45 },
    { slotId: 'lcm', x: 35, y: 45 }, { slotId: 'cdm', x: 65, y: 15 }, { slotId: 'rcm', x: 65, y: 45 },
    { slotId: 'lb', x: 14, y: 75 }, { slotId: 'lcb', x: 35, y: 75 }, { slotId: 'rcb', x: 65, y: 75 }, { slotId: 'rb', x: 86, y: 75 },
    { slotId: 'gk', x: 50, y: 94 },
  ],
  '4-1-4-1': [
    { slotId: 'lw', x: 15, y: 35 }, { slotId: 'st', x: 50, y: 10 }, { slotId: 'rw', x: 85, y: 35 },
    { slotId: 'lcm', x: 35, y: 35 }, { slotId: 'cdm', x: 50, y: 55 }, { slotId: 'rcm', x: 65, y: 35 },
    { slotId: 'lb', x: 14, y: 75 }, { slotId: 'lcb', x: 35, y: 75 }, { slotId: 'rcb', x: 65, y: 75 }, { slotId: 'rb', x: 86, y: 75 },
    { slotId: 'gk', x: 50, y: 94 },
  ],
  '5-3-2': [
    { slotId: 'lw', x: 15, y: 50 }, { slotId: 'st', x: 35, y: 15 }, { slotId: 'rw', x: 85, y: 50 },
    { slotId: 'lcm', x: 35, y: 45 }, { slotId: 'cdm', x: 65, y: 15 }, { slotId: 'rcm', x: 65, y: 45 },
    { slotId: 'lb', x: 20, y: 75 }, { slotId: 'lcb', x: 50, y: 75 }, { slotId: 'rcb', x: 80, y: 75 }, { slotId: 'rb', x: 35, y: 75 },
    { slotId: 'gk', x: 50, y: 94 },
  ],
  '3-5-2': [
    { slotId: 'lw', x: 15, y: 35 }, { slotId: 'st', x: 35, y: 15 }, { slotId: 'rw', x: 85, y: 35 },
    { slotId: 'lcm', x: 35, y: 50 }, { slotId: 'cdm', x: 65, y: 15 }, { slotId: 'rcm', x: 65, y: 50 },
    { slotId: 'lb', x: 50, y: 35 }, { slotId: 'lcb', x: 20, y: 75 }, { slotId: 'rcb', x: 80, y: 75 }, { slotId: 'rb', x: 50, y: 75 },
    { slotId: 'gk', x: 50, y: 94 },
  ]
};

const INITIAL_PITCH_LAYOUT = FORMATION_LAYOUTS['4-3-3'];

export function getRoleFromZone(x: number, y: number, defaultRole: string): string {
  if (defaultRole === 'GK') return 'GK';
  
  const isLeft = x < 33;
  const isRight = x > 66;
  
  const isAttack = y < 33;
  const isMid = y >= 33 && y <= 66;
  const isDefense = y > 66;
  
  if (isAttack) {
    if (isLeft) return 'LW';
    if (isRight) return 'RW';
    return 'ST';
  }
  
  if (isMid) {
    if (isLeft) return 'LM';
    if (isRight) return 'RM';
    return y < 50 ? 'CAM' : (y > 60 ? 'CDM' : 'CM');
  }
  
  if (isDefense) {
    if (isLeft) return y < 75 ? 'LWB' : 'LB';
    if (isRight) return y < 75 ? 'RWB' : 'RB';
    return 'CB';
  }
  
  return defaultRole;
}

export default function PlayerSelection() {
  const navigate = useNavigate();

  const [selectedSlotId, setSelectedSlotId] = useState<string>(STARTER_SLOTS[0]?.id ?? 'lw');
  const [assignments, setAssignments] = useState<AssignmentMap>(() => buildInitialAssignments());

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [positionOnly, setPositionOnly] = useState(false);
  const [items, setItems] = useState<CatalogPlayer[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [appliedPositionFilter, setAppliedPositionFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');

  const [pickerOpen, setPickerOpen] = useState(false);
  const [formation, setFormation] = useState('4-3-3');
  const [tacticalStyle, setTacticalStyle] = useState<TacticalStyle>('BALANCED');

  const [activeDragPlayer, setActiveDragPlayer] = useState<CatalogPlayer | null>(null);
  const [activeDragSlot, setActiveDragSlot] = useState<Slot | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [pitchLayout, setPitchLayout] = useState(INITIAL_PITCH_LAYOUT);
  const pitchRef = useRef<HTMLDivElement>(null);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 5,
    },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 150,
      tolerance: 5,
    },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  const onDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data && data.player) {
      setActiveDragPlayer(data.player);
      const slot = ALL_SLOTS.find((s) => s.id === data.slotId);
      if (slot) setActiveDragSlot(slot);
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    const fromSlotId = active.data.current?.slotId;
    
    if (!fromSlotId) return;

    if (isEditMode) {
      if (String(active.id).startsWith('pitch-')) {
        const pitchRect = pitchRef.current?.getBoundingClientRect();
        if (pitchRect) {
          setPitchLayout((prev) =>
            prev.map((item) => {
              if (item.slotId === fromSlotId) {
                const deltaXPct = (delta.x / pitchRect.width) * 100;
                const deltaYPct = (delta.y / pitchRect.height) * 100;
                return {
                  ...item,
                  x: Math.max(5, Math.min(95, item.x + deltaXPct)),
                  y: Math.max(5, Math.min(95, item.y + deltaYPct)),
                };
              }
              return item;
            }),
          );
        }
      }
    } else {
      if (over && over.data.current?.slotId) {
        const toSlotId = over.data.current.slotId;
        if (fromSlotId !== toSlotId) {
          handleSlotSwap(fromSlotId, toSlotId);
        }
      }
    }
    setActiveDragPlayer(null);
    setActiveDragSlot(null);
  };

  const onDragCancel = () => {
    setActiveDragPlayer(null);
    setActiveDragSlot(null);
  };

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

      const startersForPayload = STARTER_SLOTS.map((slot) => {
        const layoutPos = pitchLayout.find((p) => p.slotId === slot.id);
        const computedRole = layoutPos ? getRoleFromZone(layoutPos.x, layoutPos.y, slot.role) : slot.role;
        return toPayloadPlayer(assignments[slot.id] as CatalogPlayer, computedRole);
      });

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
  }, [assignments, formation, tacticalStyle, pitchLayout]);

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

    // Allow bench swaps

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

    const startersForPayload = STARTER_SLOTS.map((slot) => {
      const layoutPos = pitchLayout.find((p) => p.slotId === slot.id);
      const computedRole = layoutPos ? getRoleFromZone(layoutPos.x, layoutPos.y, slot.role) : slot.role;
      return toPayloadPlayer(assignments[slot.id] as CatalogPlayer, computedRole);
    });

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
    <AppShell
      title="ВЫБОР ИГРОКОВ"
      showBackButton
      backTo="/squad-builder"
      hideBottomNav={pickerOpen}
      activeTab="squad"
      headerRightElement={<div className="text-xs text-[#9CA3AF] font-bold px-2">{assignedCount}/11</div>}
      contentClassName="px-4 py-6 space-y-5"
    >

        <section className="rounded-xl border border-[#3d4a3d] bg-[#1d2022] p-4 space-y-3">
          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
            <div className="flex flex-col gap-2 mb-2">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Схема на поле</h2>
                <button
                  type="button"
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={`text-xs px-3 py-1 rounded-full font-bold transition-colors ${
                    isEditMode ? 'bg-[#ffb4ab] text-[#1d2022]' : 'bg-[#3d4a3d] text-white'
                  }`}
                >
                  {isEditMode ? 'Закончить ред.' : 'Edit Formation'}
                </button>
              </div>
              <p className="text-xs text-[#9CA3AF]">
                {isEditMode 
                  ? 'Свободно перемещайте позиции по полю для кастомной схемы.'
                  : 'Перетаскивай карточки для замен. Нажми слот, чтобы выбрать игрока.'}
              </p>
              {isEditMode && (
                <button
                  type="button"
                  onClick={() => setPitchLayout(INITIAL_PITCH_LAYOUT)}
                  className="text-[10px] uppercase text-[#ffb4ab] self-start"
                >
                  Сбросить схему
                </button>
              )}
            </div>

            <div ref={pitchRef} className="relative w-full aspect-[4/5] bg-[#0a1a12] rounded-lg border border-[#1a3a24] overflow-hidden">
              <div className="absolute inset-0 opacity-20 border border-white/30 m-4 rounded-sm" />
              <div className="absolute top-1/2 left-4 right-4 h-px bg-white/30" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-white/30" />
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-40 h-24 border border-white/30 rounded-b-sm border-t-0" />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-40 h-24 border border-white/30 rounded-t-sm border-b-0" />

              {pitchLayout.map((layout) => {
                const slot = STARTER_SLOTS.find((item) => item.id === layout.slotId);
                if (!slot) return null;

                const player = assignments[slot.id];
                const active = selectedSlotId === slot.id;

                return (
                  <DraggablePitchSlot
                    key={slot.id}
                    slot={slot}
                    player={player}
                    active={active}
                    style={{ position: 'absolute', top: `${layout.y}%`, left: `${layout.x}%`, transform: 'translate(-50%, -50%)' }}
                    onClick={() => {
                      setSelectedSlotId(slot.id);
                      setPickerOpen(true);
                    }}
                  />
                );
              })}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {ALL_SLOTS.map((slot) => {
                const assigned = assignments[slot.id];
                const active = selectedSlotId === slot.id;
                return (
                  <DraggableListSlot
                    key={slot.id}
                    slot={slot}
                    player={assigned}
                    active={active}
                    onClick={() => {
                      setSelectedSlotId(slot.id);
                      setPickerOpen(true);
                    }}
                  />
                );
              })}
            </div>

            <DragOverlay dropAnimation={null}>
              {activeDragPlayer && activeDragSlot ? (
                <div className="w-12 h-12 rounded-full border-2 border-[#4be277] bg-[#4be277aa] flex items-center justify-center scale-110 shadow-lg">
                  <span className="text-[10px] font-bold text-[#e0e3e5]">{activeDragPlayer.rating}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </section>

        <section className="rounded-xl border border-[#3d4a3d] bg-[#1d2022] p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#9CA3AF] mb-1">Схема</p>
              <select
                value={formation}
                onChange={(e) => {
                  const newFormation = e.target.value;
                  setFormation(newFormation);
                  if (FORMATION_LAYOUTS[newFormation]) {
                    setPitchLayout(FORMATION_LAYOUTS[newFormation]);
                  }
                }}
                className="w-full bg-[#111827] border border-[#334155] rounded-lg px-3 py-2 outline-none focus:border-[#4be277]"
              >
                <option>4-3-3</option>
                <option>4-2-3-1</option>
                <option>4-4-2</option>
                <option>4-1-4-1</option>
                <option>5-3-2</option>
                <option>3-5-2</option>
              </select>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-[#9CA3AF] mb-1">Тактический пресет</p>
              <select
                value={tacticalStyle}
                onChange={(e) => setTacticalStyle(e.target.value as TacticalStyle)}
                className="w-full bg-[#111827] border border-[#334155] rounded-lg px-3 py-2 outline-none focus:border-[#4be277]"
              >
                <option value="BALANCED">Сбалансированный</option>
                <option value="HIGH_PRESS">Высокий прессинг</option>
                <option value="COUNTER">Контратаки</option>
                <option value="LOW_BLOCK">Низкий блок</option>
                <option value="POSSESSION">Контроль мяча</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-[#3d4a3d] bg-[#111827] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#4be277] uppercase font-['Lexend']">Диагностика команды</h3>
              {diagnostics && diagnostics.vulnerabilities.length > 0 && (
                <span className="bg-[#ffb4ab]/20 text-[#ffb4ab] text-[10px] px-2 py-0.5 rounded border border-[#ffb4ab]/30">
                  {diagnostics.vulnerabilities.length} проблем
                </span>
              )}
            </div>

            {!diagnostics ? (
              <p className="text-xs text-[#9CA3AF]">Заполни стартовый состав, чтобы увидеть диагностику.</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-[#0f172a] rounded p-2 border border-[#1e293b]">
                    <p className="text-[10px] text-[#9CA3AF] uppercase">Control</p>
                    <p className="text-lg font-bold text-[#e0e3e5]">{diagnostics.control}</p>
                  </div>
                  <div className="bg-[#0f172a] rounded p-2 border border-[#1e293b]">
                    <p className="text-[10px] text-[#9CA3AF] uppercase">Создание моментов</p>
                    <p className="text-lg font-bold text-[#e0e3e5]">{diagnostics.chanceCreation}</p>
                  </div>
                  <div className="bg-[#0f172a] rounded p-2 border border-[#1e293b]">
                    <p className="text-[10px] text-[#9CA3AF] uppercase">Оборонительный блок</p>
                    <p className="text-lg font-bold text-[#e0e3e5]">{diagnostics.defensiveWall}</p>
                  </div>
                  <div className="bg-[#0f172a] rounded p-2 border border-[#1e293b]">
                    <p className="text-[10px] text-[#9CA3AF] uppercase">Переходная оборона</p>
                    <p className="text-lg font-bold text-[#e0e3e5]">{diagnostics.transitionDefense}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#0f172a] rounded p-2 border border-[#1e293b]">
                    <p className="text-[10px] text-[#9CA3AF] uppercase">Риск левого фланга</p>
                    <p className={`text-sm font-bold ${diagnostics.flankSecurity.left < 50 ? 'text-[#ffb4ab]' : 'text-[#4be277]'}`}>
                      {diagnostics.flankSecurity.left < 40 ? 'Высокий' : diagnostics.flankSecurity.left < 60 ? 'Средний' : 'Низкий'} ({diagnostics.flankSecurity.left})
                    </p>
                  </div>
                  <div className="bg-[#0f172a] rounded p-2 border border-[#1e293b]">
                    <p className="text-[10px] text-[#9CA3AF] uppercase">Риск правого фланга</p>
                    <p className={`text-sm font-bold ${diagnostics.flankSecurity.right < 50 ? 'text-[#ffb4ab]' : 'text-[#4be277]'}`}>
                      {diagnostics.flankSecurity.right < 40 ? 'Высокий' : diagnostics.flankSecurity.right < 60 ? 'Средний' : 'Низкий'} ({diagnostics.flankSecurity.right})
                    </p>
                  </div>
                </div>

                {diagnostics.vulnerabilities.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {diagnostics.vulnerabilities.map((vuln: any, idx) => (
                      <div key={idx} className="flex gap-2 items-start bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 p-3 rounded text-sm">
                        <span className="material-symbols-outlined text-[#ffb4ab] text-sm mt-0.5 shrink-0">warning</span>
                        <div className="space-y-1">
                          <p className="text-[#ffb4ab] font-bold text-[11px] uppercase tracking-wider">{vuln.type?.replace(/_/g, ' ') || 'WARNING'}</p>
                          <p className="text-[#e0e3e5] text-xs">{vuln.message}</p>
                          {vuln.suggestedActions && vuln.suggestedActions.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-[#ffb4ab]/20">
                              <p className="text-[10px] text-[#ffb4ab]/80 uppercase mb-1 font-semibold">Рекомендуемое действие</p>
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
              placeholder="Поиск по имени игрока..."
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
              Фильтр по позиции
            </label>
          </div>

          {error && <p className="text-sm text-[#ffb4ab]">{error}</p>}

          {pickerOpen ? (
            <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
              <div className="w-full max-w-4xl rounded-xl border border-[#3d4a3d] bg-[#0f172a] p-4 max-h-[88vh] overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-['Lexend'] text-lg">Выбери игрока для {selectedSlot?.label}</h3>
                  <button onClick={() => setPickerOpen(false)} className="text-[#9CA3AF]">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                {positionOnly && selectedSlot?.role && appliedPositionFilter && appliedPositionFilter !== selectedSlot.role ? (
                  <p className="text-xs text-[#9CA3AF] mb-3">
                    Нет точного списка для {selectedSlot.role} в базе. Показываем ближайшую позицию: {appliedPositionFilter}.
                  </p>
                ) : null}

                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Поиск игрока..."
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
                    Фильтр по позиции
                  </label>
                </div>

                {loading ? (
                  <div className="mb-3 rounded-lg border border-[#334155] bg-[#111827] p-3 text-sm text-[#9CA3AF]">
                    Загружаю игроков...
                  </div>
                ) : null}

                {error ? (
                  <div className="mb-3 rounded-lg border border-[#7e3b3b] bg-[#381b1b] p-3 text-sm text-[#f8adad]">
                    {error}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
                        className={`text-left transition ${
                          assignedElsewhere ? 'cursor-not-allowed' : 'hover:scale-[1.01]'
                        }`}
                      >
                        <PlayerCard
                          player={player}
                          slotRole={selectedSlot?.role}
                          disabled={assignedElsewhere}
                          assignedLabel={
                            assignedElsewhere
                              ? `Назначен в ${SLOT_LABEL_BY_ID[assignedSlotId ?? ''] ?? assignedSlotId}`
                              : undefined
                          }
                        />
                      </button>
                    );
                  })}
                </div>

                {!loading && items.length === 0 ? (
                  <div className="mt-3 rounded-lg border border-[#334155] bg-[#111827] p-4">
                    <p className="text-sm text-[#e0e3e5]">По этому фильтру игроки не найдены.</p>
                    {positionOnly ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPositionOnly(false);
                          setPage(1);
                        }}
                        className="mt-3 rounded-lg border border-[#4be277] px-3 py-2 text-sm text-[#4be277] hover:bg-[#4be2771f]"
                      >
                        Показать всех игроков
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
              Назад
            </button>
            <p className="text-sm text-[#9CA3AF]">
              Страница {page} / {totalPages}
            </p>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-2 rounded-lg border border-[#3d4a3d] disabled:opacity-50"
            >
              Вперед
            </button>
          </div>
        </section>

        {saveError && <p className="text-sm text-[#ffb4ab]">{saveError}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/player-profile')}
            className="w-full rounded-xl border border-[#3d4a3d] bg-[#111827] py-4 font-['Lexend'] text-[#e0e3e5] font-semibold uppercase"
          >
            Открыть профиль игрока
          </button>
          <button
            onClick={onSave}
            className="w-full bg-[#4be277] text-[#003915] py-4 rounded-xl font-['Lexend'] font-semibold uppercase"
          >
            Сохранить выбор состава
          </button>
        </div>
    </AppShell>
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
  preferredPositions?: string[];
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
    displayName: player.name,
    id: player.id,
    name: player.name,
    playerType: 'CURRENT',
    primaryPosition: player.naturalPosition.toUpperCase(),
    positions: (player.preferredPositions ?? [player.naturalPosition]).map((value) => value.toUpperCase()),
    fullName: player.name,
    cardType: undefined,
    rarity: undefined,
    nationality: undefined,
    heightCm: undefined,
    faceUrl: null,
    photoUrl: undefined,
    hasPhoto: false,
    tags: [],
    age: undefined,
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
    naturalPosition: player.primaryPosition.toUpperCase(),
    rolePosition: rolePosition.toUpperCase(),
    preferredPositions: player.positions.length
      ? player.positions.map((value) => value.toUpperCase())
      : [player.primaryPosition.toUpperCase()],
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

function DraggablePitchSlot({
  slot,
  player,
  active,
  style,
  onClick,
}: {
  slot: Slot;
  player: CatalogPlayer | null;
  active: boolean;
  style: CSSProperties;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef: setDraggableRef, isDragging } = useDraggable({
    id: `pitch-${slot.id}`,
    data: { slotId: slot.id, player },
    disabled: !player,
  });

  const { isOver, setNodeRef: setDroppableRef } = useDroppable({
    id: `pitch-drop-${slot.id}`,
    data: { slotId: slot.id },
  });

  const setRef = (node: HTMLElement | null) => {
    setDraggableRef(node);
    setDroppableRef(node);
  };

  return (
    <button
      ref={setRef}
      type="button"
      onClick={onClick}
      style={{ ...style, zIndex: isDragging ? 50 : 10, opacity: isDragging ? 0.3 : 1 }}
      className="flex flex-col items-center touch-none"
      {...listeners}
      {...attributes}
    >
      <div
        className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${
          active
            ? 'border-[#4be277] bg-[#4be27722]'
            : isOver
            ? 'border-[#A3E635] bg-[#A3E63544] scale-110'
            : 'border-[#869585] bg-[#323537]'
        } transition-all duration-200`}
      >
        <span className="text-[10px] font-bold text-[#e0e3e5]">{player ? player.rating : slot.label}</span>
      </div>
      <span className="text-[10px] mt-1 bg-[#1d2022cc] px-1 rounded max-w-[84px] truncate pointer-events-none">
        {player?.name ?? slot.label}
      </span>
    </button>
  );
}

function DraggableListSlot({
  slot,
  player,
  active,
  onClick,
}: {
  slot: Slot;
  player: CatalogPlayer | null;
  active: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef: setDraggableRef, isDragging } = useDraggable({
    id: `list-${slot.id}`,
    data: { slotId: slot.id, player },
    disabled: !player,
  });

  const { isOver, setNodeRef: setDroppableRef } = useDroppable({
    id: `list-drop-${slot.id}`,
    data: { slotId: slot.id },
  });

  const setRef = (node: HTMLElement | null) => {
    setDraggableRef(node);
    setDroppableRef(node);
  };

  return (
    <button
      ref={setRef}
      type="button"
      onClick={onClick}
      className={`text-left rounded-lg border p-2 touch-none transition-all duration-200 ${
        active ? 'border-[#4be277] bg-[#4be2771f]' : isOver ? 'border-[#A3E635] bg-[#A3E6352f] scale-[1.02]' : 'border-[#3d4a3d] bg-[#111827]'
      } ${isDragging ? 'opacity-30' : 'opacity-100'}`}
      {...listeners}
      {...attributes}
    >
      <p className="text-[11px] text-[#9CA3AF] uppercase pointer-events-none">{slot.label}</p>
      <p className="text-xs mt-1 truncate pointer-events-none">{player?.name ?? '-'}</p>
      <p className="text-[11px] text-[#4be277] mt-1 pointer-events-none">{player ? player.rating : ''}</p>
    </button>
  );
}
