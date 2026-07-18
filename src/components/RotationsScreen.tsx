import React, { useState } from 'react';
import { Player, Rotation, Plan, LineupTemplate } from '../types';
import { POSITIONS, POSITION_GROUPS } from '../constants';
import { Plus, Trash, Copy, Edit3, Check, RefreshCw, AlertCircle, Sparkles, FolderOpen, Save, Layers } from 'lucide-react';

interface RotationsScreenProps {
  players: Player[];
  rotations: Rotation[];
  onUpdateRotations: (rotations: Rotation[]) => void;
  plans: Plan[];
  onUpdatePlans: (plans: Plan[]) => void;
  activePlanIds: string[];
  onTogglePlanRunning: (planId: string) => void;
  lineup: Record<string, string>;
  onUpdateLineup: (lineup: Record<string, string>) => void;
}

export default function RotationsScreen({
  players,
  rotations,
  onUpdateRotations,
  plans,
  onUpdatePlans,
  activePlanIds,
  onTogglePlanRunning,
  lineup,
  onUpdateLineup,
}: RotationsScreenProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(plans[0]?.id || '');
  const [showRotationModal, setShowRotationModal] = useState(false);
  const [editingRotation, setEditingRotation] = useState<Rotation | null>(null);

  // Rotation Form states
  const [selectedQuarters, setSelectedQuarters] = useState<number[]>([1]);
  const [formMinute, setFormMinute] = useState<number>(5);
  const [formType, setFormType] = useState<'bench' | 'onfield'>('bench');
  const [formOutId, setFormOutId] = useState<string>('');
  const [formInId, setFormInId] = useState<string>('');
  const [formNote, setFormNote] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  const currentPlan = plans.find((p) => p.id === selectedPlanId) || plans[0] || null;

  // Group current plan's rotations by Quarter
  const planRotations = rotations
    .filter((r) => r.planId === (currentPlan?.id || ''))
    .sort((a, b) => a.quarter - b.quarter || a.minute - b.minute);

  const handleCreatePlan = () => {
    const name = prompt('Enter plan name:', `Q${plans.length + 1} Rotation`);
    if (!name || !name.trim()) return;
    const newPlanId = `plan-${Date.now()}`;
    const newPlan: Plan = { id: newPlanId, name: name.trim() };
    onUpdatePlans([...plans, newPlan]);
    setSelectedPlanId(newPlanId);
  };

  const handleDuplicatePlan = (planId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    const dupeId = `plan-${Date.now()}`;
    const dupePlan: Plan = { id: dupeId, name: `${plan.name} Copy` };

    // Duplicate all associated rotations
    const planRotations = rotations.filter((r) => r.planId === planId);
    const duplicatedRotations = planRotations.map((r) => ({
      ...r,
      id: `rot-${Date.now()}-${Math.random()}`,
      planId: dupeId,
      applied: false,
      status: 'scheduled' as const,
    }));

    onUpdatePlans([...plans, dupePlan]);
    onUpdateRotations([...rotations, ...duplicatedRotations]);
    setSelectedPlanId(dupeId);
  };

  const handleRenamePlan = (planId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    const name = prompt('Rename plan:', plan.name);
    if (!name || !name.trim()) return;
    onUpdatePlans(plans.map((p) => (p.id === planId ? { ...p, name: name.trim() } : p)));
  };

  const handleDeletePlan = (planId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this plan and all associated rotations?')) return;
    onUpdatePlans(plans.filter((p) => p.id !== planId));
    onUpdateRotations(rotations.filter((r) => r.planId !== planId));

    if (selectedPlanId === planId) {
      const remaining = plans.filter((p) => p.id !== planId);
      setSelectedPlanId(remaining[0]?.id || '');
    }
  };

  // Auto Build standard Q1 swaps for benched players
  const handleAutoBuild = () => {
    if (!currentPlan) return;
    const onFieldIds = new Set(Object.values(lineup));
    const onField = players.filter((p) => p.status === 'available' && onFieldIds.has(p.id));
    const onBench = players.filter((p) => p.status === 'available' && !onFieldIds.has(p.id));

    if (!onField.length || !onBench.length) {
      alert('You need players on both the field and bench to auto-build rotations.');
      return;
    }

    const intervals = [4, 8, 12];
    const generated: Rotation[] = intervals.map((min, idx) => {
      const outP = onField[idx % onField.length];
      const inP = onBench[idx % onBench.length];
      return {
        id: `rot-${Date.now()}-${Math.random()}`,
        planId: currentPlan.id,
        quarter: 1,
        minute: min,
        type: 'bench',
        outId: outP.id,
        inId: inP.id,
        out: `OFF #${outP.number} ${outP.name}`,
        inn: `ON #${inP.number} ${inP.name}`,
        note: 'Auto-build interchange',
        applied: false,
        status: 'scheduled',
      };
    });

    onUpdateRotations([...rotations, ...generated]);
  };

  const handleOpenAddRotation = () => {
    setEditingRotation(null);
    setSelectedQuarters([1]);
    setFormMinute(5);
    setFormType('bench');

    // Pick first field and bench players
    const onFieldIds = new Set(Object.values(lineup));
    const fieldPlayer = players.find((p) => p.status === 'available' && onFieldIds.has(p.id));
    const benchPlayer = players.find((p) => p.status === 'available' && !onFieldIds.has(p.id));

    setFormOutId(fieldPlayer?.id || '');
    setFormInId(benchPlayer?.id || '');
    setFormNote('');
    setFormError('');
    setShowRotationModal(true);
  };

  const handleOpenEditRotation = (rot: Rotation) => {
    setEditingRotation(rot);
    setSelectedQuarters([rot.quarter]);
    setFormMinute(rot.minute);
    setFormType(rot.type);
    setFormOutId(rot.outId);
    setFormInId(rot.inId);
    setFormNote(rot.note);
    setFormError('');
    setShowRotationModal(true);
  };

  const handleSaveRotation = () => {
    if (!currentPlan) return;
    if (!formOutId || !formInId) {
      setFormError('Please select both players.');
      return;
    }
    if (formOutId === formInId) {
      setFormError('You cannot select the same player for both sides.');
      return;
    }
    if (selectedQuarters.length === 0) {
      setFormError('Please select at least one quarter.');
      return;
    }

    const outPlayer = players.find((p) => p.id === formOutId);
    const inPlayer = players.find((p) => p.id === formInId);

    if (!outPlayer || !inPlayer) return;

    const outText = formType === 'bench' ? `OFF #${outPlayer.number} ${outPlayer.name}` : `Pos A #${outPlayer.number} ${outPlayer.name}`;
    const inText = formType === 'bench' ? `ON #${inPlayer.number} ${inPlayer.name}` : `Pos B #${inPlayer.number} ${inPlayer.name}`;

    if (editingRotation) {
      const firstQ = selectedQuarters[0];
      const otherQuarters = selectedQuarters.slice(1);

      const updatedRotations = rotations.map((r) =>
        r.id === editingRotation.id
          ? {
              ...r,
              quarter: firstQ,
              minute: formMinute,
              type: formType,
              outId: formOutId,
              inId: formInId,
              out: outText,
              inn: inText,
              note: formNote.trim(),
            }
          : r
      );

      const additionalRots: Rotation[] = otherQuarters.map((q) => ({
        id: `rot-${Date.now()}-${Math.random()}`,
        planId: currentPlan.id,
        quarter: q,
        minute: formMinute,
        type: formType,
        outId: formOutId,
        inId: formInId,
        out: outText,
        inn: inText,
        note: formNote.trim(),
        applied: false,
        status: 'scheduled',
      }));

      onUpdateRotations([...updatedRotations, ...additionalRots]);
    } else {
      const newRots: Rotation[] = selectedQuarters.map((q) => ({
        id: `rot-${Date.now()}-${Math.random()}`,
        planId: currentPlan.id,
        quarter: q,
        minute: formMinute,
        type: formType,
        outId: formOutId,
        inId: formInId,
        out: outText,
        inn: inText,
        note: formNote.trim(),
        applied: false,
        status: 'scheduled',
      }));
      onUpdateRotations([...rotations, ...newRots]);
    }

    setShowRotationModal(false);
  };

  const handleDeleteRotation = (rotId: string) => {
    if (!window.confirm('Delete this scheduled rotation?')) return;
    onUpdateRotations(rotations.filter((r) => r.id !== rotId));
  };

  const handleToggleApplyRotation = (rotId: string) => {
    onUpdateRotations(
      rotations.map((r) =>
        r.id === rotId ? { ...r, applied: !r.applied, status: !r.applied ? 'applied' : 'scheduled' } : r
      )
    );
  };

  const onFieldIds = new Set(Object.values(lineup));
  const fieldPlayers = players.filter((p) => p.status === 'available' && onFieldIds.has(p.id));
  const benchPlayers = players.filter((p) => p.status === 'available' && !onFieldIds.has(p.id));

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[var(--line)] shadow-sm">
        <div>
          <h2 className="text-xl font-black text-[var(--navy)] tracking-tight">Rotations</h2>
          <p className="text-xs text-[var(--muted)] font-semibold mt-1">
            Build multi-quarter, time-scheduled rotation plans for Game Day alerts
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCreatePlan}
            className="px-3.5 py-2 text-xs font-bold bg-[var(--green)] text-white rounded-xl hover:opacity-95 transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Plan</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plans Navigation List */}
        <div className="bg-white p-4 rounded-2xl border border-[var(--line)] shadow-sm space-y-4">
          <h3 className="font-black text-sm text-[var(--navy)] tracking-tight">Rotation Plans</h3>
          <p className="text-xs text-[var(--muted)] font-semibold leading-relaxed">
            Run up to 4 plans at once. Active plans will generate alerts during the game in the Game Day view.
          </p>

          <div className="space-y-3">
            {plans.map((p) => {
              const isActive = selectedPlanId === p.id;
              const isRunning = activePlanIds.includes(p.id);

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlanId(p.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between gap-3 ${
                    isActive
                      ? 'border-[var(--amber)] bg-[#FFF8E6] shadow-xs'
                      : 'border-[var(--line)] bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-sm text-[var(--ink)] truncate max-w-[140px]">
                      {p.name}
                    </span>
                    <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase ${
                      isRunning ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {isRunning ? 'Running' : 'Paused'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-dashed border-gray-100 mt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePlanRunning(p.id);
                      }}
                      className={`px-2 py-1 text-[10px] font-black rounded-md ${
                        isRunning ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {isRunning ? 'Pause' : 'Run'}
                    </button>
                    <button
                      onClick={(e) => handleDuplicatePlan(p.id, e)}
                      className="px-2 py-1 text-[10px] font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={(e) => handleRenamePlan(p.id, e)}
                      className="px-2 py-1 text-[10px] font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md"
                    >
                      Rename
                    </button>
                    {plans.length > 1 && (
                      <button
                        onClick={(e) => handleDeletePlan(p.id, e)}
                        className="px-2 py-1 text-[10px] font-semibold bg-red-50 text-red-600 hover:bg-red-100 rounded-md ml-auto"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rotation Editor Engine */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-[var(--line)] shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-black text-sm text-[var(--navy)]">
                Selected Plan: <span className="text-[var(--blue)]">{currentPlan?.name || 'Default'}</span>
              </h3>
              <p className="text-xs text-[var(--muted)] font-semibold mt-0.5">
                Define timing triggers in goals quarters
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleOpenAddRotation}
                className="px-3 py-1.5 text-xs font-bold bg-[var(--blue)] text-white rounded-lg hover:opacity-95 transition"
              >
                + Add Rotation
              </button>
              <button
                onClick={handleAutoBuild}
                className="px-3 py-1.5 text-xs font-bold bg-purple-50 text-[#8B5CF6] border border-purple-100 rounded-lg hover:bg-purple-100 transition"
              >
                ⚡ Auto Build
              </button>
            </div>
          </div>

          {/* Group and list rotations */}
          <div className="space-y-6">
            {[1, 2, 3, 4].map((q) => {
              const qRots = planRotations.filter((r) => r.quarter === q);

              return (
                <div key={q} className="space-y-3">
                  <div className="flex items-center justify-between bg-gray-50/80 px-3 py-1.5 rounded-lg border border-gray-100">
                    <span className="font-extrabold text-xs text-[var(--navy)] uppercase">Quarter {q}</span>
                    <span className="text-[10px] font-bold text-gray-500">
                      {qRots.length} planned
                    </span>
                  </div>

                  <div className="space-y-2">
                    {qRots.map((r) => (
                      <div
                        key={r.id}
                        className={`p-3.5 border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
                          r.applied
                            ? 'border-gray-100 bg-gray-50/50 opacity-60'
                            : 'border-[var(--line)] bg-white hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[var(--blue)] text-white font-black text-xs rounded-xl flex flex-col items-center justify-center shrink-0">
                            <span>Q{r.quarter}</span>
                            <span className="text-[10px] text-blue-100">{r.minute}m</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <b className="text-sm font-extrabold text-gray-900">
                                {r.out} ➔ {r.inn}
                              </b>
                              <span className={`px-2 py-0.5 text-[9px] font-black rounded-md ${
                                r.type === 'onfield' ? 'bg-cyan-50 text-cyan-700' : 'bg-blue-50 text-blue-700'
                              }`}>
                                {r.type === 'onfield' ? 'On Field Swap' : 'Interchange'}
                              </span>
                            </div>
                            {r.note && (
                              <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                                Note: {r.note}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end md:self-center">
                          <button
                            onClick={() => handleOpenEditRotation(r)}
                            className="p-1.5 text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleApplyRotation(r.id)}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition ${
                              r.applied
                                ? 'bg-amber-50 text-amber-700 border-amber-100'
                                : 'bg-green-50 text-[#0E7A48] border-green-100'
                            }`}
                          >
                            {r.applied ? 'Reset' : 'Apply'}
                          </button>
                          <button
                            onClick={() => handleDeleteRotation(r.id)}
                            className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {qRots.length === 0 && (
                      <p className="text-xs text-gray-400 font-semibold text-center py-4 bg-gray-50/50 rounded-xl border border-dashed border-gray-100">
                        No rotations scheduled for Quarter {q}.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL: Add/Edit Rotation */}
      {showRotationModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md border border-[var(--line)] shadow-2xl p-5 space-y-4">
            <h3 className="text-lg font-black text-[var(--navy)] border-b border-gray-100 pb-2">
              {editingRotation ? 'Edit Rotation' : 'Schedule New Rotation'}
            </h3>

            {formError && (
              <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
                {formError}
              </p>
            )}

            <div className="space-y-4 text-xs font-semibold text-gray-600">
              {/* Quarter Selection Toggles */}
              <div>
                <label className="block mb-2 text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Select Quarters
                </label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4].map((q) => {
                    const selected = selectedQuarters.includes(q);
                    return (
                      <button
                        key={q}
                        type="button"
                        onClick={() => {
                          if (selected) {
                            if (selectedQuarters.length > 1) {
                              setSelectedQuarters(selectedQuarters.filter(item => item !== q));
                            }
                          } else {
                            setSelectedQuarters([...selectedQuarters, q].sort());
                          }
                        }}
                        className={`flex-1 py-2 text-xs font-black rounded-xl border transition ${
                          selected
                            ? 'bg-[var(--blue)] text-white border-[var(--blue)]'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        Q{q}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Minute mark */}
              <div>
                <label className="block mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Time (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="15"
                  value={formMinute}
                  onChange={(e) => setFormMinute(parseInt(e.target.value, 10) || 0)}
                  className="w-full p-2.5 border border-gray-200 bg-white rounded-xl focus:outline-none text-sm font-bold text-[var(--ink)]"
                />
              </div>

              {/* Rotation type */}
              <div>
                <label className="block mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Rotation Type
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as 'bench' | 'onfield')}
                  className="w-full p-2.5 border border-gray-200 bg-white rounded-xl focus:outline-none text-sm font-bold text-[var(--ink)]"
                >
                  <option value="bench">Bench interchange (OFF field player ➔ ON bench player)</option>
                  <option value="onfield">On-field swap (Move positions between two active players)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Out Player */}
                <div>
                  <label className="block mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    {formType === 'bench' ? 'Player OFF Field' : 'Player A'}
                  </label>
                  <select
                    value={formOutId}
                    onChange={(e) => setFormOutId(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 bg-white rounded-xl focus:outline-none text-sm font-bold text-[var(--ink)]"
                  >
                    <option value="">Select player</option>
                    {fieldPlayers.map((p) => (
                      <option key={p.id} value={p.id}>#{p.number} {p.name}</option>
                    ))}
                  </select>
                </div>

                {/* In Player */}
                <div>
                  <label className="block mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    {formType === 'bench' ? 'Player ON Bench' : 'Player B'}
                  </label>
                  <select
                    value={formInId}
                    onChange={(e) => setFormInId(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 bg-white rounded-xl focus:outline-none text-sm font-bold text-[var(--ink)]"
                  >
                    <option value="">Select player</option>
                    {(formType === 'bench' ? benchPlayers : fieldPlayers).map((p) => (
                      <option key={p.id} value={p.id}>#{p.number} {p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Note / Comments
                </label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="e.g. Tactical swap for fresh legs"
                  className="w-full p-2.5 border border-gray-200 bg-white rounded-xl focus:outline-none text-sm font-bold text-[var(--ink)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3 mt-4">
              <button
                onClick={() => setShowRotationModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRotation}
                className="px-4 py-2 text-xs font-bold bg-[var(--green)] hover:opacity-90 text-white rounded-xl"
              >
                Save Rotation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
