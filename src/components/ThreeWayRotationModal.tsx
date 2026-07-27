import React, { useState, useMemo } from 'react';
import { Player, Rotation, Plan } from '../types';
import { RefreshCw, Clock, Users, ShieldAlert, CheckCircle2, Sparkles, Layers, ArrowRight, X } from 'lucide-react';

interface ThreeWayRotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  lineup: Record<string, string>;
  plans: Plan[];
  currentPlanId: string;
  onUpdatePlans: (plans: Plan[]) => void;
  rotations: Rotation[];
  onUpdateRotations: (rotations: Rotation[]) => void;
}

export default function ThreeWayRotationModal({
  isOpen,
  onClose,
  players,
  lineup,
  plans,
  currentPlanId,
  onUpdatePlans,
  rotations,
  onUpdateRotations,
}: ThreeWayRotationModalProps) {
  if (!isOpen) return null;

  // Filter available players
  const availablePlayers = players.filter((p) => p.status === 'available');
  const onFieldIds = new Set(Object.values(lineup));
  const fieldPlayers = availablePlayers.filter((p) => onFieldIds.has(p.id));
  const benchPlayers = availablePlayers.filter((p) => !onFieldIds.has(p.id));

  // Default player selections
  const [p1Id, setP1Id] = useState<string>(() => fieldPlayers[0]?.id || availablePlayers[0]?.id || '');
  const [p2Id, setP2Id] = useState<string>(() => fieldPlayers[1]?.id || availablePlayers[1]?.id || '');
  const [p3Id, setP3Id] = useState<string>(() => benchPlayers[0]?.id || availablePlayers[2]?.id || '');

  // Setup options
  const [intervalMinutes, setIntervalMinutes] = useState<number>(5);
  const [quarterLength, setQuarterLength] = useState<number>(20);
  const [selectedQuarters, setSelectedQuarters] = useState<number[]>([1, 2, 3, 4]);
  const [targetPlanOption, setTargetPlanOption] = useState<'new' | 'current'>(
    plans.length > 0 ? 'current' : 'new'
  );
  const [selectedExistingPlanId, setSelectedExistingPlanId] = useState<string>(currentPlanId || plans[0]?.id || '');
  const [newPlanName, setNewPlanName] = useState<string>('5-Min 3-Way Rotation Plan');
  const [replaceExisting, setReplaceExisting] = useState<boolean>(true);
  const [validationError, setValidationError] = useState<string>('');

  const p1 = players.find((p) => p.id === p1Id);
  const p2 = players.find((p) => p.id === p2Id);
  const p3 = players.find((p) => p.id === p3Id);

  // Auto pick smart default players
  const handleAutoPick = () => {
    if (fieldPlayers.length >= 2) {
      setP1Id(fieldPlayers[0].id);
      setP2Id(fieldPlayers[1].id);
    } else if (availablePlayers.length >= 2) {
      setP1Id(availablePlayers[0].id);
      setP2Id(availablePlayers[1].id);
    }

    if (benchPlayers.length >= 1) {
      setP3Id(benchPlayers[0].id);
    } else if (availablePlayers.length >= 3) {
      const remaining = availablePlayers.filter((p) => p.id !== p1Id && p.id !== p2Id);
      if (remaining[0]) setP3Id(remaining[0].id);
    }
  };

  // Generate sequence preview
  const previewSchedule = useMemo(() => {
    if (!p1 || !p2 || !p3) return [];
    if (p1Id === p2Id || p1Id === p3Id || p2Id === p3Id) return [];

    const scheduleByQuarter: { quarter: number; minute: number; outP: Player; inP: Player; note: string }[] = [];

    // For each quarter, calculate 3-way rotation steps
    selectedQuarters.forEach((q) => {
      let field = [p1, p2];
      let bench = p3;
      let offIndex = 0; // Alternates which of the 2 field players goes off to bench

      for (let min = intervalMinutes; min <= quarterLength; min += intervalMinutes) {
        const outPlayer = field[offIndex];
        const inPlayer = bench;

        scheduleByQuarter.push({
          quarter: q,
          minute: min,
          outP: outPlayer,
          inP: inPlayer,
          note: `3-Way Rotation: #${outPlayer.number} ${outPlayer.name} ➔ Bench | #${inPlayer.number} ${inPlayer.name} ➔ Field`,
        });

        // Update active positions for next interval
        field[offIndex] = inPlayer;
        bench = outPlayer;
        offIndex = (offIndex + 1) % 2; // Next time, swap the other field player
      }
    });

    return scheduleByQuarter;
  }, [p1, p2, p3, p1Id, p2Id, p3Id, intervalMinutes, quarterLength, selectedQuarters]);

  const handleGenerate = () => {
    if (!p1 || !p2 || !p3) {
      setValidationError('Please select 3 valid players.');
      return;
    }
    if (p1Id === p2Id || p1Id === p3Id || p2Id === p3Id) {
      setValidationError('All 3 players in the rotation set must be different.');
      return;
    }
    if (selectedQuarters.length === 0) {
      setValidationError('Please select at least one quarter.');
      return;
    }
    if (intervalMinutes < 1) {
      setValidationError('Interval must be at least 1 minute.');
      return;
    }

    setValidationError('');

    let planIdToUse = selectedExistingPlanId;

    if (targetPlanOption === 'new' || !plans.some((p) => p.id === planIdToUse)) {
      const generatedPlanId = `plan-${Date.now()}`;
      const name = newPlanName.trim() || '3-Way Rotation Plan';
      const newPlan: Plan = { id: generatedPlanId, name };
      onUpdatePlans([...plans, newPlan]);
      planIdToUse = generatedPlanId;
    }

    // Convert preview schedule to Rotation objects
    const newRotations: Rotation[] = previewSchedule.map((item) => ({
      id: `rot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      planId: planIdToUse,
      quarter: item.quarter,
      minute: item.minute,
      type: 'bench',
      outId: item.outP.id,
      inId: item.inP.id,
      out: `OFF #${item.outP.number} ${item.outP.name}`,
      inn: `ON #${item.inP.number} ${item.inP.name}`,
      note: item.note,
      applied: false,
      status: 'scheduled',
    }));

    if (replaceExisting) {
      const otherRotations = rotations.filter((r) => r.planId !== planIdToUse);
      onUpdateRotations([...otherRotations, ...newRotations]);
    } else {
      onUpdateRotations([...rotations, ...newRotations]);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2500] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl border border-[var(--line)] shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black">
              <RefreshCw className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h3 className="font-black text-base tracking-tight text-white flex items-center gap-2">
                <span>3-Way Set Rotation Generator</span>
                <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-amber-500 text-black rounded-md">
                  5-Min Cycle
                </span>
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Continuous 3-girl rotation between 2 field positions & 1 bench spot
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs font-semibold text-gray-700">
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2 font-bold text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Section 1: Player Selection */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-[var(--navy)] flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[var(--blue)]" />
                <span>Select 3 Players for Rotation Group</span>
              </label>
              <button
                type="button"
                onClick={handleAutoPick}
                className="px-2.5 py-1 text-[11px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto-Select First 3</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Player 1 (Field) */}
              <div>
                <label className="block mb-1 text-[10px] font-black uppercase text-emerald-700">
                  Player A (Field Pos 1)
                </label>
                <select
                  value={p1Id}
                  onChange={(e) => setP1Id(e.target.value)}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">Select Player A</option>
                  {availablePlayers.map((p) => (
                    <option key={`p1-${p.id}`} value={p.id}>
                      #{p.number} {p.name} {onFieldIds.has(p.id) ? '(Field)' : '(Bench)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Player 2 (Field) */}
              <div>
                <label className="block mb-1 text-[10px] font-black uppercase text-emerald-700">
                  Player B (Field Pos 2)
                </label>
                <select
                  value={p2Id}
                  onChange={(e) => setP2Id(e.target.value)}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">Select Player B</option>
                  {availablePlayers.map((p) => (
                    <option key={`p2-${p.id}`} value={p.id}>
                      #{p.number} {p.name} {onFieldIds.has(p.id) ? '(Field)' : '(Bench)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Player 3 (Bench) */}
              <div>
                <label className="block mb-1 text-[10px] font-black uppercase text-amber-700">
                  Player C (Bench Spot)
                </label>
                <select
                  value={p3Id}
                  onChange={(e) => setP3Id(e.target.value)}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">Select Player C</option>
                  {availablePlayers.map((p) => (
                    <option key={`p3-${p.id}`} value={p.id}>
                      #{p.number} {p.name} {!onFieldIds.has(p.id) ? '(Bench)' : '(Field)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {p1 && p2 && p3 && (p1Id === p2Id || p1Id === p3Id || p2Id === p3Id) && (
              <p className="text-[11px] font-bold text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
                ⚠️ Warning: Please pick 3 different players.
              </p>
            )}
          </div>

          {/* Section 2: Timing & Quarters Config */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Interval Selection */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Rotation Interval (Minutes)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-20 p-2 text-center bg-white border border-gray-300 rounded-xl text-sm font-extrabold focus:outline-none"
                />
                <span className="text-xs font-bold text-gray-500">mins</span>
                <div className="flex gap-1 ml-auto">
                  {[3, 4, 5, 6].map((m) => (
                    <button
                      key={`preset-${m}`}
                      type="button"
                      onClick={() => setIntervalMinutes(m)}
                      className={`px-2 py-1 text-[10px] font-black rounded-lg border cursor-pointer ${
                        intervalMinutes === m
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quarter Duration */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                Quarter Duration (Minutes)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="10"
                  max="30"
                  value={quarterLength}
                  onChange={(e) => setQuarterLength(Math.max(5, parseInt(e.target.value, 10) || 20))}
                  className="w-20 p-2 text-center bg-white border border-gray-300 rounded-xl text-sm font-extrabold focus:outline-none"
                />
                <span className="text-xs font-bold text-gray-500">mins</span>
                <div className="flex gap-1 ml-auto">
                  {[15, 20, 25].map((qM) => (
                    <button
                      key={`ql-${qM}`}
                      type="button"
                      onClick={() => setQuarterLength(qM)}
                      className={`px-2 py-1 text-[10px] font-black rounded-lg border cursor-pointer ${
                        quarterLength === qM
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {qM}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Select Quarters */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
              Apply to Quarters
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((q) => {
                const selected = selectedQuarters.includes(q);
                return (
                  <button
                    key={`q-btn-${q}`}
                    type="button"
                    onClick={() => {
                      if (selected) {
                        if (selectedQuarters.length > 1) {
                          setSelectedQuarters(selectedQuarters.filter((item) => item !== q));
                        }
                      } else {
                        setSelectedQuarters([...selectedQuarters, q].sort());
                      }
                    }}
                    className={`py-2 text-xs font-black rounded-xl border transition cursor-pointer ${
                      selected
                        ? 'bg-[var(--navy)] text-white border-[var(--navy)] shadow-xs'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Quarter {q}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Target Plan Destination */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Rotation Plan Destination</span>
            </label>

            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-gray-800">
                <input
                  type="radio"
                  name="planOpt"
                  checked={targetPlanOption === 'current'}
                  onChange={() => setTargetPlanOption('current')}
                  className="accent-blue-600 cursor-pointer"
                />
                <span>Add to Existing Plan</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-gray-800">
                <input
                  type="radio"
                  name="planOpt"
                  checked={targetPlanOption === 'new'}
                  onChange={() => setTargetPlanOption('new')}
                  className="accent-blue-600 cursor-pointer"
                />
                <span>Create New Plan</span>
              </label>
            </div>

            {targetPlanOption === 'current' ? (
              <div className="space-y-2">
                <select
                  value={selectedExistingPlanId}
                  onChange={(e) => setSelectedExistingPlanId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none cursor-pointer"
                >
                  {plans.map((p) => (
                    <option key={`target-p-${p.id}`} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-[11px] font-semibold text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    className="accent-blue-600 cursor-pointer"
                  />
                  <span>Clear previous rotations in this plan before adding new 3-way cycle</span>
                </label>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  placeholder="Plan name..."
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Section 5: Step-by-Step Preview Schedule */}
          {p1 && p2 && p3 && previewSchedule.length > 0 && (
            <div className="space-y-2 border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                  Timeline Preview ({previewSchedule.length} Swaps Across {selectedQuarters.length} Quarters)
                </label>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  Every {intervalMinutes} Mins
                </span>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-slate-900 rounded-xl border border-slate-800">
                {previewSchedule.slice(0, 8).map((item, idx) => (
                  <div
                    key={`prev-${idx}`}
                    className="flex items-center justify-between bg-slate-800/90 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-slate-700 text-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-amber-400 text-slate-950 font-black rounded text-[9px]">
                        Q{item.quarter} {item.minute}m
                      </span>
                      <span className="text-red-300 font-extrabold flex items-center gap-1">
                        <span className="text-[9px]">↓</span> #{item.outP.number} {item.outP.name}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                      <span className="text-emerald-300 font-extrabold flex items-center gap-1">
                        <span className="text-[9px]">↑</span> #{item.inP.number} {item.inP.name}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400 hidden sm:inline">Bench Interchange</span>
                  </div>
                ))}
                {previewSchedule.length > 8 && (
                  <p className="text-[10px] text-center text-slate-400 font-semibold py-1">
                    + {previewSchedule.length - 8} more scheduled interchanges
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <p className="text-[10px] font-bold text-slate-500">
            {p1 && p2 && p3
              ? `Rotating #${p1.number}, #${p2.number}, and #${p3.number}`
              : 'Select 3 players to preview cycle'}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              className="px-5 py-2 text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Generate 3-Way Plan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
