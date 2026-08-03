import React, { useState, useEffect } from 'react';
import { Player, Rotation, Plan } from '../types';
import { POSITIONS, POSITION_GROUPS } from '../constants';
import ThreeWayRotationModal from './ThreeWayRotationModal';
import {
  ArrowLeft,
  Trash2,
  RotateCcw,
  Plus,
  ArrowRight,
  Repeat,
  ChevronDown,
  Layers,
  Sparkles,
  CheckCircle2,
  XCircle,
  Zap,
  RefreshCw
} from 'lucide-react';

interface PlanModeViewProps {
  onClose: () => void;
  players: Player[];
  onUpdatePlayers: (players: Player[]) => void;
  lineup: Record<string, string>;
  onUpdateLineup: (lineup: Record<string, string>) => void;
  rotations: Rotation[];
  onUpdateRotations: (rotations: Rotation[]) => void;
  plans: Plan[];
  onUpdatePlans: (plans: Plan[]) => void;
  currentQuarter?: number;
  activePlanIds?: string[];
  onTogglePlanRunning?: (planId: string) => void;
}

const POSITION_DESCRIPTIONS: Record<string, string> = {
  'RBP': 'Right Back Pkt',
  'FB': 'Full Back',
  'LBP': 'Left Back Pkt',
  'RBF': 'Right Back Flank',
  'RHB': 'Right Back Flank',
  'CHB': 'Ctr Half Back',
  'LBF': 'Left Back Flank',
  'LHB': 'Left Back Flank',
  'RR': 'Ruck Rover',
  'ROV': 'Rover',
  'RW': 'Right Wing',
  'LW': 'Left Wing',
  'C': 'Centre',
  'M3': 'Ruck Rover',
  'M2': 'Rover',
  'M1': 'Centre',
  'R': 'Ruck',
  'RHF': 'Right Half Fwd',
  'CHF': 'Ctr Half Fwd',
  'LHF': 'Left Half Fwd',
  'RFP': 'Right Fwd Pkt',
  'FF': 'Full Forward',
  'LFP': 'Left Fwd Pkt',
};

