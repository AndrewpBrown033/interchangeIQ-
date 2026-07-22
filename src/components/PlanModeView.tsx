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
    <div className="fixed inset-0 bg-[#0B132B]/95 backdrop-blur-md z-50 overflow-hidden flex flex-col text-white font-sans">
      {/* Top Bar Header matching screenshot style */}
      <div className="h-16 bg-[#1C2541] border-b border-slate-700/60 px-4 md:px-6 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded-xl font-bold text-xs transition active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to game</span>
          </button>
          <div className="h-6 w-[1px] bg-slate-700 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2 text-slate-400 text-xs font-semibold">
            <span>Quarter {selectedQuarter}</span>
            <span>•</span>
            <span className="text-amber-400 font-bold">{currentPlan?.name || 'Default Plan'}</span>
          </div>
        </div>

        {/* Title Badge */}
        <div className="flex items-center gap-2 bg-[#0B132B] px-4 py-1.5 rounded-2xl border border-blue-500/30 shadow-inner">
          <Layers className="w-4 h-4 text-cyan-400 animate-pulse" />
          <h1 className="font-black text-sm tracking-wider uppercase text-cyan-300">PLAN MODE</h1>
        </div>

        {/* Plan Selector & Controls */}
        <div className="flex items-center gap-2">
          <select
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            className="bg-[#0B132B] text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-400"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="flex bg-[#0B132B] p-1 rounded-xl border border-slate-700">
            {[1, 2, 3, 4].map((q) => (
              <button
                key={q}
                onClick={() => setSelectedQuarter(q)}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition ${
                  selectedQuarter === q
                    ? 'bg-amber-500 text-black shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Q{q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main 3-Column Plan Board Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden gap-0 bg-[#0B132B]">
        
        {/* LEFT COLUMN: BENCH PLAYERS PANEL (Matches screenshot left column) */}
        <div className="lg:col-span-3 border-r border-slate-800 bg-[#141C38] flex flex-col overflow-hidden">
          <div className="p-3 bg-[#1C2541] border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-black text-xs uppercase tracking-widest text-slate-200">BENCH</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-extrabold text-[11px] border border-amber-500/30">
                {benchPlayers.length}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-bold">Tap to swap to field</span>
          </div>

          {/* Bench Player Cards List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {benchPlayers.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs font-semibold">
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
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/50'
                        : 'bg-[#1C2541] border-slate-700/80 hover:bg-[#253258] hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {/* Number Badge */}
                      <div className="w-8 h-8 rounded-lg bg-blue-600/80 text-white font-black text-xs flex items-center justify-center shrink-0 border border-blue-400/30 shadow-xs">
                        {p.number}
                      </div>

                      {/* Name & Time */}
                      <div className="truncate text-left">
                        <div className="font-extrabold text-xs text-white truncate">
                          {p.nick || p.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                          <span>Bench: {formatTime(p.bench || 0)}</span>
                          <span>•</span>
                          <span>Field: {formatTime(p.active || 0)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Fatigue / Energy Indicator */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {energy.pct < 30 && (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
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

        {/* CENTER COLUMN: VISUAL OVAL FIELD WITH INTERACTIVE ROTATION ARROWS */}
        <div className="lg:col-span-6 relative flex flex-col items-center justify-center p-3 bg-[#080E21] overflow-hidden">
          
          {/* Active Quarter & Selection Banner */}
          <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between bg-[#1C2541]/90 backdrop-blur border border-slate-700/80 p-2.5 rounded-2xl shadow-lg">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-black text-slate-200">
                Quarter {selectedQuarter} Visual Pitch Layout
              </span>
            </div>
            {selectedSource ? (
              <div className="flex items-center gap-2 bg-amber-500/20 text-amber-300 px-3 py-1 rounded-xl border border-amber-500/40 text-xs font-bold">
                <span>Selected: #{players.find((p) => p.id === selectedSource.id)?.number}</span>
                <span className="text-slate-400">➔ Tap target player to create swap</span>
                <button
                  onClick={() => setSelectedSource(null)}
                  className="ml-1 text-amber-400 hover:text-white font-black"
                >
                  ✕
                </button>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400 font-semibold">
                Tap two players to link rotation
              </span>
            )}
          </div>

          {/* AFL Oval Field Diagram Canvas */}
          <div className="w-full max-w-[560px] aspect-[4/5] relative rounded-3xl overflow-hidden border-2 border-emerald-500/30 bg-gradient-to-b from-emerald-950/80 via-emerald-900/60 to-emerald-950/80 shadow-2xl my-auto">
            
            {/* SVG Markings & Rotation Connection Arrows Layer */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* AFL Field Lines */}
              <ellipse cx="50" cy="50" rx="46" ry="46" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
              <rect x="36" y="38" width="28" height="24" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.6" />
              <circle cx="50" cy="50" r="6" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.6" />
              <circle cx="50" cy="50" r="1.5" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.6" />

              {/* 50m Arcs */}
              <path d="M 12 28 Q 50 42 88 28" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.6" strokeDasharray="1.5 1.5" />
              <path d="M 12 72 Q 50 58 88 72" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.6" strokeDasharray="1.5 1.5" />

              {/* Goal Squares */}
              <rect x="42" y="5" width="16" height="8" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
              <rect x="42" y="87" width="16" height="8" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />

              {/* SVG Markers for Arrowheads */}
              <defs>
                <marker id="arrow-green" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#10B981" />
                </marker>
                <marker id="arrow-amber" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#F59E0B" />
                </marker>
              </defs>

              {/* DYNAMIC VISUAL ROTATION LINES FOR CURRENT PLAN */}
              {planRotations.map((rot) => {
                // Find slot coordinates for outId and inId
                const outSlot = Object.keys(lineup).find((k) => lineup[k] === rot.outId);
                const inSlot = Object.keys(lineup).find((k) => lineup[k] === rot.inId);

                const pOutCoord = outSlot ? SLOT_COORDS[outSlot] : { x: 8, y: 50 };
                const pInCoord = inSlot ? SLOT_COORDS[inSlot] : { x: 92, y: 50 };

                if (!pOutCoord || !pInCoord) return null;

                const isBench = rot.type === 'bench';
                const strokeColor = isBench ? '#10B981' : '#F59E0B';
                const markerId = isBench ? 'url(#arrow-green)' : 'url(#arrow-amber)';

                return (
                  <g key={rot.id}>
                    <line
                      x1={pOutCoord.x}
                      y1={pOutCoord.y}
                      x2={pInCoord.x}
                      y2={pInCoord.y}
                      stroke={strokeColor}
                      strokeWidth="1.2"
                      strokeDasharray="2 2"
                      markerEnd={markerId}
                      className="animate-pulse"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Position Cards Rendered on Field */}
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
                    isSelected ? 'scale-110 ring-4 ring-amber-400 rounded-xl' : 'hover:scale-105'
                  }`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <div className="bg-[#1C2541]/95 backdrop-blur-md border border-slate-600/80 rounded-xl p-1.5 shadow-xl flex flex-col w-[76px] sm:w-[90px]">
                    {/* Top Label & Group */}
                    <div className="flex items-center justify-between border-b border-slate-700/60 pb-0.5 mb-0.5">
                      <span className={`text-[8px] font-black px-1 rounded-xs uppercase tracking-tight ${
                        POSITION_GROUPS.FWD.includes(slotName) ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                        POSITION_GROUPS.MID.includes(slotName) ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                        POSITION_GROUPS.DEF.includes(slotName) ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        'bg-purple-500/20 text-purple-300 border border-purple-500/30'
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
                        <div className={`w-4 h-4 rounded-full font-black text-[9px] text-white flex items-center justify-center shrink-0 ${
                          POSITION_GROUPS.FWD.includes(slotName) ? 'bg-red-600' :
                          POSITION_GROUPS.MID.includes(slotName) ? 'bg-blue-600' :
                          POSITION_GROUPS.DEF.includes(slotName) ? 'bg-emerald-600' : 'bg-purple-600'
                        }`}>
                          {p.number}
                        </div>
                        <div className="truncate text-[9px] font-extrabold text-white leading-tight">
                          {p.nick || p.name.split(' ')[0]}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[8px] text-slate-500 font-bold py-1 text-center">
                        Vacant
                      </div>
                    )}

                    {/* Ground time & fatigue */}
                    {p && (
                      <div className="flex items-center justify-between text-[7px] text-slate-400 font-extrabold mt-1 pt-0.5 border-t border-slate-800">
                        <span>{formatTime(p.active || 0)}</span>
                        <span className={energy?.pct! < 30 ? 'text-red-400 font-black' : 'text-slate-300'}>
                          {energy?.pct}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: PLAN QUEUE & SUBSTITUTIONS (Matches screenshot right column) */}
        <div className="lg:col-span-3 border-l border-slate-800 bg-[#141C38] flex flex-col overflow-hidden">
          <div className="p-3 bg-[#1C2541] border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-black text-xs uppercase tracking-widest text-slate-200">Queue</span>
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-extrabold text-[11px] border border-cyan-500/30">
                {planRotations.length}
              </span>
            </div>
            <button
              onClick={handleCreateNewPlan}
              className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-[10px] font-bold transition cursor-pointer"
            >
              + NEW PLAN
            </button>
          </div>

          {/* Planned Rotations Substitution Cards */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {planRotations.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs font-semibold">
                No substitutions queued for Q{selectedQuarter}.
                <p className="mt-1 text-[11px] text-slate-600">Tap players on the bench and field to visually link rotations.</p>
              </div>
            ) : (
              planRotations.map((rot) => {
                const pOut = players.find((p) => p.id === rot.outId);
                const pIn = players.find((p) => p.id === rot.inId);

                return (
                  <div
                    key={rot.id}
                    className="p-3 rounded-xl bg-[#1C2541] border border-slate-700/80 shadow-md flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                        At {rot.minute} Mins • Q{rot.quarter}
                      </span>
                      <button
                        onClick={() => handleRemoveRotation(rot.id)}
                        className="text-slate-500 hover:text-red-400 transition"
                        title="Delete substitution"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Substitution movement display */}
                    <div className="space-y-1.5 text-xs font-bold">
                      {/* Out Player */}
                      <div className="flex items-center gap-2 text-red-400 bg-red-950/40 p-1.5 rounded-lg border border-red-900/40">
                        <ArrowRight className="w-3.5 h-3.5 rotate-180 shrink-0" />
                        <span className="truncate">OFF: #{pOut?.number} {pOut?.name}</span>
                      </div>
                      {/* In Player */}
                      <div className="flex items-center gap-2 text-emerald-400 bg-emerald-950/40 p-1.5 rounded-lg border border-emerald-900/40">
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">ON: #{pIn?.number} {pIn?.name}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Action Buttons Footer */}
          <div className="p-3 bg-[#1C2541] border-t border-slate-800 space-y-2 shrink-0">
            <button
              onClick={handleApplyPlanToGame}
              disabled={planRotations.length === 0}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-black font-black text-xs rounded-xl shadow-lg transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>APPLY PLAN TO GAME LINEUP</span>
            </button>

            <button
              onClick={handleClearPlan}
              disabled={planRotations.length === 0}
              className="w-full py-2 text-slate-400 hover:text-white disabled:opacity-30 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              CLEAR QUEUE
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
