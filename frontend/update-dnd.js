const fs = require('fs');
let content = fs.readFileSync('src/pages/PlayerSelection.tsx', 'utf-8');

// 1. Imports
content = content.replace(
  "import PlayerCard from '../components/PlayerCard';",
  "import PlayerCard from '../components/PlayerCard';\nimport {\n  DndContext,\n  DragOverlay,\n  useSensor,\n  useSensors,\n  MouseSensor,\n  TouchSensor,\n  useDraggable,\n  useDroppable,\n  type DragStartEvent,\n  type DragEndEvent,\n} from '@dnd-kit/core';"
);

// 2. States and handlers
content = content.replace(
  "const [draggedSlotId, setDraggedSlotId] = useState<string | null>(null);\n  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);",
  \const [activeDragPlayer, setActiveDragPlayer] = useState<CatalogPlayer | null>(null);
  const [activeDragSlot, setActiveDragSlot] = useState<Slot | null>(null);

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
    const { active, over } = event;
    if (active && over) {
      const fromSlotId = active.data.current?.slotId;
      const toSlotId = over.data.current?.slotId;
      if (fromSlotId && toSlotId) {
        handleSlotSwap(fromSlotId, toSlotId);
      }
    }
    setActiveDragPlayer(null);
    setActiveDragSlot(null);
  };

  const onDragCancel = () => {
    setActiveDragPlayer(null);
    setActiveDragSlot(null);
  };\
);

// 3. handleSlotSwap logic
content = content.replace(
  "    if (!STARTER_SLOT_IDS.has(fromSlotId) || !STARTER_SLOT_IDS.has(toSlotId)) {\\n      return;\\n    }\\n",
  ""
);

// 4. Section replacement
const sectionMatch = content.match(/<section className="rounded-xl border border-\\[#3d4a3d\\] bg-\\[#1d2022\\] p-4 space-y-3">([\\s\\S]*?)<\\/section>/);

if (sectionMatch) {
  const newSection = \<section className="rounded-xl border border-[#3d4a3d] bg-[#1d2022] p-4 space-y-3">
          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Активный слот</h2>
              <p className="text-xs text-[#9CA3AF]">Перетаскивай карточки для замен. Нажми слот, чтобы выбрать игрока.</p>
            </div>

            <div className="relative w-full aspect-[4/5] bg-[#0a1a12] rounded-lg border border-[#1a3a24] overflow-hidden">
              <div className="absolute inset-0 opacity-20 border border-white/30 m-4 rounded-sm" />
              <div className="absolute top-1/2 left-4 right-4 h-px bg-white/30" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-white/30" />
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-40 h-24 border border-white/30 rounded-b-sm border-t-0" />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-40 h-24 border border-white/30 rounded-t-sm border-b-0" />

              {PITCH_LAYOUT.map((layout) => {
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
                    style={layout.style}
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
        </section>\;

  content = content.replace(sectionMatch[0], newSection);
}

// 5. Append Components at the end of the file
const componentsToAdd = \
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
    id: \pitch-\\,
    data: { slotId: slot.id, player },
    disabled: !player,
  });

  const { isOver, setNodeRef: setDroppableRef } = useDroppable({
    id: \pitch-drop-\\,
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
        className={\w-12 h-12 rounded-full border-2 flex items-center justify-center \ transition-all duration-200\ }
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
    id: \list-\\,
    data: { slotId: slot.id, player },
    disabled: !player,
  });

  const { isOver, setNodeRef: setDroppableRef } = useDroppable({
    id: \list-drop-\\,
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
      className={\	ext-left rounded-lg border p-2 touch-none transition-all duration-200 \ \\}
      {...listeners}
      {...attributes}
    >
      <p className="text-[11px] text-[#9CA3AF] uppercase pointer-events-none">{slot.label}</p>
      <p className="text-xs mt-1 truncate pointer-events-none">{player?.name ?? '-'}</p>
      <p className="text-[11px] text-[#4be277] mt-1 pointer-events-none">{player ? player.rating : ''}</p>
    </button>
  );
}
\;

content = content + componentsToAdd;

fs.writeFileSync('src/pages/PlayerSelection.tsx', content);
console.log('Update applied');