export default function PlanModeView({
  onClose,
  players,
  onUpdatePlayers,
  lineup,
  onUpdateLineup,
  rotations,
  onUpdateRotations,
  plans,
  onUpdatePlans,
  currentQuarter = 1,
  activePlanIds = [],
  onTogglePlanRunning,
}: PlanModeViewProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(plans[0]?.id || '');

  useEffect(() => {
    if (!plans.some((p) => p.id === selectedPlanId)) {
      setSelectedPlanId(plans[0]?.id || '');
    }
  }, [plans, selectedPlanId]);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(currentQuarter);
  const [selectedMinute, setSelectedMinute] = useState<number>(7);
  const [showThreeWayModal, setShowThreeWayModal] = useState(false);

  // Link selection state for rotation linking
  const [selectedSource, setSelectedSource] = useState<{ type: 'bench' | 'field'; id: string; slot?: string } | null>(null);

  const currentPlan = plans.find((p) => p.id === selectedPlanId) || plans[0] || null;

  // Filter rotations for selected quarter
  const qRotations = rotations.filter(
    (r) => (currentPlan ? r.planId === currentPlan.id : true) && r.quarter === selectedQuarter
  );

  // Active field vs bench
  const activeFieldPids = new Set(Object.values(lineup));
  const benchPlayers = players.filter((p) => p.status === 'available' && !activeFieldPids.has(p.id));

  // Helper time format
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Helper energy calculation
  const getEnergyPct = (p: Player) => {
    if (p.status === 'injured') return 0;
    const secs = p.active || 0;
    if (secs > 1500) return 60;
    if (secs > 1000) return 75;
    if (secs > 600) return 88;
    if (secs > 200) return 93;
    return 100;
  };

  // Connect two selected entities (field or bench)
  const handleEntityClick = (entity: { type: 'bench' | 'field'; id: string; slot?: string }) => {
    if (!selectedSource) {
      setSelectedSource(entity);
    } else if (selectedSource.id === entity.id) {
      setSelectedSource(null);
    } else {
      createRotation(selectedSource, entity);
    }
  };

  const createRotation = (
    from: { type: 'bench' | 'field'; id: string; slot?: string },
    to: { type: 'bench' | 'field'; id: string; slot?: string }
  ) => {
    if (from.id === to.id) return;
    const pOut = players.find((p) => p.id === from.id);
    const pIn = players.find((p) => p.id === to.id);
    if (!pOut || !pIn) return;

    const isBenchSwap = from.type === 'bench' || to.type === 'bench';

    const newRot: Rotation = {
      id: `rot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      planId: currentPlan?.id || 'default-plan',
      quarter: selectedQuarter,
      minute: selectedMinute,
      type: isBenchSwap ? 'bench' : 'onfield',
      outId: pOut.id,
      inId: pIn.id,
      out: `${from.slot || 'Bench'} #${pOut.number} ${pOut.name}`,
      inn: `${to.slot || 'Bench'} #${pIn.number} ${pIn.name}`,
      note: isBenchSwap ? 'Bench Interchange' : 'On-Field Position Swap',
      applied: false,
      status: 'scheduled',
    };

    onUpdateRotations([...rotations, newRot]);
    setSelectedSource(null);
  };

  const handleRemoveRotation = (rotId: string) => {
    onUpdateRotations(rotations.filter((r) => r.id !== rotId));
  };

  const handleClearQueue = () => {
    onUpdateRotations(rotations.filter((r) => r.quarter !== selectedQuarter));
  };

  const handleApplyPlanToGame = () => {
    if (qRotations.length === 0) return;
    const nextLineup = { ...lineup };

    qRotations.forEach((rot) => {
      const outSlot = Object.keys(lineup).find((k) => lineup[k] === rot.outId);
      const inSlot = Object.keys(lineup).find((k) => lineup[k] === rot.inId);

      if (outSlot && inSlot) {
        nextLineup[outSlot] = rot.inId;
        nextLineup[inSlot] = rot.outId;
      } else if (outSlot) {
        nextLineup[outSlot] = rot.inId;
      }
    });

    onUpdateLineup(nextLineup);
    const appliedIds = new Set(qRotations.map((r) => r.id));
    onUpdateRotations(
      rotations.map((r) => (appliedIds.has(r.id) ? { ...r, applied: true, status: 'applied' } : r))
    );

    alert(`Successfully applied Quarter ${selectedQuarter} plan to active game lineup!`);
  };

  return (
    <div className="fixed inset-0 bg-[#f3f4f6] z-50 overflow-hidden flex flex-col font-sans select-none text-slate-900">
      
      {/* Sleek Top Bar */}
      <div className="h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-700" />
            <span>Back to game</span>
          </button>

          <div className="text-slate-600 text-xs font-bold flex items-center gap-2">
            <span>Quarter {selectedQuarter}</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-900 font-black">Plan Mode</span>
          </div>
        </div>

        {/* Quarter Selector & 3-Way Generator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowThreeWayModal(true)}
            className="px-2.5 py-1 text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-md transition cursor-pointer flex items-center gap-1 shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>3-Way Generator</span>
          </button>

          <div className="flex bg-slate-100 p-0.5 rounded-md gap-1">
            {[1, 2, 3, 4].map((q) => (
              <button
                key={q}
                onClick={() => setSelectedQuarter(q)}
                className={`px-2.5 py-0.5 text-xs font-extrabold rounded transition cursor-pointer ${
                  selectedQuarter === q
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Q{q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main 3-Column Workspace Layout */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden bg-[#f3f4f6]">

        {/* LEFT COLUMN: BENCH PLAYERS PANEL */}
        <div className="col-span-3 sm:col-span-2 lg:col-span-3 border-r border-slate-200 bg-[#f8fafc] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-slate-200 flex items-center gap-2 bg-white shrink-0">
            <span className="font-extrabold text-xs uppercase tracking-wider text-slate-700">BENCH</span>
            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center">
              {benchPlayers.length}
            </span>
          </div>

          {/* Bench Player Cards List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {benchPlayers.map((p) => {
              const energyPct = getEnergyPct(p);
              const isSelected = selectedSource?.id === p.id;

              return (
                <div
                  key={p.id}
                  onClick={() => handleEntityClick({ type: 'bench', id: p.id })}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 shadow-xs ${
                    isSelected
                      ? 'bg-amber-50/80 border-2 border-slate-900 ring-2 ring-slate-900/20 shadow-sm scale-[1.01]'
                      : 'bg-white border-slate-200/90 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-6 h-6 rounded-md font-black text-white text-[11px] flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-orange-600' :
                      Number(p.number) % 4 === 0 ? 'bg-orange-600' :
                      Number(p.number) % 3 === 0 ? 'bg-blue-600' :
                      Number(p.number) % 2 === 0 ? 'bg-purple-600' : 'bg-slate-900'
                    }`}>
                      {p.number}
                    </div>

                    <div className="min-w-0 flex flex-col justify-center">
                      <div className="font-extrabold text-[11px] text-slate-900 truncate leading-tight">
                        {p.name.split(' ').length > 1 ? `${p.name.split(' ')[0][0]}. ${p.name.split(' ').slice(1).join(' ')}` : p.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold flex items-center gap-2 leading-tight">
                        <span>{formatTime(p.active || 314)}</span>
                        <span>{energyPct}%</span>
                        <span className={`w-2 h-2 rounded-full shrink-0 flex items-center justify-center text-[6px] text-white font-black ${
                          energyPct < 20 ? 'bg-red-500' :
                          energyPct < 70 ? 'bg-amber-400' : 'bg-emerald-500'
                        }`}>
                          {energyPct < 20 && '!'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {benchPlayers.length === 0 && (
              <div className="p-6 text-center text-slate-400 text-xs italic">
                All players active on field
              </div>
            )}
          </div>
        </div>

        {/* CENTER COLUMN: AFL PITCH CANVAS */}
        <div className="col-span-6 sm:col-span-7 lg:col-span-6 relative flex flex-col items-center justify-center p-2 sm:p-3 overflow-hidden bg-[#f3f4f6]">
          
          {/* EXACT GAMEDAY PITCH CONTAINER WITH RADIAL TURF & 3D GOAL POSTS */}
          <div className="field relative select-none w-full max-w-[490px] my-auto">
            <div className="centre-square"></div>
            <div className="centre-circle-inner"></div>
            <div className="fifty-arc-top"></div>
            <div className="fifty-arc-bottom"></div>

            {/* AFL Goal Posts & Markings - Top End (Forwards) */}
            <div className="goal-line-top" id="afl-goal-line-top"></div>
            <div className="goal-square-top" id="afl-goal-square-top"></div>
            <div className="goal-post behind top-left-behind" id="afl-goal-post-top-1"></div>
            <div className="goal-post main top-left-main" id="afl-goal-post-top-2"></div>
            <div className="goal-post main top-right-main" id="afl-goal-post-top-3"></div>
            <div className="goal-post behind top-right-behind" id="afl-goal-post-top-4"></div>

            <div className="absolute top-1 left-1/2 -translate-x-1/2 z-10 pointer-events-none opacity-80 flex items-center gap-1 bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-full text-[8px] font-black uppercase text-red-300 tracking-wider border border-red-500/30">
              <span>🔥 Forwards / Attacking Goal</span>
            </div>

            {/* AFL Goal Posts & Markings - Bottom End (Defenders) */}
            <div className="goal-line-bottom" id="afl-goal-line-bottom"></div>
            <div className="goal-square-bottom" id="afl-goal-square-bottom"></div>
            <div className="goal-post behind bottom-left-behind" id="afl-goal-post-bottom-1"></div>
            <div className="goal-post main bottom-left-main" id="afl-goal-post-bottom-2"></div>
            <div className="goal-post main bottom-right-main" id="afl-goal-post-bottom-3"></div>
            <div className="goal-post behind bottom-right-behind" id="afl-goal-post-bottom-4"></div>

            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-10 pointer-events-none opacity-80 flex items-center gap-1 bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-full text-[8px] font-black uppercase text-emerald-300 tracking-wider border border-emerald-500/30">
              <span>🛡️ Defenders / Defending Goal</span>
            </div>

            {/* BOLD HIGH-CONTRAST DASHED CONNECTING ARROWS */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-30" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <marker id="afl-arrow-dark" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#0f172a" />
                </marker>
              </defs>

              {/* Render dashed lines between queued rotations */}
              {qRotations.map((rot) => {
                const outSlot = Object.keys(lineup).find((k) => lineup[k] === rot.outId);
                const inSlot = Object.keys(lineup).find((k) => lineup[k] === rot.inId);

                const outPosConfig = outSlot ? POSITIONS.find(([sn]) => sn === outSlot) : null;
                const inPosConfig = inSlot ? POSITIONS.find(([sn]) => sn === inSlot) : null;

                const x1 = outPosConfig ? outPosConfig[2] : 5;
                const y1 = outPosConfig ? outPosConfig[3] : 50;
                const x2 = inPosConfig ? inPosConfig[2] : 50;
                const y2 = inPosConfig ? inPosConfig[3] : 50;

                return (
                  <g key={rot.id}>
                    <line
                      x1={`${x1}%`}
                      y1={`${y1}%`}
                      x2={`${x2}%`}
                      y2={`${y2}%`}
                      stroke="#0f172a"
                      strokeWidth="2.2"
                      strokeDasharray="4,4"
                      markerEnd="url(#afl-arrow-dark)"
                      opacity="0.9"
                    />
                  </g>
                );
              })}
            </svg>

            {/* FIELD POSITIONS EXACTLY MATCHING GAMEDAY */}
            {POSITIONS.map(([slotName, label, x, y]) => {
              const pid = lineup[slotName];
              const p = pid ? players.find((x) => x.id === pid) : null;
              const energyPct = p ? getEnergyPct(p) : 100;
              const isSelected = selectedSource?.id === pid;
              const isQueued = qRotations.some((r) => r.outId === pid || r.inId === pid);

              return (
                <div
                  key={slotName}
                  onClick={() => {
                    if (p) {
                      handleEntityClick({ type: 'field', id: p.id, slot: slotName });
                    } else if (selectedSource) {
                      const pSource = players.find((x) => x.id === selectedSource.id);
                      if (pSource) {
                        if (selectedSource.type === 'bench') {
                          // Assign bench player directly to empty slot or create rotation
                          const updated = { ...lineup, [slotName]: pSource.id };
                          onUpdateLineup(updated);
                        } else if (selectedSource.type === 'field' && selectedSource.slot) {
                          // Move player on field to empty slot
                          const updated = { ...lineup };
                          delete updated[selectedSource.slot];
                          updated[slotName] = pSource.id;
                          onUpdateLineup(updated);
                        }
                        setSelectedSource(null);
                      }
                    }
                  }}
                  className={`slot flex items-center justify-center transition-all ${
                    ['R', 'ROV', 'RR', 'C', 'CHF', 'CHB', 'FF', 'FB'].includes(slotName) ? 'key' : ''
                  } ${
                    isSelected
                      ? 'ring-4 ring-slate-900 shadow-[0_0_24px_rgba(15,23,42,0.9)] scale-105 z-40'
                      : isQueued
                        ? 'ring-2 ring-orange-500 scale-105 z-30'
                        : selectedSource
                          ? 'hover:ring-2 hover:ring-emerald-400 cursor-pointer'
                          : ''
                  }`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  {p ? (
                    <div className={`relative overflow-hidden w-full h-full rounded-xl bg-white p-1 shadow-md border flex items-center gap-1.5 transition-all select-none ${
                      isSelected
                        ? 'border-2 border-slate-900 ring-2 ring-slate-900/30'
                        : isQueued
                          ? 'border-2 border-orange-500 ring-1 ring-orange-300'
                          : 'border-slate-300 hover:border-slate-400'
                    }`}>
                      {/* Jumper Number Box */}
                      <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md font-black text-white text-[9px] sm:text-[11px] flex items-center justify-center shrink-0 shadow-xs ${
                        POSITION_GROUPS.FWD.includes(slotName) ? 'bg-[#ea580c]' :
                        POSITION_GROUPS.MID.includes(slotName) ? 'bg-[#1d4ed8]' :
                        POSITION_GROUPS.DEF.includes(slotName) ? 'bg-[#15803d]' : 'bg-[#7e22ce]'
                      }`}>
                        {p.number}
                      </div>

                      {/* Player Name & Bottom Stats Row */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5 text-left">
                        <div className="font-extrabold text-[8px] sm:text-[9.5px] text-slate-900 truncate leading-none" title={p.name}>
                          {p.nick || (p.name.split(' ').length > 1 ? `${p.name.split(' ')[0][0]}. ${p.name.split(' ').slice(1).join(' ')}` : p.name)}
                        </div>

                        <div className="flex items-center justify-between gap-0.5 leading-none text-[6.5px] sm:text-[7.5px] font-black text-slate-600">
                          <span className="px-1 py-0.5 rounded bg-slate-100 text-slate-700 uppercase font-black tracking-tighter">
                            {label}
                          </span>
                          <span>{formatTime(p.active || 314)}</span>
                          <span className="text-slate-800">{energyPct}%</span>
                          <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ${
                            energyPct < 30 ? 'bg-red-500 animate-pulse' :
                            energyPct < 70 ? 'bg-amber-400' : 'bg-emerald-500'
                          }`} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full text-center p-0.5 sm:p-1 cursor-pointer">
                      <span className="text-amber-300 font-black text-[9px] sm:text-[11px] leading-none mb-0.5 tracking-wider uppercase">{label}</span>
                      <span className="hidden sm:block text-[7px] text-white/70 font-extrabold truncate max-w-full leading-tight mb-1" title={POSITION_DESCRIPTIONS[slotName] || slotName}>
                        {POSITION_DESCRIPTIONS[slotName] || slotName}
                      </span>
                      <span className="text-[6px] sm:text-[7px] font-black uppercase text-white/50 border border-dashed border-white/20 bg-white/5 px-1 py-0.5 rounded-sm sm:rounded-md hover:bg-white/15 transition-all">
                        + Assign
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* DEF / FWD DIRECTION INDICATOR AT BOTTOM RIGHT OF PITCH */}
            <div className="absolute bottom-3 right-4 z-20 flex flex-col items-center gap-0.5 text-[8px] font-black text-slate-700/80 uppercase tracking-wider">
              <span>DEF</span>
              <div className="w-4 h-4 rounded-full border border-slate-700/60 flex items-center justify-center text-[9px]">
                ↓
              </div>
              <span>FWD</span>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: QUEUE & NEW PLAN PANEL */}
        <div className="col-span-3 sm:col-span-3 lg:col-span-3 border-l border-slate-200 bg-white text-slate-900 flex flex-col overflow-hidden">
          
          {/* Header Bar matching GameDay style */}
          <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xs tracking-wider text-orange-600">Queue</span>
              <span className="w-4 h-4 rounded-full bg-red-500 text-white font-black text-[10px] flex items-center justify-center">
                {qRotations.length}
              </span>
            </div>

            <span className="text-[11px] font-black uppercase text-slate-900 tracking-wider italic">
              PLAN Q{selectedQuarter}
            </span>
          </div>

          {/* Dynamic Queue List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
            {qRotations.length === 0 ? (
              <div className="text-center py-8 px-2 space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div className="font-extrabold text-xs text-slate-700">No Rotations Queued</div>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Select a player on the field or bench, then tap another player or slot to queue a rotation move for Quarter {selectedQuarter}.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Substitution Group Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full border-2 border-orange-500/80 text-slate-900 font-extrabold text-xs flex items-center justify-center">
                      {qRotations.length}
                    </div>
                    <div className="font-extrabold text-xs text-slate-900">
                      Planned Moves
                    </div>
                  </div>
                  <button
                    onClick={handleClearQueue}
                    className="text-[10px] font-bold text-red-600 hover:text-red-700 transition cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>

                {/* Substitution Move List */}
                <div className="space-y-2.5">
                  {qRotations.map((rot) => {
                    const pOut = players.find((p) => p.id === rot.outId);
                    const pIn = players.find((p) => p.id === rot.inId);

                    return (
                      <div
                        key={rot.id}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-50 transition flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          {pOut && (
                            <div className="flex items-center gap-1.5 font-extrabold text-slate-900 truncate">
                              <ArrowLeft className="w-3.5 h-3.5 text-red-500 shrink-0 stroke-[2.5]" />
                              <span className="text-[11px] text-red-600 font-black">#{pOut.number}</span>
                              <span className="truncate">{pOut.name}</span>
                              <span className="text-[9px] text-slate-500 font-semibold uppercase">({rot.out.split(' ')[0]})</span>
                            </div>
                          )}

                          {pIn && (
                            <div className="flex items-center gap-1.5 font-extrabold text-slate-900 truncate">
                              <ArrowRight className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[2.5]" />
                              <span className="text-[11px] text-emerald-600 font-black">#{pIn.number}</span>
                              <span className="truncate">{pIn.name}</span>
                              <span className="text-[9px] text-slate-500 font-semibold uppercase">({rot.inn.split(' ')[0]})</span>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleRemoveRotation(rot.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition shrink-0 cursor-pointer"
                          title="Remove rotation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action Footer Buttons */}
          <div className="p-3 border-t border-slate-200 bg-white grid grid-cols-2 gap-2 shrink-0">
            <button
              onClick={handleClearQueue}
              className="py-2 px-3 font-extrabold text-[11px] rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition cursor-pointer uppercase tracking-wider text-center"
            >
              CLEAR
            </button>
            <button
              onClick={handleApplyPlanToGame}
              disabled={qRotations.length === 0}
              className={`py-2 px-3 font-extrabold text-[11px] rounded-lg border transition uppercase tracking-wider text-center ${
                qRotations.length > 0
                  ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900 cursor-pointer shadow-xs'
                  : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              }`}
            >
              APPLY TO GAME
            </button>
          </div>
        </div>

      </div>

      {/* 3-Way Set Rotation Generator Modal */}
      <ThreeWayRotationModal
        isOpen={showThreeWayModal}
        onClose={() => setShowThreeWayModal(false)}
        players={players}
        lineup={lineup}
        plans={plans}
        currentPlanId={selectedPlanId}
        onUpdatePlans={onUpdatePlans}
        rotations={rotations}
        onUpdateRotations={onUpdateRotations}
      />
    </div>
  );
}
