import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import {
  buildSimulationPayloadFromStarters,
  loadSquadPayload,
  saveSquadPayload,
  tacticalStyleFromPreset,
} from '../lib/squad';
import { toApiError } from '../lib/api';
import { calculatePositionFit, fetchPlayers, type CatalogPlayer } from '../lib/players';
import { saveSquadSnapshot } from '../lib/savedSquads';
import PlayerCard from '../components/PlayerCard';

type Starter = {
  id: string;
  name: string;
  rating: number;
  image?: string;
  ring?: 'primary' | 'gold' | 'purple' | 'outline';
  badgeTextClass?: string;
  containerClass?: string;
  labelClass?: string;
};

const starters: Starter[] = [
  {
    id: 'lw',
    name: 'J. Silva',
    rating: 88,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA9WK2Zo75g3cOwgA78aK3S-so-4NcQxmq7X4YJU7XiZ6iYzDdFqazIW2WoLOoW4XBXKsiU6zdEWSIy51ArYaHgxulTsqmTYP8vwoWoB4saB0umPY8vQGKljwJCB4svwZJw1u8UOH70HwxN8w3s9d_ACevwenyAEk1yYmfiEDXlegTTUNVs-eeBWg6RdOY64FJu-MVGUVT-Wy9IQydqeeLvM9BS1KeeAL0fEYSsSpXH-d56gomWmqdQO7T9Mp5O37oqyDQc9MTLf0I',
    ring: 'primary',
  },
  {
    id: 'st',
    name: 'A. Ramos',
    rating: 90,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuClfMB9Tm5UBqbSdCFAoS7tQC2MRQJDH6oPaN1dA-cOgwmNnReZIVPyPR5fi3k84QZ-GMrMMx2S7-5TBibojGdDgrtauy1SmexbJ6WedxqMYI-okAMVNQ1G1fwx9V2l4ynu_z-s_BixeXWc-EEQCbI6nUpWFlEpuNBTy246x-J-4fld6Gxgq77E2yMZj3Tjydxg5vwKGsMKNWxwd2lwKcM4O8szXFVcFIAweiMQkJwjnq4WRJAPWLqkQh7MUi3BN_o6URnnI8oUyL8',
    ring: 'gold',
    labelClass: 'text-[var(--color-warning)]',
  },
  {
    id: 'rw',
    name: 'M. Diaz',
    rating: 85,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDKnxEuIR3xTxo-rGQciIkfm9-5MlotWX3yJRZzAI-JIlZi6WgYqQ1wsh8FKuk5e6JvnMzHooQGq8uMlsJ2rDg8u0PR4V5d-BAPlkMpzfELpWJFAo-3051eNvIBb-OZE_Ogn0fOB8L6SmXjbr4ip7D8fe_wXqkF2AQ8TbPr-TZJN1R9lgSV1dgVcXMC8gMU4hUezfg727KU1A7hmQ6eNoVR3--id54NLYjLLUOD86b_kJUFkQTnRrQdceKj4biX9Cfznt_J1dqUHu0',
    ring: 'primary',
  },
  {
    id: 'lcm',
    name: 'P. Costa',
    rating: 82,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBomOStytNPF-4EvU6lAf13hcF4VbmPeqlWzYA-yErXXAqJS_J6BTIR-NDgD49w_VHiEkAWPm_JE5uRmfWf4NJqcUcavV4RbIHs1ibjJzTj38JgocCSF1ATIbIVFEgAOf7qp7wVIcMXXFA2ZBgiGlCVnyfTieH_Xmla5h-fCbzcPfhFmUu1jFe-oxn27hR0ijHD2O5qtDpQgfadm_X-V0P4pewyIqshjcGyGHJJgHef8MNxuRU9pJ6ajfkrynJny7kp_NJxx0ktjEw',
    ring: 'outline',
  },
  {
    id: 'cdm',
    name: 'L. Mendes',
    rating: 86,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD8r58Alefej_GsUylSb9MHmEVxlPgs5cEXonDiv9uYeqKrwA6yELJ_AENYkXPaISpsdMg2pVCe4OgWKSFaD56irKSTjmhujNHNJd71wHOFirUaJLVn6BDafYh0OJLCIcUAbpA5NQ16-_gyBzzb0Z5NGM1sijH2C-wF5dT44jQBrlHGw5EbFKH-0jvwvz40NUGji9sgT6ohvxl6ei7keiJLhHaRIKXR0JUAsork0AsZOA8dR-ZUeVqSl07huTs8FDibxMi8Vfea1S8',
    ring: 'primary',
  },
  {
    id: 'rcm',
    name: 'B. Ruiz',
    rating: 84,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAmB1QZFI8EjBkq0IIxNRupf1a-4_pBoEBlLHwQWasaN5qwWHbBSVeDiesk_8DOpSSJRy6tjb3xt5HMMbZKDEDq6XwUBksVCueh7RUUpOFf_Z001QfCM1lzR5KHeBoQbe6UQJvIZqYqn0xck4F6wIoYIWrOzIND1igVK74OgvfI2wQ1PHEzgJV3v_UOanYRdQ07ERW4dRDpHVj05VIZx8nYIwsCsCK6rz1Q_35zeMisAcfPW0_Q0MPEErmeEeqKtlNLVcFG3e23viw',
    ring: 'outline',
  },
  {
    id: 'lb',
    name: 'T. Mendes',
    rating: 79,
    ring: 'outline',
  },
  {
    id: 'lcb',
    name: 'R. Dias',
    rating: 87,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC26X5GCLj9OUIJ7HJsUq_OW4ddbfefEp7AwYWJHuTYk1zIxLtw34bFjpBD6x9gSx5SV_O23FQQJjS6lHM33iNN_KPGA_6Ji5oqgzQA7SibNqIt4x8--uZN4oITkfwgRIcpPBSG_e2XQg7y-kw8k6Uch6J-d6iWpm8n13kZRTLg0l-HrudluKvEcUjpIxC4KSplKNATnT33witJYNHZCxuCrC1E7m8NDOYGI9wuO5YdXT4dvi2dY9ZzQ3MIuESv-cK_1Uw4gSmlewM',
    ring: 'primary',
  },
  {
    id: 'rcb',
    name: 'M. Akanji',
    rating: 84,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBDenfbuqnn_sH3ine0i9044vU0Bu6BKhfkItM_XukNxXO1131eETRLU6DoXysmS2fRyEKEl3WoBkgq3dfgERtf6msdUAvQ6rgJEEVLneNgQlqCAPB9U9dJIxshePfbhFIjAQHmiOfub4vVpMPuCJU-_PdfBAM7MDSd87Xx6WMM55bFxxBKZ4GhuDMtETVKSFbqXWah4y2Aig875t0ySP2PgiclqZ1c7ZjKBLD6M4149wnNJbliP9ZPgNhryXnDK-qyaI-ImypnJoA',
    ring: 'outline',
  },
  {
    id: 'rb',
    name: 'D. Dalot',
    rating: 81,
    ring: 'outline',
  },
  {
    id: 'gk',
    name: 'G. Costa',
    rating: 89,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDmg0b3BYygAb7DcdB_1L95yryA6TqicKrjRnEWehUUU5Op2yaqYOOF93lebB_8lMvTx88LARDqEPc7a0bo4smVSlUyD0DzneuC7XQy6Gn84XQ3FCc_fgAh9n4sR3Gdk51NAurl9Lz972dj_Dx0Zzf2xUu8bvKFES7B3uoI2aRVhKdl0ahYJ7rAfPrynd5z3hYNNVqaJlp3rlAgYyn-ztEKxwPlCnRA_dabqpOVxaRHl8ThKvyvn1Fec-QH02Mw7d1lRuJW1zlu3Kw',
    ring: 'purple',
    labelClass: 'text-[var(--color-blue-accent)]',
  },
];

