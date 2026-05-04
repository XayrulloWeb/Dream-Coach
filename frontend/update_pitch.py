import sys

with open('src/pages/PlayerSelection.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace PITCH_LAYOUT with INITIAL_PITCH_LAYOUT
content = content.replace('''const PITCH_LAYOUT: { slotId: string, style: CSSProperties }[] = [
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
];''', '''const INITIAL_PITCH_LAYOUT = [
  { slotId: 'lw', x: 14, y: 12 },
  { slotId: 'st', x: 50, y: 8 },
  { slotId: 'rw', x: 86, y: 12 },
  { slotId: 'lcm', x: 22, y: 35 },
  { slotId: 'cdm', x: 50, y: 41 },
  { slotId: 'rcm', x: 78, y: 35 },
  { slotId: 'lb', x: 14, y: 62 },
  { slotId: 'lcb', x: 32, y: 66 },
  { slotId: 'rcb', x: 68, y: 66 },
  { slotId: 'rb', x: 86, y: 62 },
  { slotId: 'gk', x: 50, y: 94 },
];

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
}''')

# 2. State Additions & Drag Logic
content = content.replace('''  const [tacticalStyle, setTacticalStyle] = useState<TacticalStyle>('BALANCED');

  const [activeDragPlayer, setActiveDragPlayer] = useState<CatalogPlayer | null>(null);
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
  };''', '''  const [tacticalStyle, setTacticalStyle] = useState<TacticalStyle>('BALANCED');

  const [activeDragPlayer, setActiveDragPlayer] = useState<CatalogPlayer | null>(null);
  const [activeDragSlot, setActiveDragSlot] = useState<Slot | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [pitchLayout, setPitchLayout] = useState(INITIAL_PITCH_LAYOUT);
  const pitchRef = import("react").then(r => r.useRef<HTMLDivElement>(null)) // Just using any for now, wait we need to import useRef! Let's just fix it.
''')

with open('src/pages/PlayerSelection.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
