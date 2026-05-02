import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  buildSimulationPayloadFromStarters,
  loadSquadPayload,
  saveSquadPayload,
  tacticalStyleFromPreset,
} from '../lib/squad';
import { toApiError } from '../lib/api';
import { fetchPlayers, type CatalogPlayer } from '../lib/players';
import { saveSquadSnapshot } from '../lib/savedSquads';

type Starter = {
  id: string;
  name: string;
  rating: number;
  image?: string;
  ring?: 'primary' | 'gold' | 'purple' | 'outline';
  badgeTextClass?: string;
  containerClass: string;
  labelClass?: string;
};

type SubPlayer = {
  id: string;
  name: string;
  rating: number;
  image?: string;
  ring?: 'primary' | 'outline';
};

const starters: Starter[] = [
  {
    id: 'lw',
    name: 'J. Silva',
    rating: 88,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA9WK2Zo75g3cOwgA78aK3S-so-4NcQxmq7X4YJU7XiZ6iYzDdFqazIW2WoLOoW4XBXKsiU6zdEWSIy51ArYaHgxulTsqmTYP8vwoWoB4saB0umPY8vQGKljwJCB4svwZJw1u8UOH70HwxN8w3s9d_ACevwenyAEk1yYmfiEDXlegTTUNVs-eeBWg6RdOY64FJu-MVGUVT-Wy9IQydqeeLvM9BS1KeeAL0fEYSsSpXH-d56gomWmqdQO7T9Mp5O37oqyDQc9MTLf0I',
    ring: 'primary',
    containerClass: 'absolute top-[15%] left-[14%]',
  },
  {
    id: 'st',
    name: 'A. Ramos',
    rating: 90,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuClfMB9Tm5UBqbSdCFAoS7tQC2MRQJDH6oPaN1dA-cOgwmNnReZIVPyPR5fi3k84QZ-GMrMMx2S7-5TBibojGdDgrtauy1SmexbJ6WedxqMYI-okAMVNQ1G1fwx9V2l4ynu_z-s_BixeXWc-EEQCbI6nUpWFlEpuNBTy246x-J-4fld6Gxgq77E2yMZj3Tjydxg5vwKGsMKNWxwd2lwKcM4O8szXFVcFIAweiMQkJwjnq4WRJAPWLqkQh7MUi3BN_o6URnnI8oUyL8',
    ring: 'gold',
    containerClass: 'absolute top-[9%] left-1/2 -translate-x-1/2',
    labelClass: 'text-[#fbbf24]',
  },
  {
    id: 'rw',
    name: 'M. Diaz',
    rating: 85,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDKnxEuIR3xTxo-rGQciIkfm9-5MlotWX3yJRZzAI-JIlZi6WgYqQ1wsh8FKuk5e6JvnMzHooQGq8uMlsJ2rDg8u0PR4V5d-BAPlkMpzfELpWJFAo-3051eNvIBb-OZE_Ogn0fOB8L6SmXjbr4ip7D8fe_wXqkF2AQ8TbPr-TZJN1R9lgSV1dgVcXMC8gMU4hUezfg727KU1A7hmQ6eNoVR3--id54NLYjLLUOD86b_kJUFkQTnRrQdceKj4biX9Cfznt_J1dqUHu0',
    ring: 'primary',
    containerClass: 'absolute top-[15%] right-[14%]',
  },
  {
    id: 'lcm',
    name: 'P. Costa',
    rating: 82,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBomOStytNPF-4EvU6lAf13hcF4VbmPeqlWzYA-yErXXAqJS_J6BTIR-NDgD49w_VHiEkAWPm_JE5uRmfWf4NJqcUcavV4RbIHs1ibjJzTj38JgocCSF1ATIbIVFEgAOf7qp7wVIcMXXFA2ZBgiGlCVnyfTieH_Xmla5h-fCbzcPfhFmUu1jFe-oxn27hR0ijHD2O5qtDpQgfadm_X-V0P4pewyIqshjcGyGHJJgHef8MNxuRU9pJ6ajfkrynJny7kp_NJxx0ktjEw',
    ring: 'outline',
    containerClass: 'absolute top-[39%] left-[20%]',
  },
  {
    id: 'cdm',
    name: 'L. Mendes',
    rating: 86,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD8r58Alefej_GsUylSb9MHmEVxlPgs5cEXonDiv9uYeqKrwA6yELJ_AENYkXPaISpsdMg2pVCe4OgWKSFaD56irKSTjmhujNHNJd71wHOFirUaJLVn6BDafYh0OJLCIcUAbpA5NQ16-_gyBzzb0Z5NGM1sijH2C-wF5dT44jQBrlHGw5EbFKH-0jvwvz40NUGji9sgT6ohvxl6ei7keiJLhHaRIKXR0JUAsork0AsZOA8dR-ZUeVqSl07huTs8FDibxMi8Vfea1S8',
    ring: 'primary',
    containerClass: 'absolute top-[44%] left-1/2 -translate-x-1/2',
  },
  {
    id: 'rcm',
    name: 'B. Ruiz',
    rating: 84,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAmB1QZFI8EjBkq0IIxNRupf1a-4_pBoEBlLHwQWasaN5qwWHbBSVeDiesk_8DOpSSJRy6tjb3xt5HMMbZKDEDq6XwUBksVCueh7RUUpOFf_Z001QfCM1lzR5KHeBoQbe6UQJvIZqYqn0xck4F6wIoYIWrOzIND1igVK74OgvfI2wQ1PHEzgJV3v_UOanYRdQ07ERW4dRDpHVj05VIZx8nYIwsCsCK6rz1Q_35zeMisAcfPW0_Q0MPEErmeEeqKtlNLVcFG3e23viw',
    ring: 'outline',
    containerClass: 'absolute top-[39%] right-[20%]',
  },
  {
    id: 'lb',
    name: 'T. Mendes',
    rating: 79,
    ring: 'outline',
    containerClass: 'absolute top-[63%] left-[6%]',
  },
  {
    id: 'lcb',
    name: 'R. Dias',
    rating: 87,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC26X5GCLj9OUIJ7HJsUq_OW4ddbfefEp7AwYWJHuTYk1zIxLtw34bFjpBD6x9gSx5SV_O23FQQJjS6lHM33iNN_KPGA_6Ji5oqgzQA7SibNqIt4x8--uZN4oITkfwgRIcpPBSG_e2XQg7y-kw8k6Uch6J-d6iWpm8n13kZRTLg0l-HrudluKvEcUjpIxC4KSplKNATnT33witJYNHZCxuCrC1E7m8NDOYGI9wuO5YdXT4dvi2dY9ZzQ3MIuESv-cK_1Uw4gSmlewM',
    ring: 'primary',
    containerClass: 'absolute top-[66%] left-[31%]',
  },
  {
    id: 'rcb',
    name: 'M. Akanji',
    rating: 84,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBDenfbuqnn_sH3ine0i9044vU0Bu6BKhfkItM_XukNxXO1131eETRLU6DoXysmS2fRyEKEl3WoBkgq3dfgERtf6msdUAvQ6rgJEEVLneNgQlqCAPB9U9dJIxshePfbhFIjAQHmiOfub4vVpMPuCJU-_PdfBAM7MDSd87Xx6WMM55bFxxBKZ4GhuDMtETVKSFbqXWah4y2Aig875t0ySP2PgiclqZ1c7ZjKBLD6M4149wnNJbliP9ZPgNhryXnDK-qyaI-ImypnJoA',
    ring: 'outline',
    containerClass: 'absolute top-[66%] right-[31%]',
  },
  {
    id: 'rb',
    name: 'D. Dalot',
    rating: 81,
    ring: 'outline',
    containerClass: 'absolute top-[63%] right-[6%]',
  },
  {
    id: 'gk',
    name: 'G. Costa',
    rating: 89,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDmg0b3BYygAb7DcdB_1L95yryA6TqicKrjRnEWehUUU5Op2yaqYOOF93lebB_8lMvTx88LARDqEPc7a0bo4smVSlUyD0DzneuC7XQy6Gn84XQ3FCc_fgAh9n4sR3Gdk51NAurl9Lz972dj_Dx0Zzf2xUu8bvKFES7B3uoI2aRVhKdl0ahYJ7rAfPrynd5z3hYNNVqaJlp3rlAgYyn-ztEKxwPlCnRA_dabqpOVxaRHl8ThKvyvn1Fec-QH02Mw7d1lRuJW1zlu3Kw',
    ring: 'purple',
    containerClass: 'absolute bottom-[5%] left-1/2 -translate-x-1/2',
    labelClass: 'text-[#d8b4fe]',
  },
];