type TacticPreset = 'Balanced' | 'High Press' | 'Counter' | 'Possession';

const SLOT_TO_ROLE: Record<string, string> = {
  lw: 'LW',
  st: 'ST',
  rw: 'RW',
  lcm: 'LCM',
  cdm: 'CDM',
  rcm: 'RCM',
  lb: 'LB',
  lcb: 'LCB',
  rcb: 'RCB',
  rb: 'RB',
  gk: 'GK',
};

function readSavedLineup(): {
  starterBySlot: Map<string, CatalogPlayer>;
  bench: CatalogPlayer[];
  averageRating: number | null;
} {
  const result = {
    starterBySlot: new Map<string, CatalogPlayer>(),
    bench: [] as CatalogPlayer[],
    averageRating: null as number | null,
  };

  const payload = loadSquadPayload();
  if (!payload?.team?.players?.length) {
    return result;
  }

  const startersFromPayload = payload.team.players.filter((player) => !player.isSubstitute);
  const benchFromPayload = payload.team.players.filter((player) => player.isSubstitute);

  for (const slot of starters) {
    const role = SLOT_TO_ROLE[slot.id] ?? slot.id.toUpperCase();
    const found =
      startersFromPayload.find((player) => player.rolePosition.toUpperCase() === role) ??
      startersFromPayload.find((player) => player.naturalPosition.toUpperCase() === role);

    if (!found) {
      continue;
    }

    result.starterBySlot.set(slot.id, simulationLikeToCatalog(found));
  }

  result.bench = benchFromPayload.slice(0, 7).map((player) => simulationLikeToCatalog(player));

  if (startersFromPayload.length >= 11) {
    const avg = startersFromPayload
      .slice(0, 11)
      .reduce((sum, player) => sum + Math.round((player.pac + player.sho + player.pas + player.dri + player.def + player.phy) / 6), 0) / 11;
    result.averageRating = Math.round(avg);
  }

  return result;
}

