import React, { useState, useMemo } from 'react';
import { Player, Rotation, Plan, LineupTemplate, TeamProfile } from '../types';
import { POSITIONS, POSITION_GROUPS, POSITION_FULL_NAMES, matchPositions, detectRotationGaps, RotationGap } from '../constants';
import { Plus, Trash, Copy, Edit3, Check, RefreshCw, AlertCircle, AlertTriangle, Sparkles, FolderOpen, Save, Layers, ArrowLeft, ShieldCheck, Users, Bot, List } from 'lucide-react';
import PlanModeView from './PlanModeView';
import ThreeWayRotationModal, { ThreeWayGroupEditData } from './ThreeWayRotationModal';

interface ThreeWayGroupInfo {
  groupId: string;
  p1: Player | undefined;
  p2: Player | undefined;
  p3: Player | undefined;
  p1Id: string;
  p2Id: string;
  p3Id: string;
  intervalMinutes: number;
  quarters: number[];
  rotations: Rotation[];
}

const getThreeWayGroups = (planRotations: Rotation[], players: Player[]): ThreeWayGroupInfo[] => {
  const groupsMap = new Map<string, Rotation[]>();

  planRotations.forEach((r) => {
    if (r.groupId) {
      if (!groupsMap.has(r.groupId)) groupsMap.set(r.groupId, []);
      groupsMap.get(r.groupId)!.push(r);
    } else if (r.note && (r.note.includes('3-Way Rotation') || r.note.includes('3-Way Set'))) {
      const fallbackKey = `legacy-3way-${r.planId}`;
      if (!groupsMap.has(fallbackKey)) groupsMap.set(fallbackKey, []);
      groupsMap.get(fallbackKey)!.push(r);
    }
  });

  const result: ThreeWayGroupInfo[] = [];

  groupsMap.forEach((rots, gId) => {
    if (rots.length === 0) return;
    const first = rots[0];

    let p1Id = first.groupP1Id || '';
    let p2Id = first.groupP2Id || '';
    let p3Id = first.groupP3Id || '';
    let intervalMinutes = first.groupInterval || 5;

    if (!p1Id || !p2Id || !p3Id) {
      const allPlayerIds = new Set<string>();
      rots.forEach((r) => {
        if (r.outId) allPlayerIds.add(r.outId);
        if (r.inId) allPlayerIds.add(r.inId);
      });
      const ids = Array.from(allPlayerIds);
      p1Id = ids[0] || '';
      p2Id = ids[1] || '';
      p3Id = ids[2] || '';

      const minMinute = Math.min(...rots.map((r) => r.minute));
      if (minMinute > 0) intervalMinutes = minMinute;
    }

    const quarters = Array.from(new Set(rots.map((r) => r.quarter))).sort((a, b) => a - b);

    result.push({
      groupId: gId,
      p1: players.find((p) => p.id === p1Id),
      p2: players.find((p) => p.id === p2Id),
      p3: players.find((p) => p.id === p3Id),
      p1Id,
      p2Id,
      p3Id,
      intervalMinutes,
      quarters,
      rotations: rots,
    });
  });

  return result;
};

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
  onNavigate?: (tab: string) => void;
  teams?: TeamProfile[];
  activeTeamId?: string | null;
  onSelectTeam?: (teamId: string) => void;
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
  onNavigate,
  teams,
  activeTeamId,
  onSelectTeam,
}: RotationsScreenProps) {
  const activeTeamObj = teams?.find((t) => t.id === activeTeamId) || null;
  const activeTeamName = activeTeamObj?.name || 'Active Squad';
  const [selectedPlanId, setSelectedPlanId] = useState<string>(plans[0]?.id || '');

  React.useEffect(() => {
    if (!plans.some((p) => p.id === selectedPlanId)) {
      setSelectedPlanId(plans[0]?.id || '');
    }
  }, [plans, selectedPlanId]);
  const [showRotationModal, setShowRotationModal] = useState(false);
  const [showThreeWayModal, setShowThreeWayModal] = useState(false);
  const [editingThreeWayData, setEditingThreeWayData] = useState<ThreeWayGroupEditData | null>(null);
  const [showPlanMode, setShowPlanMode] = useState(false);
  const [editingRotation, setEditingRotation] = useState<Rotation | null>(null);

  // Rotation Form states
  const [selectedQuarters, setSelectedQuarters] = useState<number[]>([1]);
  const [formMinute, setFormMinute] = useState<number>(5);
  const [formType, setFormType] = useState<'bench' | 'onfield'>('bench');
  const [formOutId, setFormOutId] = useState<string>('');
  const [formInId, setFormInId] = useState<string>('');
  const [formP3Id, setFormP3Id] = useState<string>('');
  const [formNote, setFormNote] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  const currentPlan = plans.find((p) => p.id === selectedPlanId) || plans[0] || null;

  // Helper to resolve player's position from Game Day starting lineup template
  const getPlayerPosLabel = (playerId: string) => {
    const slotKey = Object.keys(lineup).find((k) => lineup[k] === playerId);
    if (slotKey) {
      const fullName = POSITION_FULL_NAMES[slotKey] || slotKey;
      return {
        slotKey,
        fullName,
        isOnField: true,
        text: `${slotKey} (${fullName})`,
      };
    }
    const p = players.find((pl) => pl.id === playerId);
    const zones = p?.positions?.length ? p.positions.join('/') : (p?.primaryZone || 'Bench');
    return {
      slotKey: null,
      fullName: `Bench (${zones})`,
      isOnField: false,
      text: `Bench (${zones})`,
    };
  };

  // Group current plan's rotations by Quarter
  const planRotations = rotations
    .filter((r) => r.planId === (currentPlan?.id || ''))
    .sort((a, b) => a.quarter - b.quarter || a.minute - b.minute);

  const rotationGaps = useMemo(() => {
    let allGaps: RotationGap[] = [];
    [1, 2, 3, 4].forEach((q) => {
      const qGaps = detectRotationGaps(players, lineup, planRotations, q);
      allGaps = [...allGaps, ...qGaps];
    });
    const uniqueMap = new Map<string, RotationGap>();
    allGaps.forEach((g) => uniqueMap.set(g.id, g));
    return Array.from(uniqueMap.values());
  }, [players, lineup, planRotations]);

  const handleAutoFillPlanGaps = () => {
    if (!rotationGaps.length) return;
    const nextRotations = [...rotations];
    let addedCount = 0;

    rotationGaps.forEach((gap) => {
      if (gap.type === 'unassigned_bench' && gap.playerId) {
        const p = players.find((pl) => pl.id === gap.playerId);
        if (p && currentPlan) {
          const prefPos = p.positions && p.positions.length > 0 ? p.positions[0] : null;
          const onFieldPlayerId = Object.values(lineup).find((id) => Boolean(id));
          if (onFieldPlayerId) {
            const outP = players.find((pl) => pl.id === onFieldPlayerId);
            const newRot: Rotation = {
              id: `rot-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              planId: currentPlan.id,
              quarter: 1,
              minute: 5,
              outId: onFieldPlayerId,
              inId: p.id,
              out: outP ? `#${outP.number} ${outP.name}` : 'Field',
              inn: `#${p.number} ${p.name}`,
              type: 'bench',
              applied: false,
              status: 'scheduled',
              note: `Auto-filled for preferred position ${prefPos || p.primaryZone}`,
            };
            nextRotations.push(newRot);
            addedCount++;
          }
        }
      }
    });

    if (addedCount > 0) {
      onUpdateRotations(nextRotations);
    }
  };

  const handleAskJarvisFixPlanGaps = () => {
    if (!rotationGaps.length) return;
    const gapListText = rotationGaps.map((g) => `• ${g.title}: ${g.description}`).join('\n');
    const benchStr = players
      .filter((p) => p.status === 'available')
      .map((p) => `#${p.number} ${p.name} (Pref: ${(p.positions || []).join('/') || p.primaryZone})`)
      .join(', ');

    const prompt = `I'm building a rotation plan "${currentPlan?.name || 'Standard Plan'}" and have flagged ${rotationGaps.length} rotation gap(s):\n${gapListText}\n\nAvailable squad players:\n${benchStr}\n\nPlease analyze these rotation gaps, assign players based on preferred positions (treating Left and Right positions as equal), and design an optimal multi-quarter rotation schedule!`;

    localStorage.setItem('iiq_pending_jarvis_prompt', prompt);
    if (onNavigate) {
      onNavigate('jarvis');
    }
  };

  const threeWayGroups = useMemo(() => {
    return getThreeWayGroups(planRotations, players);
  }, [planRotations, players]);

  const handleOpenCreateThreeWay = () => {
    setEditingThreeWayData(null);
    setShowThreeWayModal(true);
  };

  const handleOpenEditThreeWayGroup = (group: ThreeWayGroupInfo) => {
    setEditingThreeWayData({
      groupId: group.groupId,
      p1Id: group.p1Id,
      p2Id: group.p2Id,
      p3Id: group.p3Id,
      intervalMinutes: group.intervalMinutes,
      selectedQuarters: group.quarters,
      planId: currentPlan?.id,
    });
    setShowThreeWayModal(true);
  };

  const handleDeleteThreeWayGroup = (group: ThreeWayGroupInfo) => {
    if (!window.confirm('Delete this full 3-Way rotation set and all its scheduled swaps?')) return;
    const idsToDelete = new Set(group.rotations.map((r) => r.id));
    onUpdateRotations(rotations.filter((r) => !idsToDelete.has(r.id) && r.groupId !== group.groupId));
  };

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
    setFormP3Id('');
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

    // Derive 3rd player if part of a group or saved on rotation
    let p3Id = rot.groupP3Id || '';
    if (!p3Id && rot.groupId) {
      const g = threeWayGroups.find((grp) => grp.groupId === rot.groupId);
      if (g) {
        p3Id = [g.p1Id, g.p2Id, g.p3Id].find((id) => id !== rot.outId && id !== rot.inId) || '';
      }
    }
    setFormP3Id(p3Id);

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
    if (formP3Id && (formP3Id === formOutId || formP3Id === formInId)) {
      setFormError('The 3rd player must be different from Player OFF and Player ON.');
      return;
    }
    if (selectedQuarters.length === 0) {
      setFormError('Please select at least one quarter.');
      return;
    }

    const outPlayer = players.find((p) => p.id === formOutId);
    const inPlayer = players.find((p) => p.id === formInId);

    if (!outPlayer || !inPlayer) return;

    const outPos = getPlayerPosLabel(outPlayer.id);
    const inPos = getPlayerPosLabel(inPlayer.id);

    const outPosTag = outPos.slotKey ? ` [${outPos.slotKey}]` : '';
    const inPosTag = inPos.slotKey ? ` [${inPos.slotKey}]` : '';

    const outText = formType === 'bench' ? `OFF${outPosTag} #${outPlayer.number} ${outPlayer.name}` : `FROM${outPosTag} #${outPlayer.number} ${outPlayer.name}`;
    const inText = formType === 'bench' ? `ON${inPosTag} #${inPlayer.number} ${inPlayer.name}` : `TO${inPosTag} #${inPlayer.number} ${inPlayer.name}`;

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
              groupP3Id: formP3Id || undefined,
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
        groupP3Id: formP3Id || undefined,
        groupId: editingRotation.groupId,
        groupType: editingRotation.groupType,
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
        groupP3Id: formP3Id || undefined,
        groupType: formP3Id ? '3-way' : undefined,
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
      {/* Active Team Alignment Banner */}
      {(() => {
        const activeTeamObj = teams?.find(t => t.id === activeTeamId);
        const activeLogo = activeTeamObj?.logoUrl || activeTeamObj?.iconUrl;
        const activeJumper = activeTeamObj?.jumperUrl;
        return (
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm border border-indigo-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-lg shrink-0 shadow-xs overflow-hidden p-0.5">
                {activeLogo ? (
                  <img src={activeLogo} alt={activeTeamName} className="w-full h-full object-contain" />
                ) : (
                  <span>⚡</span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-indigo-300 tracking-wider">
                    Active Squad Context
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold uppercase border border-emerald-500/30">
                    Rotations Aligned
                  </span>
                </div>
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  <span>{activeTeamName}</span>
                  {activeJumper && (
                    <img src={activeJumper} alt="Jumper" className="w-5 h-5 object-contain rounded border border-slate-700 shrink-0" title="Team Jumper" />
                  )}
                  <span className="text-xs font-semibold text-slate-300">({players.length} squad members)</span>
                </h3>
              </div>
            </div>

            {teams && teams.length > 1 && onSelectTeam && (
              <div className="flex items-center gap-2 bg-white/10 p-1.5 px-3 rounded-xl border border-white/15">
                <span className="text-xs font-extrabold text-slate-200 shrink-0">Selected Team:</span>
                <select
                  value={activeTeamId || ''}
                  onChange={(e) => onSelectTeam(e.target.value)}
                  className="px-3 py-1 rounded-lg bg-slate-900 text-white font-extrabold text-xs border border-slate-700 focus:outline-none cursor-pointer"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id} className="text-slate-900 font-bold">
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        );
      })()}

      {/* Top action header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[var(--line)] shadow-sm">
        <div className="flex items-center gap-3">
          {onNavigate && (
            <button
              onClick={() => onNavigate('gameday')}
              className="p-2 text-slate-700 hover:text-[var(--navy)] bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
              title="Return to Game Day"
            >
              <ArrowLeft className="w-5 h-5 text-[var(--navy)]" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-black text-[var(--navy)] tracking-tight">Rotations</h2>
            <p className="text-xs text-[var(--muted)] font-semibold mt-0.5">
              Build multi-quarter, time-scheduled rotation plans for Game Day alerts
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 shrink-0">
            <button
              onClick={() => setShowPlanMode(false)}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                !showPlanMode
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Rotations Table</span>
            </button>
            <button
              onClick={() => setShowPlanMode(true)}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                showPlanMode
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Visual Oval Plan</span>
            </button>
          </div>

          {onNavigate && (
            <button
              onClick={() => onNavigate('gameday')}
              className="px-3.5 py-2 text-xs font-black bg-[var(--navy)] hover:bg-[var(--navy)]/90 text-white rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span>Back to Game Day</span>
            </button>
          )}
          <button
            onClick={handleOpenCreateThreeWay}
            className="px-3.5 py-2 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>3-Way Rotation Builder</span>
          </button>
          <button
            onClick={handleCreatePlan}
            className="px-3.5 py-2 text-xs font-bold bg-[var(--green)] text-white rounded-xl hover:opacity-95 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Plan</span>
          </button>
        </div>
      </div>

      {showPlanMode ? (
        <PlanModeView
          onClose={() => setShowPlanMode(false)}
          onNavigateToGameDay={() => {
            setShowPlanMode(false);
            if (onNavigate) onNavigate('lineup');
          }}
          players={players}
          onUpdatePlayers={() => {}}
          lineup={lineup}
          onUpdateLineup={onUpdateLineup}
          rotations={rotations}
          onUpdateRotations={onUpdateRotations}
          plans={plans}
          onUpdatePlans={onUpdatePlans}
          activePlanIds={activePlanIds}
          onTogglePlanRunning={onTogglePlanRunning}
          teamName={activeTeamName}
        />
      ) : (
        <>
          {/* Rotation Gap Alert Card */}
      {rotationGaps.length > 0 && (
        <div className="p-4 bg-amber-50/90 border-2 border-amber-300 rounded-2xl space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0" />
              <span className="font-black text-xs text-amber-950 uppercase tracking-wide">
                Rotation Plan Gaps Flagged ({rotationGaps.length} Issue{rotationGaps.length > 1 ? 's' : ''})
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleAutoFillPlanGaps}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                <span>Auto-Fill Gaps (Preferred Positions)</span>
              </button>
              <button
                onClick={handleAskJarvisFixPlanGaps}
                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>Ask Jarvis AI to Resolve</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            {rotationGaps.map((gap) => (
              <div key={gap.id} className="p-2.5 bg-white/90 border border-amber-200 rounded-xl text-xs flex items-start gap-2 shadow-2xs">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <b className="text-amber-950 font-extrabold block">{gap.title}</b>
                  <p className="text-amber-900 text-[11px] font-medium leading-tight">{gap.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleOpenCreateThreeWay}
                className="px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>🔄 3-Way Generator</span>
              </button>
              <button
                onClick={handleOpenAddRotation}
                className="px-3 py-1.5 text-xs font-bold bg-[var(--blue)] text-white rounded-lg hover:opacity-95 transition cursor-pointer"
              >
                + Add Rotation
              </button>
              <button
                onClick={handleAutoBuild}
                className="px-3 py-1.5 text-xs font-bold bg-purple-50 text-[#8B5CF6] border border-purple-100 rounded-lg hover:bg-purple-100 transition cursor-pointer"
              >
                ⚡ Auto Build
              </button>
            </div>
          </div>

          {/* Active 3-Way Rotation Groups Overview */}
          {threeWayGroups.length > 0 && (
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 rounded-2xl border border-indigo-500/30 text-white shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-white tracking-tight">
                      Active 3-Way Rotation Sets ({threeWayGroups.length})
                    </h4>
                    <p className="text-[11px] text-slate-300 font-medium">
                      Managed as synchronized 3-player continuous interchange sets
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleOpenCreateThreeWay}
                  className="px-3 py-1.5 text-xs font-black bg-amber-500 hover:bg-amber-400 text-black rounded-xl transition cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New 3-Way Set</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {threeWayGroups.map((group, idx) => {
                  const p1Pos = group.p1 ? getPlayerPosLabel(group.p1.id) : null;
                  const p2Pos = group.p2 ? getPlayerPosLabel(group.p2.id) : null;
                  const p3Pos = group.p3 ? getPlayerPosLabel(group.p3.id) : null;

                  return (
                    <div
                      key={group.groupId || idx}
                      className="bg-slate-800/90 border border-slate-700/80 p-3.5 rounded-xl space-y-3 text-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700 pb-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-black text-[10px] uppercase border border-indigo-500/30">
                            3-Way Group
                          </span>
                          <span className="font-extrabold text-amber-400">
                            ⚡ {group.intervalMinutes}-Min Intervals
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="font-extrabold text-slate-200">
                            Quarters: {group.quarters.map((q) => `Q${q}`).join(', ')}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="font-bold text-slate-300">
                            {group.rotations.length} total scheduled swaps
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditThreeWayGroup(group)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Full 3-Way Set</span>
                          </button>
                          <button
                            onClick={() => handleDeleteThreeWayGroup(group)}
                            className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition cursor-pointer"
                            title="Delete full 3-way rotation set"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* 3 Players Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="bg-slate-900/90 border border-slate-700 p-2.5 rounded-lg space-y-1">
                          <div className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                            Player A (Field)
                          </div>
                          {group.p1 ? (
                            <div className="font-black text-white text-xs truncate">
                              #{group.p1.number} {group.p1.name}
                            </div>
                          ) : (
                            <div className="text-slate-400 font-semibold">Unknown</div>
                          )}
                          <div className="text-[10px] font-extrabold text-slate-300">
                            📍 {p1Pos ? p1Pos.text : 'Position'}
                          </div>
                        </div>

                        <div className="bg-slate-900/90 border border-slate-700 p-2.5 rounded-lg space-y-1">
                          <div className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                            Player B (Field)
                          </div>
                          {group.p2 ? (
                            <div className="font-black text-white text-xs truncate">
                              #{group.p2.number} {group.p2.name}
                            </div>
                          ) : (
                            <div className="text-slate-400 font-semibold">Unknown</div>
                          )}
                          <div className="text-[10px] font-extrabold text-slate-300">
                            📍 {p2Pos ? p2Pos.text : 'Position'}
                          </div>
                        </div>

                        <div className="bg-slate-900/90 border border-slate-700 p-2.5 rounded-lg space-y-1">
                          <div className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                            Player C (Bench Start)
                          </div>
                          {group.p3 ? (
                            <div className="font-black text-white text-xs truncate">
                              #{group.p3.number} {group.p3.name}
                            </div>
                          ) : (
                            <div className="text-slate-400 font-semibold">Unknown</div>
                          )}
                          <div className="text-[10px] font-extrabold text-slate-300">
                            📍 {p3Pos ? p3Pos.text : 'Bench'}
                          </div>
                        </div>
                      </div>

                      {/* Sequence Timeline Preview */}
                      <details className="group/sched">
                        <summary className="cursor-pointer text-[11px] font-black text-amber-400 hover:text-amber-300 flex items-center justify-between py-1 select-none">
                          <span>View Full Swap Schedule Matrix ({group.rotations.length} swaps)</span>
                          <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-slate-300 group-open/sched:rotate-180 transition-transform">
                            ▼
                          </span>
                        </summary>
                        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                          {group.rotations.map((r) => (
                            <div
                              key={r.id}
                              className="bg-slate-900/70 border border-slate-700/60 p-2 rounded text-[11px] flex items-center justify-between font-mono"
                            >
                              <span className="font-black text-amber-400">
                                Q{r.quarter} @ {r.minute}m
                              </span>
                              <span className="text-slate-200 truncate pl-2">
                                {r.out} ➔ {r.inn}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
                    {qRots.map((r) => {
                      const belongingGroup = threeWayGroups.find(
                        (g) => g.groupId === r.groupId || g.rotations.some((gr) => gr.id === r.id)
                      );

                      const p3Id = r.groupP3Id || (belongingGroup ? [belongingGroup.p1Id, belongingGroup.p2Id, belongingGroup.p3Id].find((id) => id !== r.outId && id !== r.inId) : null);
                      const p3Player = p3Id ? players.find((p) => p.id === p3Id) : null;

                      return (
                        <div
                          key={r.id}
                          className={`p-3.5 border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
                            r.applied
                              ? 'border-gray-100 bg-gray-50/50 opacity-60'
                              : 'border-[var(--line)] bg-white hover:shadow-xs'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <div className="w-10 h-10 bg-[var(--navy)] text-white font-black text-xs rounded-xl flex flex-col items-center justify-center shrink-0 shadow-sm border border-slate-700">
                              <span>Q{r.quarter}</span>
                              <span className="text-[10px] text-amber-400">{r.minute}m</span>
                            </div>

                            <div className="space-y-1.5">
                              {/* Dual OFF / ON or FROM / TO High-Contrast Interchange Badges */}
                              <div className="flex flex-wrap items-center gap-2">
                                {/* OFF or FROM Badge */}
                                <span className={`px-2.5 py-1 rounded-lg border text-xs font-black flex items-center gap-1.5 shadow-xs ${
                                  r.type === 'onfield'
                                    ? 'bg-blue-950/80 border-blue-600/80 text-blue-100'
                                    : 'bg-red-950/80 border-red-600/80 text-red-100'
                                }`}>
                                  <span className={`${r.type === 'onfield' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'} w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-black`}>
                                    {r.type === 'onfield' ? '📍' : '↓'}
                                  </span>
                                  <span>{r.type === 'onfield' ? 'FROM' : 'OFF'}: {r.out.replace(/^(OFF|FROM|Pos A)\s*/i, '')}</span>
                                </span>

                                {/* Interchange Arrow */}
                                <span className="text-slate-400 font-black text-xs">⇄</span>

                                {/* ON or TO Badge */}
                                <span className={`px-2.5 py-1 rounded-lg border text-xs font-black flex items-center gap-1.5 shadow-xs ${
                                  r.type === 'onfield'
                                    ? 'bg-purple-950/80 border-purple-600/80 text-purple-100'
                                    : 'bg-emerald-950/80 border-emerald-500/80 text-emerald-100'
                                }`}>
                                  <span className={`${r.type === 'onfield' ? 'bg-purple-600 text-white' : 'bg-emerald-500 text-black'} w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-black`}>
                                    {r.type === 'onfield' ? '📍' : '↑'}
                                  </span>
                                  <span>{r.type === 'onfield' ? 'TO' : 'ON'}: {r.inn.replace(/^(ON|TO|Pos B)\s*/i, '')}</span>
                                </span>

                                {/* 3rd Player Badge */}
                                {p3Player && (
                                  <span className="px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-500/80 text-indigo-100 text-xs font-black flex items-center gap-1.5 shadow-xs">
                                    <span className="bg-amber-400 text-slate-950 w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-black">3</span>
                                    <span>3rd Player: #{p3Player.number} {p3Player.name}</span>
                                  </span>
                                )}

                                <span className={`px-2 py-0.5 text-[9px] font-black rounded-md ${
                                  r.type === 'onfield' ? 'bg-cyan-50 text-cyan-700' : 'bg-blue-50 text-blue-700'
                                }`}>
                                  {r.type === 'onfield' ? 'On Field Swap' : 'Interchange'}
                                </span>

                                {belongingGroup && (
                                  <span className="px-2 py-0.5 text-[9px] font-black rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                                    🔄 3-Way Set
                                  </span>
                                )}
                              </div>

                              {r.note && (
                                <p className="text-[10px] text-gray-500 font-semibold">
                                  Note: {r.note}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 self-end md:self-center">
                            {belongingGroup && (
                              <button
                                onClick={() => handleOpenEditThreeWayGroup(belongingGroup)}
                                className="px-2.5 py-1 text-[11px] font-extrabold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition cursor-pointer flex items-center gap-1"
                                title="Edit full 3-Way rotation sequence"
                              >
                                <RefreshCw className="w-3 h-3 text-indigo-600" />
                                <span>Edit 3-Way Set</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenEditRotation(r)}
                              className="p-1.5 text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                              title="Edit single rotation"
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
                              className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition cursor-pointer"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

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
          <div className="bg-white rounded-2xl w-full max-w-2xl border border-[var(--line)] shadow-2xl p-5 space-y-4">
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
                  className="w-full p-2.5 border border-gray-200 bg-white rounded-xl focus:outline-none text-sm font-bold text-[var(--ink)] cursor-pointer"
                >
                  <option value="bench">Bench interchange (OFF field player ➔ ON bench player)</option>
                  <option value="onfield">On-field swap (Move positions between two active players)</option>
                </select>
              </div>

              {/* Starting Lineup Template Banner */}
              <div className="bg-blue-50/80 border border-blue-200 p-2.5 rounded-xl flex items-center justify-between text-xs text-blue-950 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <span className="font-extrabold text-blue-900">Game Day Positions: </span>
                    <span className="font-semibold text-blue-800">
                      Mapped from current starting lineup template
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Out Player */}
                <div>
                  <label className="block mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    {formType === 'bench' ? 'Player OFF Field' : 'Player A'}
                  </label>
                  <select
                    value={formOutId}
                    onChange={(e) => setFormOutId(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 bg-white rounded-xl focus:outline-none text-sm font-bold text-[var(--ink)] cursor-pointer"
                  >
                    <option value="">Select player</option>
                    {fieldPlayers.map((p) => {
                      const pos = getPlayerPosLabel(p.id);
                      return (
                        <option key={p.id} value={p.id}>
                          #{p.number} {p.name} {pos.isOnField ? `— ${pos.slotKey} (${pos.fullName})` : `— Bench`}
                        </option>
                      );
                    })}
                  </select>
                  {formOutId && (() => {
                    const pos = getPlayerPosLabel(formOutId);
                    return (
                      <div className="mt-1.5 p-2 bg-emerald-50/90 border border-emerald-200 rounded-lg text-[11px] font-bold text-emerald-950 flex items-center justify-between shadow-2xs">
                        <span className="truncate pr-1">
                          📍 {pos.isOnField ? `${pos.slotKey} - ${pos.fullName}` : pos.text}
                        </span>
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${pos.isOnField ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>
                          {pos.isOnField ? 'Field' : 'Bench'}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* In Player */}
                <div>
                  <label className="block mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    {formType === 'bench' ? 'Player ON Bench' : 'Player B'}
                  </label>
                  <select
                    value={formInId}
                    onChange={(e) => setFormInId(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 bg-white rounded-xl focus:outline-none text-sm font-bold text-[var(--ink)] cursor-pointer"
                  >
                    <option value="">Select player</option>
                    {(formType === 'bench' ? benchPlayers : fieldPlayers).map((p) => {
                      const pos = getPlayerPosLabel(p.id);
                      return (
                        <option key={p.id} value={p.id}>
                          #{p.number} {p.name} {pos.isOnField ? `— ${pos.slotKey} (${pos.fullName})` : `— Bench`}
                        </option>
                      );
                    })}
                  </select>
                  {formInId && (() => {
                    const pos = getPlayerPosLabel(formInId);
                    return (
                      <div className="mt-1.5 p-2 bg-amber-50/90 border border-amber-200 rounded-lg text-[11px] font-bold text-amber-950 flex items-center justify-between shadow-2xs">
                        <span className="truncate pr-1">
                          📍 {pos.isOnField ? `${pos.slotKey} - ${pos.fullName}` : pos.text}
                        </span>
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${pos.isOnField ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'}`}>
                          {pos.isOnField ? 'Field' : 'Bench'}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* 3rd Player / Cycle Partner */}
                <div>
                  <label className="block mb-1 text-[10px] font-black uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                    <span>3rd Player (Cycle Partner)</span>
                    <span className="px-1.5 py-0.2 text-[8px] bg-indigo-100 text-indigo-800 rounded font-bold">3-Way</span>
                  </label>
                  <select
                    value={formP3Id}
                    onChange={(e) => setFormP3Id(e.target.value)}
                    className="w-full p-2.5 border border-indigo-200 bg-indigo-50/30 rounded-xl focus:outline-none text-sm font-bold text-[var(--ink)] cursor-pointer"
                  >
                    <option value="">None (Standard 2-player swap)</option>
                    {players
                      .filter((p) => p.status === 'available' && p.id !== formOutId && p.id !== formInId)
                      .map((p) => {
                        const pos = getPlayerPosLabel(p.id);
                        return (
                          <option key={p.id} value={p.id}>
                            #{p.number} {p.name} {pos.isOnField ? `— ${pos.slotKey} (${pos.fullName})` : `— Bench`}
                          </option>
                        );
                      })}
                  </select>
                  {formP3Id && (() => {
                    const pos = getPlayerPosLabel(formP3Id);
                    return (
                      <div className="mt-1.5 p-2 bg-indigo-50/90 border border-indigo-200 rounded-lg text-[11px] font-bold text-indigo-950 flex items-center justify-between shadow-2xs">
                        <span className="truncate pr-1">
                          📍 3rd: {pos.isOnField ? `${pos.slotKey} - ${pos.fullName}` : pos.text}
                        </span>
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${pos.isOnField ? 'bg-emerald-200 text-emerald-900' : 'bg-indigo-200 text-indigo-900'}`}>
                          {pos.isOnField ? 'Field' : 'Bench'}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* 3-Way Group Summary Card inside Modal */}
              {(editingRotation?.groupId || formP3Id) && (() => {
                const group = threeWayGroups.find(
                  (g) => g.groupId === editingRotation?.groupId || g.rotations.some((gr) => gr.id === editingRotation?.id)
                );
                const p1 = players.find((p) => p.id === formOutId);
                const p2 = players.find((p) => p.id === formInId);
                const p3 = players.find((p) => p.id === formP3Id);

                return (
                  <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-indigo-500/40 space-y-2.5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-amber-500 text-black font-black text-[10px] rounded uppercase">
                          3-Way Rotation Active
                        </span>
                        <span className="text-xs font-bold text-amber-300">
                          3-Player Continuous Interchange
                        </span>
                      </div>
                      {group && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowRotationModal(false);
                            handleOpenEditThreeWayGroup(group);
                          }}
                          className="px-2.5 py-1 text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition cursor-pointer flex items-center gap-1 shadow-2xs self-start sm:self-auto"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Edit Full 3-Way Set Matrix</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div className="p-2 bg-slate-800 rounded-lg border border-slate-700">
                        <div className="text-[9px] uppercase font-bold text-red-400">
                          {formType === 'bench' ? '1. Player OFF' : '1. Player FROM'}
                        </div>
                        <div className="font-black text-white truncate">
                          {p1 ? `#${p1.number} ${p1.name}` : 'Select Player'}
                        </div>
                      </div>
                      <div className="p-2 bg-slate-800 rounded-lg border border-slate-700">
                        <div className="text-[9px] uppercase font-bold text-emerald-400">
                          {formType === 'bench' ? '2. Player ON' : '2. Player TO'}
                        </div>
                        <div className="font-black text-white truncate">
                          {p2 ? `#${p2.number} ${p2.name}` : 'Select Player'}
                        </div>
                      </div>
                      <div className="p-2 bg-slate-800 rounded-lg border border-slate-700">
                        <div className="text-[9px] uppercase font-bold text-amber-400">3. 3rd Player</div>
                        <div className="font-black text-white truncate">
                          {p3 ? `#${p3.number} ${p3.name}` : 'None Selected'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

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

      {/* Three Way Rotation Modal */}
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
        editingGroupData={editingThreeWayData}
        teamName={activeTeamName}
      />
        </>
      )}
    </div>
  );
}
