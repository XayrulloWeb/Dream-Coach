import type { SimulationPlayer } from '../types/simulation';

type RadarChartProps = {
  player: SimulationPlayer;
};

export default function PlayerRadarChart({ player }: RadarChartProps) {
  const stats = [
    { label: 'PAC', value: player.pac },
    { label: 'SHO', value: player.sho },
    { label: 'PAS', value: player.pas },
    { label: 'DRI', value: player.dri },
    { label: 'DEF', value: player.def },
    { label: 'PHY', value: player.phy },
  ];

  const size = 280;
  const center = size / 2;
  const maxRadius = 100;

  // Calculate coordinates for a specific radius and angle
  const getCoordinatesForValue = (value: number, index: number) => {
    // scale value from 0-100 to 0-maxRadius
    const r = (value / 100) * maxRadius;
    const angle = (Math.PI * 2 * index) / 6;
    // rotate by -90 degrees (Math.PI/2) to start at top
    const x = center + r * Math.cos(angle - Math.PI / 2);
    const y = center + r * Math.sin(angle - Math.PI / 2);
    return { x, y };
  };

  // Generate polygon points for player stats
  const points = stats
    .map((stat, i) => {
      const { x, y } = getCoordinatesForValue(stat.value, i);
      return `${x},${y}`;
    })
    .join(' ');

  // Generate background grid polygons (hexagons)
  const gridLevels = [20, 40, 60, 80, 100];
  
  return (
    <div className="relative flex items-center justify-center w-full max-w-[280px] mx-auto drop-shadow-[0_0_15px_rgba(75,226,119,0.15)]">
      <svg width={size} height={size} className="overflow-visible">
        {/* Background Grid */}
        {gridLevels.map((level) => {
          const gridPoints = stats
            .map((_, i) => {
              const { x, y } = getCoordinatesForValue(level, i);
              return `${x},${y}`;
            })
            .join(' ');
          return (
            <polygon
              key={level}
              points={gridPoints}
              fill="none"
              stroke="var(--color-outline-variant)"
              strokeWidth="1"
              strokeDasharray={level === 100 ? '0' : '4 4'}
              opacity={level === 100 ? 0.5 : 0.3}
            />
          );
        })}

        {/* Axes */}
        {stats.map((_, i) => {
          const { x, y } = getCoordinatesForValue(100, i);
          return (
            <line
              key={`axis-${i}`}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="var(--color-outline-variant)"
              strokeWidth="1"
              opacity="0.3"
            />
          );
        })}

        {/* Stat Polygon */}
        <polygon
          points={points}
          fill="var(--color-primary)"
          fillOpacity="0.3"
          stroke="var(--color-primary)"
          strokeWidth="3"
          strokeLinejoin="round"
          className="transition-all duration-500 ease-out"
        />

        {/* Stat Points & Labels */}
        {stats.map((stat, i) => {
          const { x, y } = getCoordinatesForValue(stat.value, i);
          const labelCoords = getCoordinatesForValue(115, i);
          
          return (
            <g key={`stat-${i}`}>
              <circle
                cx={x}
                cy={y}
                r="4"
                fill="var(--color-primary)"
                className="transition-all duration-500 ease-out"
              />
              <text
                x={labelCoords.x}
                y={labelCoords.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--color-on-surface-variant)"
                className="font-['Lexend'] text-[10px] font-bold uppercase tracking-widest"
              >
                {stat.label}
              </text>
              <text
                x={labelCoords.x}
                y={labelCoords.y + 14}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                className="font-['Lexend'] text-sm font-black"
              >
                {stat.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