function simulationLikeToCatalog(player: {
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
    age: undefined,
    heightCm: undefined,
    realPosition: player.naturalPosition,
    preferredPositions: player.preferredPositions ?? [player.naturalPosition],
    faceUrl: null,
    photoUrl: undefined,
    hasPhoto: false,
    tags: [],
    rating,
    potential: rating,
    pac: player.pac,
    sho: player.sho,
    pas: player.pas,
    dri: player.dri,
    def: player.def,
    phy: player.phy,
    stamina: player.stamina,
    attackWorkRate: player.attackWorkRate ?? 'MEDIUM',
    defenseWorkRate: player.defenseWorkRate ?? 'MEDIUM',
    preferredFoot: 'RIGHT',
    weakFoot: 3,
    skillMoves: 3,
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [preset, setPreset] = useState<TacticPreset>('High Press');
  const [defensiveLine, setDefensiveLine] = useState(60);
  const [tempo, setTempo] = useState(80);
  const [width, setWidth] = useState(75);
  const [pressing, setPressing] = useState(85);
  const [catalogPlayers, setCatalogPlayers] = useState<CatalogPlayer[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [playersError, setPlayersError] = useState('');

  useEffect(() => {
    let active = true;

    const loadPlayers = async () => {
      setLoadingPlayers(true);
      setPlayersError('');
      try {
        const response = await fetchPlayers({ page: 1, limit: 100 });
        if (!active) {
          return;
        }
        setCatalogPlayers(response.items);
      } catch (error) {
        if (!active) {
          return;
        }
        setPlayersError(toApiError(error).message);
      } finally {
        if (active) {
          setLoadingPlayers(false);
        }
      }
    };

    void loadPlayers();
    return () => {
      active = false;
    };
  }, []);

  const [formation, setFormation] = useState('4-3-3');
  const lineup = useMemo(() => selectLineup(catalogPlayers), [catalogPlayers]);
  const savedLineup = useMemo(() => readSavedLineup(), []);
  const hasSavedLineup = savedLineup.starterBySlot.size >= 11;
  
  // Dynamic positioning based on formation
  const formationPositions: Record<string, Record<string, string>> = {
    '4-3-3': {
      lw: 'top-[15%] left-[14%]', st: 'top-[9%] left-1/2 -translate-x-1/2', rw: 'top-[15%] right-[14%]',
      lcm: 'top-[39%] left-[20%]', cdm: 'top-[44%] left-1/2 -translate-x-1/2', rcm: 'top-[39%] right-[20%]',
      lb: 'top-[63%] left-[6%]', lcb: 'top-[66%] left-[31%]', rcb: 'top-[66%] right-[31%]', rb: 'top-[63%] right-[6%]',
      gk: 'bottom-[5%] left-1/2 -translate-x-1/2'
    },
    '4-2-3-1': {
      lw: 'top-[22%] left-[18%]', st: 'top-[9%] left-1/2 -translate-x-1/2', rw: 'top-[22%] right-[18%]',
      lcm: 'top-[22%] left-1/2 -translate-x-1/2', cdm: 'top-[44%] left-[30%]', rcm: 'top-[44%] right-[30%]',
      lb: 'top-[63%] left-[6%]', lcb: 'top-[66%] left-[31%]', rcb: 'top-[66%] right-[31%]', rb: 'top-[63%] right-[6%]',
      gk: 'bottom-[5%] left-1/2 -translate-x-1/2'
    },
    '4-4-2': {
      lw: 'top-[39%] left-[12%]', st: 'top-[12%] left-[35%]', rw: 'top-[39%] right-[12%]',
      lcm: 'top-[12%] right-[35%]', cdm: 'top-[40%] left-[35%]', rcm: 'top-[40%] right-[35%]',
      lb: 'top-[65%] left-[8%]', lcb: 'top-[67%] left-[33%]', rcb: 'top-[67%] right-[33%]', rb: 'top-[65%] right-[8%]',
      gk: 'bottom-[5%] left-1/2 -translate-x-1/2'
    }
  };

  const getPositionClass = (id: string) => `absolute ${formationPositions[formation]?.[id] || formationPositions['4-3-3'][id]} transition-all duration-500 ease-out`;

  const starterCards = useMemo(
    () =>
      starters.map((slot) => {
        const saved = savedLineup.starterBySlot.get(slot.id);
        const player = saved;
        if (!player) {
          return {
            ...slot,
            name: SLOT_TO_ROLE[slot.id] ?? slot.id.toUpperCase(),
            rating: 0,
            image: undefined,
            ring: 'outline' as const,
            containerClass: getPositionClass(slot.id),
            labelClass: 'text-[var(--color-on-surface-variant)]',
          };
        }
        return {
          ...slot,
          name: player.name,
          rating: player.rating,
          image: player.faceUrl ?? undefined,
          ring: 'primary' as const,
          containerClass: getPositionClass(slot.id)
        };
      }),
    [savedLineup.starterBySlot, formation],
  );

  const control = Math.round((tempo * 0.45 + width * 0.25 + 40) / 1.1);
  const defensiveWall = Math.round((defensiveLine * 0.55 + pressing * 0.35 + 25) / 1.1);
  const chanceCreation = Math.round((tempo * 0.4 + width * 0.35 + pressing * 0.25));

  return (
    <AppShell title="КОНСТРУКТОР СОСТАВА" activeTab="squad">
      <div className="px-5 space-y-6 pb-8 animate-slide-up pt-2">
        <section className="glass-panel-solid rounded-3xl p-5 overflow-hidden shadow-xl border border-white/10 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[var(--color-primary)]/10 via-transparent to-transparent opacity-50 pointer-events-none" />

          <div className="flex justify-between items-center mb-4 relative z-10">
            <select
              value={formation}
              onChange={(e) => setFormation(e.target.value)}
              className="bg-[var(--color-surface-container-high)] border border-white/10 rounded-xl px-3 py-1.5 text-sm font-bold text-white outline-none focus:border-[var(--color-primary)]/50"
            >
              <option value="4-3-3">4-3-3 Base</option>
              <option value="4-2-3-1">4-2-3-1 Attack</option>
              <option value="4-4-2">4-4-2 Flat</option>
            </select>
            
            <div className="bg-[var(--color-surface-container-highest)] px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-primary)] font-bold">OVR</span>
              <span className="font-black text-white">{savedLineup.averageRating ?? '--'}</span>
            </div>
          </div>

          <div className="relative w-full aspect-[4/5] bg-[#0a1a12] rounded-2xl border border-[var(--color-primary)]/20 overflow-hidden shadow-inner pitch-bg">
            <div className="absolute inset-0 opacity-20 border border-white/30 m-4 rounded-lg" />
            <div className="absolute top-1/2 left-4 right-4 h-px bg-white/20" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-white/20" />
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-48 h-28 border border-white/20 rounded-b-lg border-t-0" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-28 border border-white/20 rounded-t-lg border-b-0" />

            {starterCards.map((player) => (
              <div key={player.id} className={`${player.containerClass} z-10 flex flex-col items-center`}>
                <div className={`relative ${player.id === 'st' || player.id === 'gk' ? 'w-14 h-14' : 'w-12 h-12'} hover:scale-110 transition-transform cursor-pointer`}>
                  <PlayerAvatar image={player.image} ring={player.ring ?? 'outline'} />
                  <div className={`absolute -bottom-1 -right-1 text-[10px] font-black px-1.5 py-0.5 rounded shadow-lg border border-[var(--color-surface)] ${badgeClass(player.ring ?? 'outline')}`}>
                    {player.rating > 0 ? player.rating : '--'}
                  </div>
                </div>
                <span className={`text-[9px] uppercase tracking-wider font-bold mt-1.5 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm border border-white/10 ${player.labelClass ?? 'text-white'}`}>{player.name}</span>
                {savedLineup.starterBySlot.get(player.id) ? (
                  <span className="mt-1 rounded-full border border-[#2e8f56] bg-[#143724] px-1.5 py-0.5 text-[9px] font-semibold text-[#84e3a9]">
                    Fit {calculatePositionFit(savedLineup.starterBySlot.get(player.id) as CatalogPlayer, SLOT_TO_ROLE[player.id] ?? player.id.toUpperCase())}%
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs uppercase tracking-widest font-bold text-[var(--color-on-surface-variant)]">Запасные</h3>
            <button onClick={() => navigate('/player-selection')} className="text-[10px] text-[var(--color-primary)] uppercase tracking-wider font-bold bg-[var(--color-primary)]/10 px-2 py-1 rounded hover:bg-[var(--color-primary)]/20 transition-colors">Изменить Состав</button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 snap-x custom-scrollbar">
            {Array.from({ length: 7 }).map((_, index) => {
              const player = savedLineup.bench[index];
              return (
                <div key={`bench-${index + 1}`} className="snap-start min-w-[240px] flex-shrink-0">
                  {player ? (
                    <PlayerCard player={player} slotRole={player.primaryPosition} compact showTags={false} />
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-[var(--color-surface-container)] p-3 text-xs text-[var(--color-on-surface-variant)]">
                      Пустой слот запаса
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="glass-panel rounded-3xl p-5 shadow-lg">
          <p className="text-xs uppercase tracking-widest font-bold text-[var(--color-on-surface-variant)] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">strategy</span> Тактический Подход
          </p>

          <div className="flex gap-2 mb-6 overflow-x-auto custom-scrollbar pb-2">
            {(['Balanced', 'High Press', 'Counter', 'Possession'] as TacticPreset[]).map((item) => (
              <button
                key={item}
                onClick={() => setPreset(item)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs tracking-wider font-bold transition-all border ${
                  preset === item
                    ? 'bg-[var(--color-primary)]/20 border-[var(--color-primary)]/50 text-[var(--color-primary)]'
                    : 'bg-[var(--color-surface-container-high)] border-white/5 text-[var(--color-on-surface-variant)] hover:bg-white/5'
                }`}
              >
                {item === 'Balanced' ? 'Сбалансированный' : item === 'High Press' ? 'Высокий Прессинг' : item === 'Counter' ? 'Контратаки' : 'Контроль Мяча'}
              </button>
            ))}
          </div>

          <div className="space-y-4 mb-6">
            <RatingBar label="Контроль" value={control} />
            <RatingBar label="Оборонительный блок" value={defensiveWall} />
            <RatingBar label="Создание моментов" value={chanceCreation} />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-6 pt-4 border-t border-white/5">
            <SliderMetric label="Defensive Line" value={defensiveLine} setValue={setDefensiveLine} hint="Mid" />
            <SliderMetric label="Tempo" value={tempo} setValue={setTempo} hint="Fast" />
            <SliderMetric label="Width" value={width} setValue={setWidth} hint="Wide" />
            <SliderMetric label="Pressing" value={pressing} setValue={setPressing} hint="High" />
          </div>
        </section>

        <section className="bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 rounded-2xl p-4 flex gap-4 items-start shadow-lg">
          <div className="w-10 h-10 rounded-full bg-[var(--color-warning)]/20 flex items-center justify-center shrink-0 border border-[var(--color-warning)]/40 neon-glow">
            <span className="material-symbols-outlined text-[var(--color-warning)]">lightbulb</span>
          </div>
          <div>
            <h4 className="font-bold text-white text-sm mb-1">Подсказка Тренера</h4>
            <p className="text-xs text-[var(--color-on-surface-variant)] leading-relaxed">
              Линия обороны поднята слишком высоко. Рассмотри более глубокий блок или дополнительную подстраховку, чтобы не попадать под контратаки при схеме <strong>{formation}</strong>.
            </p>
          </div>
        </section>

        {(loadingPlayers || playersError) && (
          <section className="bg-[var(--color-surface-container)] border border-white/5 rounded-xl p-4 text-xs text-center">
            {loadingPlayers ? (
              <p className="text-[var(--color-on-surface-variant)] animate-pulse">Синхронизация каталога игроков...</p>
            ) : (
              <p className="text-[var(--color-danger)]">{playersError}</p>
            )}
          </section>
        )}

        <button
          onClick={() => {
            const existing = loadSquadPayload();
            if (!existing || !hasSavedLineup) {
              navigate('/player-selection');
              return;
            }

            const payloadToSave = existing
              ? { ...existing, team: { ...existing.team, formation, tacticalStyle: tacticalStyleFromPreset(preset) } }
              : buildSimulationPayloadFromStarters(lineup.startersForPayload, tacticalStyleFromPreset(preset), lineup.benchForPayload);
            payloadToSave.team.formation = formation;

            saveSquadPayload(payloadToSave);
            saveSquadSnapshot(payloadToSave);
            navigate('/match-setup');
          }}
          className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed)] text-[var(--color-on-primary)] font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all neon-glow shadow-lg active:scale-[0.98] mt-4"
        >
          {hasSavedLineup ? 'ПОДТВЕРДИТЬ ТАКТИКУ' : 'СНАЧАЛА ВЫБЕРИ ИГРОКОВ'}
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    </AppShell>
  );
}

function selectLineup(players: CatalogPlayer[]): {
  starterBySlot: Map<string, CatalogPlayer>;
  bench: CatalogPlayer[];
  averageRating: number;
  startersForPayload: Array<{
    id: string;
    name: string;
    rating: number;
    naturalPosition: string;
    rolePosition: string;
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
  }>;
  benchForPayload: Array<{
    id: string;
    name: string;
    rating: number;
    naturalPosition: string;
    rolePosition: string;
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
  }>;
} {
  const starterBySlot = new Map<string, CatalogPlayer>();
  const used = new Set<string>();

  for (const slot of starters) {
    const role = SLOT_TO_ROLE[slot.id] ?? slot.id.toUpperCase();
    const best = players
      .filter((player) => !used.has(player.id))
      .map((player) => ({
        player,
        score: playerFitScore(player, role),
      }))
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return b.player.rating - a.player.rating;
      })[0]?.player;

    if (best) {
      starterBySlot.set(slot.id, best);
      used.add(best.id);
    }
  }

  const bench = players
    .filter((player) => !used.has(player.id))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 7);

  const starterRatings = starters
    .map((slot) => starterBySlot.get(slot.id)?.rating ?? slot.rating);

  const averageRating = Math.round(
    starterRatings.reduce((sum, value) => sum + value, 0) / starterRatings.length,
  );

  const startersForPayload = starters.map((slot) => {
    const selected = starterBySlot.get(slot.id);
    if (!selected) {
      return fallbackPayloadPlayer(slot);
    }
    return toPayloadPlayer(selected, SLOT_TO_ROLE[slot.id] ?? slot.id.toUpperCase());
  });

  const benchForPayload = bench.map((player) => toPayloadPlayer(player, player.realPosition));

  return {
    starterBySlot,
    bench,
    averageRating,
    startersForPayload,
    benchForPayload,
  };
}

function playerFitScore(player: CatalogPlayer, role: string): number {
  const normalizedRole = role.toUpperCase();
  const natural = player.realPosition.toUpperCase();
  const preferred = (player.preferredPositions ?? []).map((value) => value.toUpperCase());

  if (natural === normalizedRole) {
    return 1000 + player.rating;
  }

  if (preferred.includes(normalizedRole)) {
    return 960 + player.rating;
  }

  if (positionBand(natural) === positionBand(normalizedRole)) {
    return 900 + player.rating;
  }

  return 750 + player.rating;
}

function positionBand(role: string): 'GK' | 'DEF' | 'MID' | 'ATT' {
  const normalized = role.toUpperCase();
  if (normalized === 'GK') {
    return 'GK';
  }
  if (['CB', 'LCB', 'RCB', 'LB', 'RB', 'LWB', 'RWB'].includes(normalized)) {
    return 'DEF';
  }
  if (['CDM', 'CM', 'LCM', 'RCM', 'CAM', 'LM', 'RM'].includes(normalized)) {
    return 'MID';
  }
  return 'ATT';
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

function fallbackPayloadPlayer(slot: Starter) {
  const role = SLOT_TO_ROLE[slot.id] ?? slot.id.toUpperCase();
  const base = Math.max(45, Math.min(95, slot.rating));
  return {
    id: slot.id,
    name: slot.name,
    rating: slot.rating,
    naturalPosition: role,
    rolePosition: role,
    preferredPositions: [role],
    pac: base,
    sho: base,
    pas: base,
    dri: base,
    def: base,
    phy: base,
    stamina: 100,
    attackWorkRate: 'MEDIUM' as const,
    defenseWorkRate: 'MEDIUM' as const,
  };
}

function PlayerAvatar({
  image,
  ring,
  size = 'normal',
}: {
  image?: string;
  ring: 'primary' | 'gold' | 'purple' | 'outline';
  size?: 'normal' | 'small';
}) {
  const borderClass =
    ring === 'primary'
      ? 'border-[var(--color-primary)]'
      : ring === 'gold'
      ? 'border-[var(--color-warning)]'
      : ring === 'purple'
      ? 'border-[var(--color-blue-accent)]'
      : 'border-white/20';

  const iconSize = size === 'small' ? 'text-sm' : 'text-base';

  if (!image) {
    return (
      <div className={`w-full h-full rounded-full border-2 ${borderClass} bg-[var(--color-surface-container-high)] flex items-center justify-center`}>
        <span className={`material-symbols-outlined text-[var(--color-on-surface-variant)] ${iconSize}`}>person</span>
      </div>
    );
  }

  return <img className={`w-full h-full rounded-full border-2 ${borderClass} object-cover`} src={image} alt="Player" />;
}

function badgeClass(ring: 'primary' | 'gold' | 'purple' | 'outline') {
  if (ring === 'gold') {
    return 'bg-[var(--color-warning)] text-black border-black/20';
  }
  if (ring === 'purple') {
    return 'bg-[var(--color-blue-accent)] text-white border-white/20';
  }
  return 'bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)] border-white/10';
}

function RatingBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-semibold mb-1">
        <span className="text-[var(--color-on-surface-variant)]">{label}</span>
        <span className="text-[var(--color-primary)]">{Math.min(99, value)}</span>
      </div>
      <div className="w-full bg-[var(--color-surface-container-high)] rounded-full h-1.5 overflow-hidden border border-white/5">
        <div className="bg-[var(--color-primary)] h-1.5 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]" style={{ width: `${Math.min(99, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}

function SliderMetric({
  label,
  value,
  setValue,
  hint,
}: {
  label: string;
  value: number;
  setValue: (value: number) => void;
  hint: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-[10px] uppercase font-bold mb-2 text-[var(--color-on-surface-variant)] tracking-widest">
        <span>{label}</span>
        <span className="text-[var(--color-primary)]">{hint}</span>
      </div>
      <input
        className="w-full h-1.5 bg-[var(--color-surface-container-high)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
        max={100}
        min={1}
        type="range"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
      />
    </div>
  );
}
