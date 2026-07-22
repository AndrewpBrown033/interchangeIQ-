import React, { useState } from 'react';
import { Player, Rotation, Plan } from '../types';
import { POSITIONS, POSITION_GROUPS } from '../constants';
import { ArrowLeft, Plus, Trash2, CheckCircle2, RotateCcw, AlertTriangle, ChevronRight, Play, RefreshCw, Zap, ArrowRight, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';

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

const POSITION_LABELS: Record<string, string> = {
  'FP-L': 'FPL', 'FF': 'FF', 'FP-R': 'FPR',
  'HF-L': 'HFL', 'CHF': 'CHF', 'HF-R': 'HFR',
  'W-L': 'WL', 'C': 'C', 'W-R': 'WR',
  'R': 'R', 'ROV': 'ROV', 'RR': 'RR',
  'HB-L': 'HBL', 'CHB': 'CHB', 'HB-R': 'HBR',
  'BP-L': 'BPL', 'FB': 'FB', 'BP-R': 'BPR',
};

// Calculate coordinates in SVG space (0-100 x 0-100)
const SLOT_COORDS: Record<string, { x: number; y: number }> = {};
POSITIONS.forEach(([slotName, , x, y]) => {
  SLOT_COORDS[slotName] = { x, y };
});

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
  const [selectedMinute, setSelectedMinute] = useState<number>(5);

  // Selection states for creating new visual swaps
  const [selectedSource, setSelectedSource] = useState<{ type: 'bench' | 'field'; id: string; slot?: string } | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<{ type: 'bench' | 'field'; id: string; slot?: string } | null>(null);

  const currentPlan = plans.find((p) => p.id === selectedPlanId) || plans[0] || null;

  // Filter rotations for this plan & quarter
  const planRotations = rotations.filter(
    (r) => r.planId === (currentPlan?.id || '') && r.quarter === selectedQuarter
  );

  // Helper: Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Helper: Energy % based on active play time vs rest
  const getEnergy = (p: Player) => {
    if (p.status === 'injured') return { pct: 0, color: 'text-red-500 bg-red-100', dot: 'bg-red-500' };
    const maxCapacity = 1800; // 30 mins benchmark
    const activeSecs = p.active || 0;
    const pct = Math.max(0, Math.min(100, Math.round(100 - (activeSecs / maxCapacity) * 60)));
    if (pct < 30) return { pct, color: 'text-red-600 bg-red-50 border-red-200', dot: 'bg-red-500' };
    if (pct < 70) return { pct, color: 'text-amber-600 bg-amber-50 border-amber-200', dot: 'bg-amber-500' };
    return { pct, color: 'text-emerald-600 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' };
  };

  // Identify Bench Players
  const activeFieldPids = new Set(Object.values(lineup));
  const benchPlayers = players.filter((p) => p.status === 'available' && !activeFieldPids.has(p.id));

  // Create new rotation from visual selection
  const handleConnectSelection = (
    fromEntity: { type: 'bench' | 'field'; id: string; slot?: string },
    toEntity: { type: 'bench' | 'field'; id: string; slot?: string }
  ) => {
    if (!currentPlan) return;
    if (fromEntity.id === toEntity.id) return;

    const pOut = players.find((p) => p.id === fromEntity.id);
    const pIn = players.find((p) => p.id === toEntity.id);
    if (!pOut || !pIn) return;

    const isBenchSwap = fromEntity.type === 'bench' || toEntity.type === 'bench';
    const rotType: 'bench' | 'onfield' = isBenchSwap ? 'bench' : 'onfield';

    const outLabel = isBenchSwap ? `OFF #${pOut.number} ${pOut.name}` : `${fromEntity.slot || 'Pos'} #${pOut.number} ${pOut.name}`;
    const inLabel = isBenchSwap ? `ON #${pIn.number} ${pIn.name}` : `${toEntity.slot || 'Pos'} #${pIn.number} ${pIn.name}`;

    const newRot: Rotation = {
      id: `rot-${Date.now()}-${Math.random()}`,
      planId: currentPlan.id,
      quarter: selectedQuarter,
      minute: selectedMinute,
      type: rotType,
      outId: pOut.id,
      inId: pIn.id,
      out: outLabel,
      inn: inLabel,
      note: isBenchSwap ? 'Visual Bench Interchange' : 'Visual Field Swap',
      applied: false,
      status: 'scheduled',
    };

    onUpdateRotations([...rotations, newRot]);
    setSelectedSource(null);
    setSelectedTarget(null);
  };

  const handleEntityClick = (entity: { type: 'bench' | 'field'; id: string; slot?: string }) => {
    if (!selectedSource) {
      setSelectedSource(entity);
    } else if (selectedSource.id === entity.id) {
      setSelectedSource(null);
    } else {
      handleConnectSelection(selectedSource, entity);
    }
  };

  const handleRemoveRotation = (rotId: string) => {
    onUpdateRotations(rotations.filter((r) => r.id !== rotId));
  };

  const handleClearPlan = () => {
    if (window.confirm(`Clear all planned rotations for ${currentPlan?.name} Q${selectedQuarter}?`)) {
      onUpdateRotations(
        rotations.filter((r) => !(r.planId === (currentPlan?.id || '') && r.quarter === selectedQuarter))
      );
    }
  };

  const handleApplyPlanToGame = () => {
    if (planRotations.length === 0) return;
    const nextLineup = { ...lineup };

    planRotations.forEach((rot) => {
      const outSlot = Object.keys(lineup).find((k) => lineup[k] === rot.outId);
      const inSlot = Object.keys(lineup).find((k) => lineup[k] === rot.inId);

      if (outSlot && inSlot) {
        nextLineup[outSlot] = rot.inId;
        nextLineup[inSlot] = rot.outId;
      } else if (outSlot) {
        nextLineup[outSlot] = rot.inId;
      } else if (inSlot) {
        nextLineup[inSlot] = rot.outId;
      }
    });

    onUpdateLineup(nextLineup);

    // Mark plan rotations applied
    const appliedRotIds = new Set(planRotations.map((r) => r.id));
    onUpdateRotations(
      rotations.map((r) => (appliedRotIds.has(r.id) ? { ...r, applied: true, status: 'applied' } : r))
    );

    alert(`Successfully applied Q${selectedQuarter} rotation plan to the active game lineup!`);
  };

  const handleCreateNewPlan = () => {
    const name = prompt('New Plan Name:', `Q${plans.length + 1} Strategy`);
    if (!name || !name.trim()) return;
    const newId = `plan-${Date.now()}`;
    const newPlan: Plan = { id: newId, name: name.trim() };
    onUpdatePlans([...plans, newPlan]);
    setSelectedPlanId(newId);
  };

  return (
    <div className="fixed inset-0 bg-slate-100 z-50 overflow-hidden flex flex-col text-[var(--ink)] font-sans">
      {/* Top Bar Header */}
      <div className="h-16 bg-white border-b border-gray-200 px-4 md:px-6 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl font-bold text-xs transition active:scale-95 cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4 text-amber-700" />
            <span>Back to game</span>
          </button>
          <div className="h-6 w-[1px] bg-gray-200 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2 text-gray-500 text-xs font-semibold">
            <span>Quarter {selectedQuarter}</span>
            <span>•</span>
            <span className="text-indigo-700 font-bold">{currentPlan?.name || 'Default Plan'}</span>
          </div>
        </div>

        {/* Title Badge */}
        <div className="flex items-center gap-2 bg-indigo-50 px-4 py-1.5 rounded-2xl border border-indigo-200 shadow-2xs">
          <Layers className="w-4 h-4 text-indigo-600 animate-pulse" />
          <h1 className="font-black text-sm tracking-wider uppercase text-indigo-900">PLAN MODE</h1>
        </div>

        {/* Plan Selector & Controls */}
        <div className="flex items-center gap-2">
          <select
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            className="bg-white text-gray-800 border border-gray-300 px-3 py-1.5 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
            {[1, 2, 3, 4].map((q) => (
              <button
                key={q}
                onClick={() => setSelectedQuarter(q)}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition ${
                  selectedQuarter === q
                    ? 'bg-amber-400 text-amber-950 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Q{q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main 3-Column Plan Board Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden gap-0 bg-white">
        
        {/* LEFT COLUMN: BENCH PLAYERS PANEL */}
        <div className="lg:col-span-3 border-r border-gray-200 bg-slate-50 flex flex-col overflow-hidden">
          <div className="p-3 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-black text-xs uppercase tracking-widest text-[var(--navy)]">BENCH</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-extrabold text-[11px] border border-amber-300">
                {benchPlayers.length}
              </span>
            </div>
            <span className="text-[10px] text-gray-500 font-bold">Tap player to swap</span>
          </div>

          {/* Bench Player Cards List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {benchPlayers.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-xs font-semibold">
                No players on the bench.
              </div>
            ) : (
              benchPlayers.map((p) => {
                const energy = getEnergy(p);
                const isSelected = selectedSource?.id === p.id || selectedTarget?.id === p.id;

                return (
                  <div
                    key={p.id}
                    onClick={() => handleEntityClick({ type: 'bench', id: p.id })}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs ${
                      isSelected
                        ? 'bg-amber-100/80 border-amber-500 ring-2 ring-amber-400/60'
                        : 'bg-white border-gray-200 hover:bg-indigo-50/50 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {/* Number Badge */}
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                        {p.number}
                      </div>

                      {/* Name & Time */}
                      <div className="truncate text-left">
                        <div className="font-extrabold text-xs text-[var(--navy)] truncate">
                          {p.nick || p.name}
                        </div>
                        <div className="text-[10px] text-gray-500 font-bold flex items-center gap-1 mt-0.5">
                          <span>Bench: {formatTime(p.bench || 0)}</span>
                          <span>•</span>
                          <span>Field: {formatTime(p.active || 0)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Fatigue / Energy Indicator */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {energy.pct < 30 && (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                      )}
                      <div className={`px-2 py-0.5 rounded-md text-[10px] font-black border flex items-center gap-1 ${energy.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${energy.dot}`} />
                        <span>{energy.pct}%</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CENTER COLUMN: VISUAL LIGHT GREEN OVAL FIELD WITH FLASHING OVERLAY ROTATION ARROWS */}
        <div className="lg:col-span-6 relative flex flex-col items-center justify-center p-3 bg-white overflow-hidden">
          
          {/* Active Quarter & Selection Banner */}
          <div className="absolute top-3 left-3 right-3 z-40 flex items-center justify-between bg-white/95 backdrop-blur border border-gray-200 p-2.5 rounded-2xl shadow-md">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-black text-gray-800">
                Quarter {selectedQuarter} Visual Field Layout
              </span>
            </div>
            {selectedSource ? (
              <div className="flex items-center gap-2 bg-amber-100 text-amber-900 px-3 py-1 rounded-xl border border-amber-300 text-xs font-bold shadow-xs">
                <span>Selected: #{players.find((p) => p.id === selectedSource.id)?.number}</span>
                <span className="text-amber-800">➔ Tap target player to create swap</span>
                <button
                  onClick={() => setSelectedSource(null)}
                  className="ml-1 text-amber-950 hover:text-black font-black"
                >
                  ✕
                </button>
              </div>
            ) : (
              <span className="text-[11px] text-gray-500 font-semibold">
                Tap two players to link rotation
              </span>
            )}
          </div>

          {/* AFL Oval Field Diagram Canvas - Lighter, Vibrant Green */}
          <div className="w-full max-w-[560px] aspect-[4/5] relative rounded-3xl overflow-hidden border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-500 via-green-600 to-emerald-500 shadow-xl my-auto">
            
            {/* SVG Base Field Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* AFL Field Markings in Crisp Bright White */}
              <ellipse cx="50" cy="50" rx="46" ry="46" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.8" />
              <rect x="36" y="38" width="28" height="24" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.8)" strokeWidth="0.7" />
              <circle cx="50" cy="50" r="6" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.7" />
              <circle cx="50" cy="50" r="1.5" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.7" />

              {/* 50m Arcs */}
              <path d="M 12 28 Q 50 42 88 28" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.7" strokeDasharray="1.5 1.5" />
              <path d="M 12 72 Q 50 58 88 72" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.7" strokeDasharray="1.5 1.5" />

              {/* Goal Squares */}
              <rect x="42" y="5" width="16" height="8" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.7" />
              <rect x="42" y="87" width="16" height="8" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.7" />
            </svg>

            {/* Position Cards Rendered on Field (z-20) */}
            {POSITIONS.map(([slotName, label, x, y]) => {
              const pid = lineup[slotName];
              const p = pid ? players.find((x) => x.id === pid) : null;
              const energy = p ? getEnergy(p) : null;

              const isSelected = selectedSource?.id === pid || selectedTarget?.id === pid;

              return (
                <div
                  key={slotName}
                  onClick={() => {
                    if (p) handleEntityClick({ type: 'field', id: p.id, slot: slotName });
                  }}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer transition-all ${
                    isSelected ? 'scale-110 ring-4 ring-amber-400 rounded-xl shadow-2xl' : 'hover:scale-105'
                  }`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <div className="bg-white/95 backdrop-blur-md border border-gray-300 rounded-xl p-1.5 shadow-lg flex flex-col w-[76px] sm:w-[90px]">
                    {/* Top Label & Group */}
                    <div className="flex items-center justify-between border-b border-gray-100 pb-0.5 mb-0.5">
                      <span className={`text-[8px] font-black px-1 rounded-xs uppercase tracking-tight ${
                        POSITION_GROUPS.FWD.includes(slotName) ? 'bg-red-100 text-red-700 border border-red-200' :
                        POSITION_GROUPS.MID.includes(slotName) ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                        POSITION_GROUPS.DEF.includes(slotName) ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        'bg-purple-100 text-purple-700 border border-purple-200'
                      }`}>
                        {label}
                      </span>
                      {energy && (
                        <span className={`w-1.5 h-1.5 rounded-full ${energy.dot}`} />
                      )}
                    </div>

                    {/* Player Info */}
                    {p ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className={`w-4 h-4 rounded-full font-black text-[9px] text-white flex items-center justify-center shrink-0 shadow-2xs ${
                          POSITION_GROUPS.FWD.includes(slotName) ? 'bg-red-600' :
                          POSITION_GROUPS.MID.includes(slotName) ? 'bg-blue-600' :
                          POSITION_GROUPS.DEF.includes(slotName) ? 'bg-emerald-600' : 'bg-purple-600'
                        }`}>
                          {p.number}
                        </div>
                        <div className="truncate text-[9px] font-extrabold text-gray-900 leading-tight">
                          {p.nick || p.name.split(' ')[0]}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[8px] text-gray-400 font-bold py-1 text-center">
                        Vacant
                      </div>
                    )}

                    {/* Ground time & fatigue */}
                    {p && (
                      <div className="flex items-center justify-between text-[7px] text-gray-500 font-extrabold mt-1 pt-0.5 border-t border-gray-100">
                        <span>{formatTime(p.active || 0)}</span>
                        <span className={energy?.pct! < 30 ? 'text-red-600 font-black' : 'text-gray-700'}>
                          {energy?.pct}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* DYNAMIC VISUAL ROTATION ARROWS LAYER (z-30 OVERLAY - Renders ON TOP OF Player Cards) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-30" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <marker id="arrow-cyan" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#00FFFF" />
                </marker>
                <marker id="arrow-gold" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#FFD700" />
                </marker>
              </defs>

              {planRotations.map((rot) => {
                const outSlot = Object.keys(lineup).find((k) => lineup[k] === rot.outId);
                const inSlot = Object.keys(lineup).find((k) => lineup[k] === rot.inId);

                const pOutCoord = outSlot ? SLOT_COORDS[outSlot] : { x: 8, y: 50 };
                const pInCoord = inSlot ? SLOT_COORDS[inSlot] : { x: 92, y: 50 };

                if (!pOutCoord || !pInCoord) return null;

                const isBench = rot.type === 'bench';
                const strokeColor = isBench ? '#00FFFF' : '#FFD700';
                const markerId = isBench ? 'url(#arrow-cyan)' : 'url(#arrow-gold)';

                return (
                  <g key={rot.id}>
                    {/* Shadow outline under arrow line for contrast on cards */}
                    <line
                      x1={pOutCoord.x}
                      y1={pOutCoord.y}
                      x2={pInCoord.x}
                      y2={pInCoord.y}
                      stroke="#000000"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                    />
                    {/* Flashing high-contrast animated arrow line on top */}
                    <line
                      x1={pOutCoord.x}
                      y1={pOutCoord.y}
                      x2={pInCoord.x}
                      y2={pInCoord.y}
                      stroke={strokeColor}
                      strokeWidth="2.2"
                      strokeDasharray="2.5 1.5"
                      markerEnd={markerId}
                      className="animate-pulse"
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* RIGHT COLUMN: PLAN QUEUE & SUBSTITUTIONS */}
        <div className="lg:col-span-3 border-l border-gray-200 bg-slate-50 flex flex-col overflow-hidden">
          <div className="p-3 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-black text-xs uppercase tracking-widest text-[var(--navy)]">Queue</span>
              <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-extrabold text-[11px] border border-indigo-200">
                {planRotations.length}
              </span>
            </div>
            <button
              onClick={handleCreateNewPlan}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black transition cursor-pointer shadow-xs"
            >
              + NEW PLAN
            </button>
          </div>

          {/* Planned Rotations Substitution Cards */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {planRotations.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-xs font-semibold">
                No substitutions queued for Q{selectedQuarter}.
                <p className="mt-1 text-[11px] text-gray-500">Tap players on the bench and field to visually link rotations.</p>
              </div>
            ) : (
              planRotations.map((rot) => {
                const pOut = players.find((p) => p.id === rot.outId);
                const pIn = players.find((p) => p.id === rot.inId);

                return (
                  <div
                    key={rot.id}
                    className="p-3 rounded-xl bg-white border border-gray-200 shadow-2xs flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
                        At {rot.minute} Mins • Q{rot.quarter}
                      </span>
                      <button
                        onClick={() => handleRemoveRotation(rot.id)}
                        className="text-gray-400 hover:text-red-600 transition"
                        title="Delete substitution"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Substitution movement display */}
                    <div className="space-y-1.5 text-xs font-bold">
                      {/* Out Player */}
                      <div className="flex items-center gap-2 text-red-700 bg-red-50 p-1.5 rounded-lg border border-red-200">
                        <ArrowRight className="w-3.5 h-3.5 rotate-180 shrink-0 text-red-600" />
                        <span className="truncate">OFF: #{pOut?.number} {pOut?.name}</span>
                      </div>
                      {/* In Player */}
                      <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 p-1.5 rounded-lg border border-emerald-200">
                        <ArrowRight className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                        <span className="truncate">ON: #{pIn?.number} {pIn?.name}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Action Buttons Footer */}
          <div className="p-3 bg-white border-t border-gray-200 space-y-2 shrink-0">
            <button
              onClick={handleApplyPlanToGame}
              disabled={planRotations.length === 0}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 disabled:opacity-40 text-white font-black text-xs rounded-xl shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>APPLY PLAN TO GAME LINEUP</span>
            </button>

            <button
              onClick={handleClearPlan}
              disabled={planRotations.length === 0}
              className="w-full py-2 text-gray-500 hover:text-gray-900 disabled:opacity-30 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              CLEAR QUEUE
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