const substitutes: SubPlayer[] = [
  { id: 's1', name: 'N. Ortega', rating: 76, ring: 'outline' },
  {
    id: 's2',
    name: 'L. Martinez',
    rating: 84,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCaUk_grshqjMHyTNfSzkZPYyfNWvRoIZihbpElCPb7I6La29ssMD52EEByCC1U0ogy8kOg3o5Tx59zEIlzCdZ0I7a_QGsZYnMpRV7IH0meAucg9PtZyLAzP3f9KomyY1CczgYPeQgx7fy5YFQcYZYo4QGw5dwLEqWPWOH3VgEYR-jLWDoyWJMQbOLBMDq2hVnBJ3a2fuDkIc8LT1aHPninrX1_0q3ArK-ROvK5n2oqUEe8zEVMCCe57ddK7WUwrWKaVv4CzG4szWo',
    ring: 'primary',
  },
  {
    id: 's3',
    name: 'F. Valverde',
    rating: 85,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC7pONj8LRjWKU24Ij9FNU1DO0bIiIT2EpNSwBnPWDPkcj5GM2au-SZgD9cLs6QpGHGFl53dSI7rhnT1wB-k3kkX-W4Jq8X65Npb99oRUdr_1-ClJ4rbNe3d_dmJG9yJoU4lBj8VStnw5xu7GkjYNsdWMoTnupDOa5N35rQc_W_m4VAvhdHE9fUneve0yWHTZHbVnvl8l4tCV2TcJnMic0ZfRYVHsKerh2ClYCfLDPuKze-8SBV0XyMwlHEMpBRotKRyoBDlgB1PiY',
    ring: 'primary',
  },
  { id: 's4', name: 'R. Leao', rating: 82, ring: 'outline' },
  {
    id: 's5',
    name: 'I. Williams',
    rating: 81,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAGT5u0YvgCY04u2ekyce5Vyk3Cn7BeE89wuenCgaMj_dmV_k2doOMVQZDdA5o9xvLs0b5HUGFxqY3BDEkGPlHzMzj3j1dBsfBWnLyFAkgqnz4qPQngVkHHI7ucz0l4Y3GoxHoFJg-8OvwBim2iSpYz07-iCPFuZPey5Mjb3HRreCFoaUiNy-ErPyh4LRGG1J1_p1mbEzL7Fpd3Dv71WinEbeIMif-3jgFYwu1sD5fhrVJ9z4Bf_eZorxKM8bGO7hKrHiYIvJn7orA',
    ring: 'outline',
  },
  { id: 's6', name: 'D. Nunez', rating: 80, ring: 'outline' },
  {
    id: 's7',
    name: 'K. Thuram',
    rating: 78,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCmG7ccfhyZmtVLqpH8hnlkWrf4PWXe7PBisZ1KNBIKAHskwsu85aS3Ao7E9aWt49hvA_Tf-mIgFNDpyaWn3vZD5zbcGhVefKVT3zYTn1DNBdqjH3q5cbBCa6oC82i6EEpZ29XsaCXBEuYNBIxw1gABcR9hCcMV7qW7KrWGi7vK5Sni4GZUSC6nI3GRuM4HVN4HGAH22fHvH--q5idiQkDPFFtHr8-58eWc9nwcEb1lb6S-PbxVVuW6ZXlJqwA6SP-wAJtLf0FKfQE',
    ring: 'outline',
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
    id: player.id,
    name: player.name,
    fullName: player.name,
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

  const lineup = useMemo(() => selectLineup(catalogPlayers), [catalogPlayers]);
  const savedLineup = useMemo(() => readSavedLineup(), []);
  const starterCards = useMemo(
    () =>
      starters.map((slot) => {
        const saved = savedLineup.starterBySlot.get(slot.id);
        const player = saved ?? lineup.starterBySlot.get(slot.id);
        if (!player) {
          return slot;
        }
        return {
          ...slot,
          name: player.name,
          rating: player.rating,
        };
      }),
    [lineup.starterBySlot, savedLineup.starterBySlot],
  );

  const benchCards = useMemo(
    () =>
      substitutes.map((slot, idx) => {
        const saved = savedLineup.bench[idx];
        const player = saved ?? lineup.bench[idx];
        if (!player) {
          return slot;
        }
        return {
          ...slot,
          name: player.name,
          rating: player.rating,
        };
      }),
    [lineup.bench, savedLineup.bench],
  );

  const control = Math.round((tempo * 0.45 + width * 0.25 + 40) / 1.1);
  const defensiveWall = Math.round((defensiveLine * 0.55 + pressing * 0.35 + 25) / 1.1);
  const chanceCreation = Math.round((tempo * 0.4 + width * 0.35 + pressing * 0.25));

  return (
    <div className="bg-[#101415] text-[#e0e3e5] font-['Inter'] min-h-screen pb-32">
      <header className="flex justify-between items-center px-5 h-16 w-full fixed top-0 z-50 bg-slate-950/60 backdrop-blur-xl border-b border-slate-800/50">
        <button className="text-slate-400 hover:text-emerald-300 transition-colors">
          <span className="material-symbols-outlined">menu</span>
        </button>

        <h1 className="font-['Lexend'] uppercase tracking-widest font-bold text-emerald-500 italic tracking-tighter text-xl">
          DREAM COACH
        </h1>

        <div className="h-8 w-8 rounded-full bg-[#272a2c] overflow-hidden border border-[#3d4a3d]">
          <img
            alt="User Avatar"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCQITB1X7YNiLHQ9Kl0mG9s7M7ShhtxGSisADKkRh9CHKW423xHtpIp0l3BsdkEqdAh_VhOzCWCXMMb6srvtkabDowKy5WmpL7EEnffHyuyCaehy-u9nyLyGUOCffneEOZ4oC8EXXUZRLcUOoCRW2PPo0M2yjsPUmN42JMDvRAWMUcpFr1z09AvDquTns0TBvVMCHImoPEu1LxWgQ3GkEcLYCeMMna4CaVnn5GYQFdqU11ZzUZFtHCfmHvy0UchBSvYRaQemVTIYho"
          />
        </div>
      </header>

      <main className="pt-20 px-5 max-w-3xl mx-auto flex flex-col gap-6">
        <section className="relative bg-[#1d202299] backdrop-blur-md rounded-xl border border-[#3d4a3d] p-4 overflow-hidden shadow-lg">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-50" />

          <div className="flex justify-between items-center mb-4 relative z-10">
            <h2 className="font-['Lexend'] text-xl text-[#e0e3e5]">Squad Builder</h2>
            <div className="bg-[#272a2c] px-3 py-1 rounded-full border border-[#3d4a3d] flex items-center gap-2">
              <span className="text-xs tracking-wider text-[#4be277] font-semibold">OVR</span>
              <span className="font-bold text-[#e0e3e5]">{savedLineup.averageRating ?? lineup.averageRating}</span>
            </div>
          </div>

          <div className="relative w-full aspect-[4/5] bg-[#0a1a12] rounded-lg border border-[#1a3a24] overflow-hidden">
            <div className="absolute inset-0 opacity-20 border border-white/30 m-4 rounded-sm" />
            <div className="absolute top-1/2 left-4 right-4 h-px bg-white/30" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-white/30" />
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-40 h-24 border border-white/30 rounded-b-sm border-t-0" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-40 h-24 border border-white/30 rounded-t-sm border-b-0" />

            {starterCards.map((player) => (
              <div key={player.id} className={`${player.containerClass} z-10 flex flex-col items-center`}>
                <div className={`relative ${player.id === 'st' || player.id === 'gk' ? 'w-14 h-14' : 'w-12 h-12'}`}>
                  <PlayerAvatar image={player.image} ring={player.ring ?? 'outline'} />
                  <div
                    className={`absolute -bottom-2 -right-2 text-xs font-bold px-1.5 rounded border border-[#3d4a3d] ${badgeClass(
                      player.ring ?? 'outline',
                    )}`}
                  >
                    {player.rating}
                  </div>
                </div>
                <span className={`text-xs font-bold mt-1 bg-[#1d2022cc] px-1 rounded ${player.labelClass ?? ''}`}>{player.name}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="font-['Lexend'] text-xl text-[#e0e3e5] mb-2">Substitutes</h3>
          <div className="flex gap-2 overflow-x-auto pb-4 snap-x no-scrollbar">
            {benchCards.map((player) => (
              <div
                key={player.id}
                className="snap-start flex-shrink-0 bg-[#1d202266] p-2 rounded-lg border border-[#3d4a3d] flex flex-col items-center min-w-[70px]"
              >
                <div className="relative w-10 h-10 mb-1">
                  <PlayerAvatar image={player.image} ring={player.ring ?? 'outline'} size="small" />
                  <div className="absolute -bottom-1 -right-1 bg-[#1d2022] text-[#e0e3e5] text-[10px] font-bold px-1 rounded border border-[#3d4a3d]">
                    {player.rating}
                  </div>
                </div>
                <span className="text-[10px] text-[#bccbb9] text-center leading-tight">{player.name}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#1d202299] backdrop-blur-md rounded-xl border border-[#3d4a3d] p-5 shadow-lg">
          <h3 className="font-['Lexend'] text-xl text-[#e0e3e5] mb-4">Team Tactics</h3>

          <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2">
            {(['Balanced', 'High Press', 'Counter', 'Possession'] as TacticPreset[]).map((item) => (
              <button
                key={item}
                onClick={() => setPreset(item)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full border text-xs tracking-wider font-semibold ${
                  preset === item
                    ? 'bg-[#4be27722] border-[#4be277] text-[#4be277]'
                    : 'bg-[#272a2c] border-[#3d4a3d] text-[#bccbb9]'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="space-y-4 mb-6">
            <RatingBar label="Control" value={control} />
            <RatingBar label="Defensive Wall" value={defensiveWall} />
            <RatingBar label="Chance Creation" value={chanceCreation} />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-6">
            <SliderMetric label="Defensive Line" value={defensiveLine} setValue={setDefensiveLine} hint="Mid" />
            <SliderMetric label="Tempo" value={tempo} setValue={setTempo} hint="Fast" />
            <SliderMetric label="Width" value={width} setValue={setWidth} hint="Wide" />
            <SliderMetric label="Pressing" value={pressing} setValue={setPressing} hint="High" />
          </div>
        </section>

        <section className="bg-[#191c1e] border border-[#4be27755] rounded-xl p-4 flex gap-4 items-start shadow-[0_0_15px_rgba(34,197,94,0.1)]">
          <div className="bg-[#4be27722] p-2 rounded-lg text-[#4be277]">
            <span className="material-symbols-outlined">lightbulb</span>
          </div>
          <div>
            <h4 className="font-bold text-[#e0e3e5] mb-1">Coach Insight</h4>
            <p className="text-sm text-[#bccbb9] leading-relaxed">
              Your defensive line is high. Consider a deeper line or more cover behind to avoid being caught on the counter.
            </p>
          </div>
        </section>

        {(loadingPlayers || playersError) && (
          <section className="bg-[#1d2022] border border-[#3d4a3d] rounded-xl p-4 text-sm">
            {loadingPlayers ? (
              <p className="text-[#bccbb9]">Loading real players from database...</p>
            ) : (
              <p className="text-[#ffb4ab]">{playersError}</p>
            )}
          </section>
        )}

        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => navigate('/player-selection')}
            className="w-full bg-[#1d2022] hover:bg-[#242a2c] border border-[#3d4a3d] text-[#e0e3e5] font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <span className="material-symbols-outlined text-[#4be277]">manage_search</span>
            OPEN PLAYER SELECTION
          </button>

          <button
            onClick={() => {
              const existing = loadSquadPayload();
              const payload = existing
                ? {
                    ...existing,
                    team: {
                      ...existing.team,
                      tacticalStyle: tacticalStyleFromPreset(preset),
                    },
                  }
                : buildSimulationPayloadFromStarters(
                    lineup.startersForPayload,
                    tacticalStyleFromPreset(preset),
                    lineup.benchForPayload,
                  );

              saveSquadPayload(payload);
              saveSquadSnapshot(payload);
              navigate('/live-match');
            }}
            className="w-full bg-[#4be277] hover:bg-[#22c55e] text-[#003915] font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            SAVE &amp; CONTINUE
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 pb-safe bg-slate-950/80 backdrop-blur-2xl border-t border-slate-800/50 rounded-t-xl shadow-[0_-4px_20px_rgba(0,0,0,0.5)] md:hidden">
        <button className="flex flex-col items-center justify-center text-emerald-400 bg-emerald-500/10 rounded-lg py-1 px-3 active:scale-90 duration-150">
          <span className="material-symbols-outlined">groups</span>
          <span className="font-['Lexend'] text-[10px] font-semibold uppercase tracking-tighter mt-1">Squad</span>
        </button>
        <button className="flex flex-col items-center justify-center text-slate-500 py-1 px-3 hover:bg-slate-800/50 transition-all hover:text-emerald-300">
          <span className="material-symbols-outlined">strategy</span>
          <span className="font-['Lexend'] text-[10px] font-semibold uppercase tracking-tighter mt-1">Tactics</span>
        </button>
        <button
          onClick={() => navigate('/live-match')}
          className="flex flex-col items-center justify-center text-slate-500 py-1 px-3 hover:bg-slate-800/50 transition-all hover:text-emerald-300"
        >
          <span className="material-symbols-outlined">sports_soccer</span>
          <span className="font-['Lexend'] text-[10px] font-semibold uppercase tracking-tighter mt-1">Match</span>
        </button>
        <button className="flex flex-col items-center justify-center text-slate-500 py-1 px-3 hover:bg-slate-800/50 transition-all hover:text-emerald-300">
          <span className="material-symbols-outlined">swap_horiz</span>
          <span className="font-['Lexend'] text-[10px] font-semibold uppercase tracking-tighter mt-1">Transfers</span>
        </button>
        <button className="flex flex-col items-center justify-center text-slate-500 py-1 px-3 hover:bg-slate-800/50 transition-all hover:text-emerald-300">
          <span className="material-symbols-outlined">settings_account_box</span>
          <span className="font-['Lexend'] text-[10px] font-semibold uppercase tracking-tighter mt-1">Office</span>
        </button>
      </nav>
    </div>
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
      ? 'border-[#4be277]'
      : ring === 'gold'
      ? 'border-[#fbbf24]'
      : ring === 'purple'
      ? 'border-[#a855f7]'
      : 'border-[#869585]';

  const iconSize = size === 'small' ? 'text-sm' : 'text-base';

  if (!image) {
    return (
      <div className={`w-full h-full rounded-full border-2 ${borderClass} bg-[#323537] flex items-center justify-center`}>
        <span className={`material-symbols-outlined text-[#869585] ${iconSize}`}>person</span>
      </div>
    );
  }

  return <img className={`w-full h-full rounded-full border-2 ${borderClass} object-cover`} src={image} alt="Player" />;
}

function badgeClass(ring: 'primary' | 'gold' | 'purple' | 'outline') {
  if (ring === 'gold') {
    return 'bg-[#fbbf24] text-black';
  }
  if (ring === 'purple') {
    return 'bg-[#a855f7] text-white';
  }
  return 'bg-[#272a2c] text-[#e0e3e5]';
}

function RatingBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-[#e0e3e5]">{label}</span>
        <span className="text-[#4be277] font-bold">{Math.min(99, value)}</span>
      </div>
      <div className="w-full bg-[#323537] rounded-full h-2 overflow-hidden">
        <div className="bg-[#4be277] h-2 rounded-full" style={{ width: `${Math.min(99, Math.max(0, value))}%` }} />
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
      <div className="flex justify-between text-xs mb-2 text-[#bccbb9]">
        <span>{label}</span>
        <span>{hint}</span>
      </div>
      <input
        className="w-full h-1 bg-[#323537] rounded-lg appearance-none cursor-pointer accent-[#4be277]"
        max={100}
        min={1}
        type="range"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
      />
    </div>
  );
}


