import React, { useState } from 'react';
import { Player, Rotation, Plan } from '../types';
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
  Zap
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

// AFL 18 positional slots coordinates on pitch
const FIELD_POSITIONS: { slot: string; label: string; x: number; y: number }[] = [
  // Forward Line
  { slot: 'FP-L', label: 'FPL', x: 26, y: 15 },
  { slot: 'FF', label: 'FF', x: 50, y: 12 },
  { slot: 'FP-R', label: 'FPR', x: 74, y: 15 },

  // Half Forward Line
  { slot: 'HF-L', label: 'HFL', x: 24, y: 28 },
  { slot: 'CHF', label: 'CHF', x: 50, y: 28 },
  { slot: 'HF-R', label: 'HFR', x: 76, y: 28 },

  // Ruck
  { slot: 'R', label: 'R', x: 50, y: 41 },

  // Midfield Line
  { slot: 'W-L', label: 'WL', x: 18, y: 52 },
  { slot: 'ROV', label: 'ROV', x: 38, y: 52 },
  { slot: 'RR', label: 'RR', x: 62, y: 52 },
  { slot: 'W-R', label: 'WR', x: 82, y: 52 },

  // Center
  { slot: 'C', label: 'C', x: 50, y: 62 },

  // Half Back Line
  { slot: 'HB-L', label: 'HBL', x: 24, y: 74 },
  { slot: 'CHB', label: 'CHB', x: 50, y: 74 },
  { slot: 'HB-R', label: 'HBR', x: 76, y: 74 },

  // Back Line
  { slot: 'BP-L', label: 'BPL', x: 26, y: 88 },
  { slot: 'FB', label: 'FB', x: 50, y: 90 },
  { slot: 'BP-R', label: 'BPR', x: 74, y: 88 },
];

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
  const [selectedQuarter, setSelectedQuarter] = useState<number>(currentQuarter);
  const [selectedMinute, setSelectedMinute] = useState<number>(7);

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
    <div className="fixed inset-0 bg-[#0b0f19] z-50 overflow-hidden flex flex-col font-sans select-none text-slate-100">
      
      {/* Sleek Top Navigation Header */}
      <div className="h-14 bg-[#080c14] border-b border-slate-800/80 px-5 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-bold transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to game</span>
          </button>

          <div className="text-slate-400 text-xs font-bold flex items-center gap-2">
            <span>Quarter {selectedQuarter}</span>
            <span className="text-slate-600">•</span>
            <span className="text-amber-400 font-extrabold">Q{selectedQuarter} Rotation</span>
          </div>
        </div>

        {/* Center Mode Pill Badge */}
        <div className="px-5 py-1.5 rounded-full bg-slate-900 border border-slate-700/80 flex items-center gap-2 text-xs font-black tracking-widest uppercase text-white shadow-inner">
          <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" />
          <span>PLAN MODE</span>
        </div>

        {/* Right Quarter Selectors */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900/90 border border-slate-800 p-1 rounded-lg gap-1">
            {[1, 2, 3, 4].map((q) => (
              <button
                key={q}
                onClick={() => setSelectedQuarter(q)}
                className={`px-3 py-1 text-xs font-black rounded-md transition cursor-pointer ${
                  selectedQuarter === q
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Q{q}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              const newPlanName = prompt('Enter new plan name:', `Plan ${plans.length + 1}`);
              if (newPlanName) {
                const newPlan: Plan = {
                  id: `plan-${Date.now()}`,
                  name: newPlanName,
                };
                onUpdatePlans([...plans, newPlan]);
                setSelectedPlanId(newPlan.id);
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-600/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>NEW PLAN</span>
          </button>
        </div>
      </div>

      {/* Main 3-Column Workspace Layout */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden bg-[#0b0f19]">

        {/* LEFT COLUMN: BENCH PLAYERS PANEL */}
        <div className="col-span-3 sm:col-span-2 lg:col-span-3 border-r border-slate-800/80 bg-[#0f172a]/60 flex flex-col overflow-hidden">
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-[#0b1220]">
            <div className="flex items-center gap-2">
              <span className="font-black text-xs uppercase tracking-wider text-slate-200">BENCH</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-[10px]">
                {benchPlayers.length}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">Tap to swap to field</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {benchPlayers.map((p) => {
              const energyPct = getEnergyPct(p);
              const isSelected = selectedSource?.id === p.id;

              return (
                <div
                  key={p.id}
                  onClick={() => handleEntityClick({ type: 'bench', id: p.id })}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 shadow-sm ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/50'
                      : 'bg-[#162032] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-md">
                      {p.number}
                    </div>

                    <div className="min-w-0">
                      <div className="font-extrabold text-xs text-slate-100 truncate">
                        {p.nick || p.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                        <span>Bench: {formatTime(p.bench || 0)}</span>
                        <span>•</span>
                        <span>Field: {formatTime(p.active || 0)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Energy Pill */}
                  <div className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[10px] font-black flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{energyPct}%</span>
                  </div>
                </div>
              );
            })}

            {benchPlayers.length === 0 && (
              <div className="p-6 text-center text-slate-500 text-xs italic">
                All players active on field
              </div>
            )}
          </div>
        </div>

        {/* CENTER COLUMN: AFL PITCH CANVAS */}
        <div className="col-span-6 sm:col-span-7 lg:col-span-6 relative flex flex-col items-center justify-center p-4 overflow-hidden bg-[#080d1a]">
          
          {/* Pitch Top Subheader Instruction */}
          <div className="absolute top-3 left-6 right-6 flex items-center justify-between z-20 pointer-events-none">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300">
              Quarter {selectedQuarter} Visual Pitch Layout
            </span>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800">
              {selectedSource ? '⚡ Tap target player to link swap' : 'Tap two players to link rotation'}
            </span>
          </div>

          {/* Dark AFL Pitch Canvas Container */}
          <div className="w-full max-w-[620px] aspect-[4/5] relative rounded-[60px] overflow-hidden border-2 border-emerald-800/80 bg-[#04281d] shadow-2xl my-auto">
            
            {/* Crisp Pitch SVG Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Outer oval border */}
              <ellipse cx="50" cy="50" rx="46" ry="46" fill="none" stroke="rgba(52,211,153,0.35)" strokeWidth="0.6" />
              <ellipse cx="50" cy="50" rx="40" ry="40" fill="none" stroke="rgba(52,211,153,0.15)" strokeWidth="0.4" />
              
              {/* Center Square & Circles */}
              <rect x="36" y="38" width="28" height="24" fill="rgba(52,211,153,0.03)" stroke="rgba(52,211,153,0.3)" strokeWidth="0.5" />
              <circle cx="50" cy="50" r="7" fill="none" stroke="rgba(52,211,153,0.3)" strokeWidth="0.5" />
              <circle cx="50" cy="50" r="1.8" fill="rgba(52,211,153,0.2)" stroke="rgba(52,211,153,0.5)" strokeWidth="0.5" />

              {/* 50m Arcs */}
              <path d="M 14 28 Q 50 40 86 28" fill="none" stroke="rgba(52,211,153,0.3)" strokeWidth="0.5" strokeDasharray="1.5 1.5" />
              <path d="M 14 72 Q 50 60 86 72" fill="none" stroke="rgba(52,211,153,0.3)" strokeWidth="0.5" strokeDasharray="1.5 1.5" />

              {/* Goal Squares */}
              <rect x="42" y="5" width="16" height="8" fill="none" stroke="rgba(52,211,153,0.3)" strokeWidth="0.5" />
              <rect x="42" y="87" width="16" height="8" fill="none" stroke="rgba(52,211,153,0.3)" strokeWidth="0.5" />
            </svg>

            {/* FIELD PLAYER CARDS */}
            {FIELD_POSITIONS.map((pos) => {
              const pid = lineup[pos.slot];
              const p = pid ? players.find((x) => x.id === pid) : null;
              const energyPct = p ? getEnergyPct(p) : 100;
              const isSelected = selectedSource?.id === pid;

              return (
                <div
                  key={pos.slot}
                  onClick={() => {
                    if (p) handleEntityClick({ type: 'field', id: p.id, slot: pos.slot });
                  }}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer transition-all ${
                    isSelected
                      ? 'scale-110 ring-2 ring-amber-400 rounded-xl shadow-2xl z-40'
                      : 'hover:scale-105'
                  }`}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                >
                  <div className="bg-[#121a2c]/90 backdrop-blur-md border border-slate-700/80 hover:border-slate-500 rounded-xl p-1.5 shadow-xl flex flex-col min-w-[82px] max-w-[100px]">
                    {/* Top slot header badge */}
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="bg-slate-800/90 text-indigo-300 font-black text-[8px] px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                        {pos.label}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    </div>

                    {/* Number and Name */}
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md bg-blue-600 text-white font-black text-[9px] flex items-center justify-center shrink-0">
                        {p?.number || '0'}
                      </div>
                      <div className="font-extrabold text-[10px] text-slate-100 truncate">
                        {p ? (p.nick || p.name) : 'Vacant'}
                      </div>
                    </div>

                    {/* Time & Energy */}
                    <div className="flex items-center justify-between text-[8px] text-slate-400 font-bold mt-1 pt-1 border-t border-slate-800">
                      <span>{formatTime(p?.active || 220)}</span>
                      <span className="text-emerald-400">{energyPct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* CLEAN, SMALL, ELEGANT SVG ROTATION ARROWS */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-30" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                {/* Refined Small Crisp Arrow Markers */}
                <marker id="clean-arrow-amber" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                  <path d="M 0 1 L 7 4 L 0 7 z" fill="#fbbf24" />
                </marker>
                <marker id="clean-arrow-emerald" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                  <path d="M 0 1 L 7 4 L 0 7 z" fill="#34d399" />
                </marker>
                <marker id="clean-arrow-cyan" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                  <path d="M 0 1 L 7 4 L 0 7 z" fill="#38bdf8" />
                </marker>
              </defs>

              {/* Render queued rotation arrows as sleek thin dashed lines */}
              {qRotations.map((rot, idx) => {
                const outSlot = Object.keys(lineup).find((k) => lineup[k] === rot.outId);
                const inSlot = Object.keys(lineup).find((k) => lineup[k] === rot.inId);

                // Default positions if on bench
                const outPos = FIELD_POSITIONS.find((p) => p.slot === outSlot) || { x: 12, y: 50 };
                const inPos = FIELD_POSITIONS.find((p) => p.slot === inSlot) || { x: 50, y: 50 };

                const colors = ['#fbbf24', '#38bdf8', '#34d399', '#a855f7'];
                const strokeColor = colors[idx % colors.length];
                const markerId = idx % 2 === 0 ? 'clean-arrow-amber' : 'clean-arrow-cyan';

                return (
                  <g key={rot.id}>
                    <line
                      x1={outPos.x}
                      y1={outPos.y}
                      x2={inPos.x}
                      y2={inPos.y}
                      stroke={strokeColor}
                      strokeWidth="1.2"
                      strokeDasharray="2.5 2.5"
                      markerEnd={`url(#${markerId})`}
                      opacity="0.9"
                    />
                  </g>
                );
              })}
            </svg>

          </div>
        </div>

        {/* RIGHT COLUMN: QUEUE & NEW PLAN PANEL */}
        <div className="col-span-3 sm:col-span-3 lg:col-span-3 border-l border-slate-800/80 bg-[#0f172a]/80 flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-[#0b1220] shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-black text-xs uppercase tracking-wider text-slate-200">QUEUE</span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-black text-[10px]">
                {qRotations.length}
              </span>
            </div>

            <button
              onClick={() => {
                const min = prompt('Enter minute mark for rotation (e.g. 7):', `${selectedMinute}`);
                if (min) setSelectedMinute(parseInt(min, 10) || 7);
              }}
              className="text-[10px] font-bold px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-md text-slate-300 transition cursor-pointer"
            >
              Time: {selectedMinute} MINS
            </button>
          </div>

          {/* Queued Rotations Grouped List */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
            {qRotations.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-black tracking-widest text-amber-400 uppercase">
                  <span>AT {selectedMinute} MINS • Q{selectedQuarter}</span>
                  <button
                    onClick={handleClearQueue}
                    className="text-slate-500 hover:text-red-400 transition cursor-pointer"
                    title="Clear Queue"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {qRotations.map((rot) => {
                  const pOut = players.find((p) => p.id === rot.outId);
                  const pIn = players.find((p) => p.id === rot.inId);

                  return (
                    <div key={rot.id} className="space-y-1.5 p-2 bg-[#141d2f] border border-slate-800 rounded-xl">
                      {/* OFF Pill */}
                      <div className="p-2 rounded-lg bg-red-950/40 border border-red-800/40 text-red-300 text-xs font-bold flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          <ArrowLeft className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          <span className="truncate">OFF: #{pOut?.number} {pOut?.name}</span>
                        </div>
                      </div>

                      {/* ON Pill */}
                      <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs font-bold flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">ON: #{pIn?.number} {pIn?.name}</span>
                        </div>

                        <button
                          onClick={() => handleRemoveRotation(rot.id)}
                          className="text-slate-500 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {qRotations.length === 0 && (
              <div className="p-8 text-center border-2 border-dashed border-slate-800 rounded-2xl bg-[#0b1220]/50 space-y-2">
                <Repeat className="w-6 h-6 text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-400">No rotations queued for Q{selectedQuarter}</p>
                <p className="text-[10px] text-slate-500">
                  Tap a bench player and a field player to queue an interchange rotation.
                </p>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="p-3.5 border-t border-slate-800/80 bg-[#080c14] space-y-2.5 shrink-0">
            <button
              onClick={handleApplyPlanToGame}
              disabled={qRotations.length === 0}
              className={`w-full py-3 px-4 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider ${
                qRotations.length > 0
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-950/50'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>APPLY PLAN TO GAME LINEUP</span>
            </button>

            <button
              onClick={handleClearQueue}
              className="w-full py-1.5 text-slate-400 hover:text-white font-extrabold text-[11px] tracking-wider transition uppercase cursor-pointer"
            >
              CLEAR QUEUE
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
