import React, { useState, useEffect, useRef } from 'react';
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
  RefreshCw,
  ArrowUp,
  Clock,
  Play,
  Pause,
  Save,
  UserPlus,
  Calendar,
  Circle
} from 'lucide-react';

interface PlanModeViewProps {
  onClose: () => void;
  onNavigateToGameDay?: () => void;
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
  teamName?: string;
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
  onNavigateToGameDay,
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
  teamName = 'Active Squad',
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
  const [mobileTab, setMobileTab] = useState<'bench' | 'pitch' | 'queue'>('pitch');

  // Link selection state for rotation linking
  const [selectedSource, setSelectedSource] = useState<{ type: 'bench' | 'field'; id: string; slot?: string } | null>(null);

  // "Create a Substitute" staging: moves built here are held locally until
  // the coach clicks Save Changes, so nothing is written to the shared
  // rotations list mid-build. Staged purely in component state + a
  // localStorage mirror (see below) — no network call of any kind, so this
  // works fully offline; Save Changes just calls the same onUpdateRotations
  // prop everything else in the app already uses for local-first sync.
  const [substituteMode, setSubstituteMode] = useState(true);
  const [pendingMoves, setPendingMoves] = useState<Rotation[]>([]);

  // Which move (pending or already-saved) is currently selected — drives
  // both the on-field arrow-in-context and the per-move Apply to Game button.
  const [selectedMoveId, setSelectedMoveId] = useState<string | null>(null);

  const currentPlan = plans.find((p) => p.id === selectedPlanId) || plans[0] || null;

  // Filter rotations for selected quarter
  const qRotations = rotations.filter(
    (r) => (currentPlan ? r.planId === currentPlan.id : true) && r.quarter === selectedQuarter
  );

  // Split into moves built visually in Plan Mode vs pre-built ones from the
  // classic Rotations screen form.
  const plannedMoves = qRotations.filter((r) => r.origin === 'planMode');
  const scheduledRotations = qRotations.filter((r) => r.origin !== 'planMode');

  // Offline-safe local staging key for this plan+quarter's unsaved queue.
  const pendingStorageKey = `iiq_planmode_pending_${currentPlan?.id || 'default'}_q${selectedQuarter}`;
  const hasLoadedPendingRef = useRef<string | null>(null);

  // Restore any unsaved pending moves for this plan+quarter (e.g. the coach
  // was offline/closed the app mid-build) and persist on every change —
  // both operations are pure localStorage, no network required.
  useEffect(() => {
    if (hasLoadedPendingRef.current === pendingStorageKey) return;
    hasLoadedPendingRef.current = pendingStorageKey;
    try {
      const raw = localStorage.getItem(pendingStorageKey);
      setPendingMoves(raw ? JSON.parse(raw) : []);
    } catch {
      setPendingMoves([]);
    }
    setSelectedSource(null);
    setSelectedMoveId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingStorageKey]);

  useEffect(() => {
    try {
      if (pendingMoves.length > 0) {
        localStorage.setItem(pendingStorageKey, JSON.stringify(pendingMoves));
      } else {
        localStorage.removeItem(pendingStorageKey);
      }
    } catch {
      // Local storage unavailable (private browsing etc.) — pending moves
      // still work for this session, just won't survive a reload.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingMoves, pendingStorageKey]);

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

  // Connect two selected entities (field or bench) — stages a substitute
  // rather than saving immediately, so multiple moves can be built up before
  // one Save Changes commit.
  const handleEntityClick = (entity: { type: 'bench' | 'field'; id: string; slot?: string }) => {
    if (!selectedSource) {
      setSelectedSource(entity);
    } else if (selectedSource.id === entity.id) {
      setSelectedSource(null);
    } else {
      stageSubstitute(selectedSource, entity);
    }
  };

  const stageSubstitute = (
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
      outSlot: from.type === 'field' ? from.slot : undefined,
      inSlot: to.type === 'field' ? to.slot : undefined,
      out: isBenchSwap
        ? `OFF (${from.slot || 'Bench'}) #${pOut.number} ${pOut.name}`
        : `FROM (${from.slot || 'Field'}) #${pOut.number} ${pOut.name}`,
      inn: isBenchSwap
        ? `ON (${to.slot || 'Bench'}) #${pIn.number} ${pIn.name}`
        : `TO (${to.slot || 'Field'}) #${pIn.number} ${pIn.name}`,
      note: isBenchSwap ? 'Bench Interchange' : 'On-Field Position Swap',
      applied: false,
      status: 'scheduled',
      origin: 'planMode',
    };

    setPendingMoves((prev) => [...prev, newRot]);
    // Chain changes together: the destination player/slot automatically becomes the next source
    setSelectedSource({ type: to.type, id: to.id, slot: to.slot });
    setSelectedMoveId(newRot.id);
  };

  const handleRemovePendingMove = (rotId: string) => {
    setPendingMoves((prev) => prev.filter((r) => r.id !== rotId));
    if (selectedMoveId === rotId) setSelectedMoveId(null);
  };

  const handleRemoveSavedRotation = (rotId: string) => {
    onUpdateRotations(rotations.filter((r) => r.id !== rotId));
    if (selectedMoveId === rotId) setSelectedMoveId(null);
  };

  const handleDiscardPending = () => {
    setPendingMoves([]);
    setSelectedMoveId(null);
  };

  // Commits every staged substitute for this quarter into the shared
  // rotations list in one write, tagged with a stable sequence number for
  // the on-field numbered markers.
  const handleSaveChanges = () => {
    if (pendingMoves.length === 0) return;
    const existingMaxSeq = plannedMoves.reduce((max, r) => Math.max(max, r.planSeq || 0), 0);
    const toSave = pendingMoves.map((r, i) => ({ ...r, planSeq: existingMaxSeq + i + 1 }));
    onUpdateRotations([...rotations, ...toSave]);
    setPendingMoves([]);
    setSelectedMoveId(toSave[toSave.length - 1]?.id || null);
  };

  const handleClearQueue = () => {
    onUpdateRotations(rotations.filter((r) => r.quarter !== selectedQuarter));
    setPendingMoves([]);
    setSelectedMoveId(null);
  };

  // Applies only the currently SELECTED move to the live game lineup — not
  // every queued move — per-move, so the coach can apply one substitute at a
  // time as it actually happens on the field.
  const handleApplySelectedToGame = () => {
    const rot = [...plannedMoves, ...scheduledRotations].find((r) => r.id === selectedMoveId);
    if (!rot) return;

    const nextLineup = { ...lineup };
    const outSlot = Object.keys(lineup).find((k) => lineup[k] === rot.outId);
    const inSlot = Object.keys(lineup).find((k) => lineup[k] === rot.inId);

    if (outSlot && inSlot) {
      nextLineup[outSlot] = rot.inId;
      nextLineup[inSlot] = rot.outId;
    } else if (outSlot) {
      nextLineup[outSlot] = rot.inId;
    }

    onUpdateLineup(nextLineup);
    onUpdateRotations(
      rotations.map((r) => (r.id === rot.id ? { ...r, applied: true, status: 'applied' } : r))
    );
    setSelectedMoveId(null);
  };

  // ---------------------------------------------------------------------
  // Quarter Clock — a self-contained timer for reference while planning.
  // Runs entirely locally (setInterval), so it needs no connectivity.
  // Note: this is independent from the live Game Day clock (that timer's
  // state lives on the Game Day screen itself) — it's here so a coach can
  // track quarter time without leaving Plan Mode.
  // ---------------------------------------------------------------------
  const QUARTER_LENGTH_SECONDS = 15 * 60;
  const [clockRunning, setClockRunning] = useState(false);
  const [clockRemaining, setClockRemaining] = useState(QUARTER_LENGTH_SECONDS);

  useEffect(() => {
    if (!clockRunning) return;
    const interval = setInterval(() => {
      setClockRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [clockRunning]);

  useEffect(() => {
    if (clockRemaining === 0) setClockRunning(false);
  }, [clockRemaining]);

  const resetClock = () => {
    setClockRunning(false);
    setClockRemaining(QUARTER_LENGTH_SECONDS);
  };

  // Stable display numbers for the on-field substitute badges: saved moves
  // first (in save order), then any still-pending ones — so every
  // substitute built in Plan Mode has a unique, consistent ①②③ marker.
  const orderedPlanMoves = [...plannedMoves].sort((a, b) => (a.planSeq || 0) - (b.planSeq || 0));
  const allDisplayedPlanMoves = [...orderedPlanMoves, ...pendingMoves];
  const planMoveNumberByPlayer: Record<string, number> = {};
  const planMoveNumberByRotId: Record<string, number> = {};
  allDisplayedPlanMoves.forEach((r, idx) => {
    const n = idx + 1;
    planMoveNumberByPlayer[r.outId] = n;
    planMoveNumberByPlayer[r.inId] = n;
    planMoveNumberByRotId[r.id] = n;
  });

  return (
    <div className="fixed inset-0 bg-[#f3f4f6] z-50 overflow-hidden flex flex-col font-sans select-none text-slate-900">
      
      {/* Sleek Top Bar */}
      <div className="bg-white border-b border-slate-200 px-3 py-2 flex flex-col sm:flex-row items-center justify-between shrink-0 shadow-xs gap-2">
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-start">
          <button
            onClick={() => {
              if (onNavigateToGameDay) {
                onNavigateToGameDay();
              }
              onClose();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-700" />
            <span>Back to Game Day</span>
          </button>

          <div className="text-slate-600 text-xs font-bold flex items-center gap-1.5 overflow-x-auto">
            <span className="px-2 py-0.5 rounded-full bg-slate-900 text-amber-400 font-black text-[10px] border border-slate-700 shrink-0">
              {teamName}
            </span>
            <span className="text-slate-300">•</span>
            <span className="shrink-0 font-black text-slate-900">Q{selectedQuarter} Plan</span>
          </div>
        </div>

        {/* Quarter Clock */}
        <div
          className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-md shrink-0 border border-slate-700"
          title="Local reference clock for planning — independent from the live Game Day match clock"
        >
          <Clock className={`w-3.5 h-3.5 ${clockRunning ? 'text-emerald-400 animate-pulse' : 'text-[var(--cyan)]'}`} />
          <span className="font-mono font-black text-sm text-white tabular-nums">
            {formatTime(clockRemaining)}
          </span>
          <button
            onClick={() => setClockRunning(!clockRunning)}
            className={`p-1 rounded transition cursor-pointer ${
              clockRunning ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
            title={clockRunning ? 'Pause quarter clock' : 'Start quarter clock'}
          >
            {clockRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
          <button
            onClick={resetClock}
            className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 transition cursor-pointer"
            title="Reset quarter clock"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Quarter Selector & 3-Way Generator */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => setShowThreeWayModal(true)}
            className="px-2.5 py-1 text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-md transition cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>3-Way Generator</span>
          </button>

          <div className="flex bg-slate-100 p-0.5 rounded-md gap-1 shrink-0">
            {[1, 2, 3, 4].map((q) => (
              <button
                key={q}
                onClick={() => setSelectedQuarter(q)}
                className={`px-2 py-0.5 text-xs font-extrabold rounded transition cursor-pointer ${
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

      {/* Mobile Subheader Tab Switcher (Visible only on mobile screens < md) */}
      <div className="flex md:hidden bg-slate-900 text-white border-b border-slate-800 p-1.5 gap-1 shrink-0">
        <button
          onClick={() => setMobileTab('bench')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'bench' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:bg-white/10'
          }`}
        >
          <span>Bench</span>
          <span className="px-1.5 py-0.2 bg-black/20 rounded-full text-[10px]">{benchPlayers.length}</span>
        </button>

        <button
          onClick={() => setMobileTab('pitch')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'pitch' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:bg-white/10'
          }`}
        >
          <span>Field Pitch</span>
        </button>

        <button
          onClick={() => setMobileTab('queue')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'queue' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:bg-white/10'
          }`}
        >
          <span>Queue</span>
          <span className="px-1.5 py-0.2 bg-black/20 rounded-full text-[10px]">{qRotations.length}</span>
        </button>
      </div>

      {/* Main Workspace Layout (Grid on md+, tab-switched on mobile) */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden bg-[#f3f4f6]">

        {/* LEFT COLUMN: BENCH PLAYERS PANEL */}
        <div className={`col-span-12 md:col-span-3 lg:col-span-3 border-r border-slate-200 bg-[#f8fafc] flex flex-col overflow-hidden ${
          mobileTab === 'bench' ? 'flex' : 'hidden md:flex'
        }`}>
          {/* Create a Substitute panel */}
          <div className="p-3 border-b border-slate-200 bg-white shrink-0 space-y-2">
            <button
              onClick={() => setSubstituteMode(!substituteMode)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-black text-xs transition cursor-pointer border ${
                substituteMode
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                <span>Create a Substitute</span>
              </span>
              {substituteMode && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>

            {substituteMode && (
              <p className="text-[10.5px] text-slate-500 font-semibold leading-snug">
                {!selectedSource
                  ? 'Tap a player on the field to start a substitute.'
                  : 'Now tap the 2nd player — pick a bench player to swap them off, or another field player for an infield change.'}
                {' '}Build as many as you like, then hit <b>Save Changes</b> below.
              </p>
            )}

            {pendingMoves.length > 0 && (
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                <span className="text-[10px] font-black text-amber-800">
                  {pendingMoves.length} pending — not saved yet
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleSaveChanges}
                    className="px-2 py-1 text-[10px] font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition cursor-pointer flex items-center gap-1"
                  >
                    <Save className="w-3 h-3" />
                    Save Changes
                  </button>
                  <button
                    onClick={handleDiscardPending}
                    className="px-2 py-1 text-[10px] font-black bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-md transition cursor-pointer"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}
          </div>

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
        <div className={`col-span-12 md:col-span-6 relative flex flex-col items-center justify-center p-2 sm:p-3 overflow-hidden bg-[#f3f4f6] ${
          mobileTab === 'pitch' ? 'flex' : 'hidden md:flex'
        }`}>
          
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

            {/* AFL Goal Posts & Markings - Bottom End (Defenders) */}
            <div className="goal-line-bottom" id="afl-goal-line-bottom"></div>
            <div className="goal-square-bottom" id="afl-goal-square-bottom"></div>
            <div className="goal-post behind bottom-left-behind" id="afl-goal-post-bottom-1"></div>
            <div className="goal-post main bottom-left-main" id="afl-goal-post-bottom-2"></div>
            <div className="goal-post main bottom-right-main" id="afl-goal-post-bottom-3"></div>
            <div className="goal-post behind bottom-right-behind" id="afl-goal-post-bottom-4"></div>

            {/* Left Direction of Play / Attacking Arrow Indicator */}
            <div className="absolute left-2.5 top-6 bottom-6 z-20 pointer-events-none flex flex-col items-center justify-center gap-1 select-none">
              <div className="flex flex-col items-center bg-black/65 backdrop-blur-xs border border-emerald-400/40 rounded-full px-1.5 py-2.5 text-emerald-300 shadow-lg">
                <ArrowUp className="w-4 h-4 stroke-[3] text-emerald-400 animate-pulse" />
                <div className="w-0.5 h-10 bg-gradient-to-t from-emerald-500/20 via-emerald-400/80 to-emerald-300 rounded-full my-1"></div>
                <span className="text-[7px] font-black uppercase tracking-widest text-emerald-300 [writing-mode:vertical-lr] rotate-180">
                  ATTACK
                </span>
              </div>
            </div>

            {/* CONNECTING ARROWS — renders all chained pending moves simultaneously, plus any selected planned move */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-30" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <marker id="afl-arrow-dark" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="4.5" markerHeight="4.5" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
                  <path d="M 1.5 1.5 L 8 5 L 1.5 8.5" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                </marker>
                <marker id="afl-arrow-amber" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="4.5" markerHeight="4.5" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
                  <path d="M 1.5 1.5 L 8 5 L 1.5 8.5" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                </marker>
              </defs>

              {(() => {
                // Combine all pending moves and optionally a selected move from saved/scheduled
                const movesToDraw = [...pendingMoves];
                if (selectedMoveId) {
                  const selRot = [...plannedMoves, ...scheduledRotations].find((r) => r.id === selectedMoveId);
                  if (selRot && !movesToDraw.some((m) => m.id === selRot.id)) {
                    movesToDraw.push(selRot);
                  }
                }

                if (movesToDraw.length === 0) return null;

                return movesToDraw.map((rot) => {
                  const isPending = pendingMoves.some((r) => r.id === rot.id);
                  const isSelected = selectedMoveId === rot.id;
                  const moveSeq = planMoveNumberByRotId[rot.id];

                  const outSlot = rot.outSlot || Object.keys(lineup).find((k) => lineup[k] === rot.outId);
                  const inSlot = rot.inSlot || Object.keys(lineup).find((k) => lineup[k] === rot.inId);

                  const outPosConfig = outSlot ? POSITIONS.find(([sn]) => sn === outSlot) : null;
                  const inPosConfig = inSlot ? POSITIONS.find(([sn]) => sn === inSlot) : null;

                  let x1 = outPosConfig ? outPosConfig[2] : 5;
                  let y1 = outPosConfig ? outPosConfig[3] : 50;
                  let x2 = inPosConfig ? inPosConfig[2] : 50;
                  let y2 = inPosConfig ? inPosConfig[3] : 50;

                  if (outPosConfig && !inPosConfig) {
                    x2 = 5;
                    y2 = y1;
                  } else if (!outPosConfig && inPosConfig) {
                    x1 = 5;
                    y1 = y2;
                  } else if (!outPosConfig && !inPosConfig) {
                    return null;
                  }

                  const mx = (x1 + x2) / 2;
                  const my = (y1 + y2) / 2;
                  const strokeColor = isPending ? '#d97706' : '#0f172a';
                  const markerId = isPending ? 'url(#afl-arrow-amber)' : 'url(#afl-arrow-dark)';

                  return (
                    <g key={rot.id}>
                      <line
                        x1={`${x1}%`}
                        y1={`${y1}%`}
                        x2={`${x2}%`}
                        y2={`${y2}%`}
                        stroke={strokeColor}
                        strokeWidth={isSelected ? '2.8' : '2'}
                        strokeLinecap="round"
                        strokeDasharray="5,4"
                        vectorEffect="non-scaling-stroke"
                        markerEnd={markerId}
                        opacity={isSelected ? 1 : 0.85}
                      />
                      {moveSeq !== undefined && (
                        <g>
                          <circle
                            cx={`${mx}%`}
                            cy={`${my}%`}
                            r="2.2"
                            fill={isPending ? '#d97706' : '#0f172a'}
                            stroke="#ffffff"
                            strokeWidth="0.6"
                          />
                          <text
                            x={`${mx}%`}
                            y={`${my}%`}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="#ffffff"
                            fontSize="2.4"
                            fontWeight="900"
                          >
                            {moveSeq}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                });
              })()}
            </svg>



            {/* FIELD POSITIONS EXACTLY MATCHING GAMEDAY */}
            {POSITIONS.map(([slotName, label, x, y]) => {
              const pid = lineup[slotName];
              const p = pid ? players.find((x) => x.id === pid) : null;
              const energyPct = p ? getEnergyPct(p) : 100;
              const isSelected = selectedSource?.id === pid;
              const moveNum = pid ? planMoveNumberByPlayer[pid] : undefined;
              const isPendingMove = pid ? pendingMoves.some((r) => r.outId === pid || r.inId === pid) : false;
              const isScheduledOnly = pid ? (scheduledRotations.some((r) => r.outId === pid || r.inId === pid) && !moveNum) : false;

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
                      ? 'ring-4 ring-inset ring-slate-900 shadow-[0_0_10px_rgba(15,23,42,0.6)] z-40'
                      : isPendingMove
                        ? 'ring-2 ring-inset ring-amber-500 z-30'
                        : moveNum
                          ? 'ring-2 ring-inset ring-orange-500 z-30'
                          : isScheduledOnly
                            ? 'ring-2 ring-inset ring-slate-400 z-30'
                            : selectedSource
                              ? 'hover:ring-2 hover:ring-inset hover:ring-emerald-400 cursor-pointer'
                              : ''
                  }`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  {moveNum && (
                    <div
                      className={`absolute -top-1.5 -left-1.5 z-50 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-black text-white border-2 border-white shadow-md ${
                        isPendingMove ? 'bg-amber-500' : 'bg-orange-500'
                      }`}
                      title={isPendingMove ? `Pending substitute #${moveNum} — not yet saved` : `Planned move #${moveNum}`}
                    >
                      {moveNum}
                    </div>
                  )}
                  {p ? (
                    <div className={`relative overflow-hidden w-full h-full rounded-xl bg-white p-1 shadow-md border flex items-center gap-1.5 transition-all select-none ${
                      isSelected
                        ? 'border-2 border-slate-900 ring-2 ring-slate-900/30'
                        : isPendingMove
                          ? 'border-2 border-amber-500 ring-1 ring-amber-300'
                          : moveNum
                            ? 'border-2 border-orange-500 ring-1 ring-orange-300'
                            : isScheduledOnly
                              ? 'border-2 border-slate-400 ring-1 ring-slate-300'
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

        {/* RIGHT COLUMN: PENDING / PLANNED MOVES / SCHEDULED ROTATIONS */}
        <div className={`col-span-12 md:col-span-3 lg:col-span-3 border-l border-slate-200 bg-white text-slate-900 flex flex-col overflow-hidden ${
          mobileTab === 'queue' ? 'flex' : 'hidden md:flex'
        }`}>

          {/* Header Bar matching GameDay style */}
          <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xs tracking-wider text-orange-600">Moves</span>
              <span className="w-4 h-4 rounded-full bg-red-500 text-white font-black text-[10px] flex items-center justify-center">
                {qRotations.length + pendingMoves.length}
              </span>
            </div>

            <span className="text-[11px] font-black uppercase text-slate-900 tracking-wider italic">
              PLAN Q{selectedQuarter}
            </span>
          </div>

          {/* Move list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-white">
            {qRotations.length === 0 && pendingMoves.length === 0 && (
              <div className="text-center py-8 px-2 space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div className="font-extrabold text-xs text-slate-700">No Rotations Queued</div>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Use <b>Create a Substitute</b> on the left, or tap a player on the field, to start queuing a move for Quarter {selectedQuarter}.
                </p>
              </div>
            )}

            {/* PENDING — NOT SAVED */}
            {pendingMoves.length > 0 && (
              <MoveSection
                title="Pending — Not Saved"
                count={pendingMoves.length}
                accent="amber"
                onClearAll={handleDiscardPending}
                clearLabel="Discard All"
              >
                {pendingMoves.map((rot) => (
                  <MoveCard
                    key={rot.id}
                    rot={rot}
                    players={players}
                    seq={planMoveNumberByRotId[rot.id]}
                    accent="amber"
                    isSelected={selectedMoveId === rot.id}
                    onSelect={() => setSelectedMoveId(selectedMoveId === rot.id ? null : rot.id)}
                    onRemove={() => handleRemovePendingMove(rot.id)}
                  />
                ))}
              </MoveSection>
            )}

            {/* PLANNED MOVES — built & saved in Plan Mode */}
            {plannedMoves.length > 0 && (
              <MoveSection
                title="Planned Moves"
                count={plannedMoves.length}
                accent="orange"
              >
                {orderedPlanMoves.map((rot) => (
                  <MoveCard
                    key={rot.id}
                    rot={rot}
                    players={players}
                    seq={planMoveNumberByRotId[rot.id]}
                    accent="orange"
                    isSelected={selectedMoveId === rot.id}
                    isApplied={rot.applied}
                    onSelect={() => setSelectedMoveId(selectedMoveId === rot.id ? null : rot.id)}
                    onRemove={() => handleRemoveSavedRotation(rot.id)}
                  />
                ))}
              </MoveSection>
            )}

            {/* SCHEDULED ROTATIONS — pre-built in the Rotations screen form */}
            {scheduledRotations.length > 0 && (
              <MoveSection
                title="Scheduled Rotations"
                count={scheduledRotations.length}
                accent="slate"
                icon={<Calendar className="w-3.5 h-3.5 text-slate-500" />}
              >
                {scheduledRotations.map((rot) => (
                  <MoveCard
                    key={rot.id}
                    rot={rot}
                    players={players}
                    accent="slate"
                    isSelected={selectedMoveId === rot.id}
                    isApplied={rot.applied}
                    onSelect={() => setSelectedMoveId(selectedMoveId === rot.id ? null : rot.id)}
                    onRemove={() => handleRemoveSavedRotation(rot.id)}
                  />
                ))}
              </MoveSection>
            )}
          </div>

          {/* Action Footer Buttons */}
          <div className="p-3 border-t border-slate-200 bg-white grid grid-cols-2 gap-2 shrink-0">
            <button
              onClick={handleClearQueue}
              className="py-2 px-3 font-extrabold text-[11px] rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition cursor-pointer uppercase tracking-wider text-center"
            >
              CLEAR ALL
            </button>
            <button
              onClick={handleApplySelectedToGame}
              disabled={!selectedMoveId || pendingMoves.some((r) => r.id === selectedMoveId)}
              title={
                !selectedMoveId
                  ? 'Select a planned or scheduled move first'
                  : pendingMoves.some((r) => r.id === selectedMoveId)
                    ? 'Save this move before applying it to the game'
                    : 'Apply this move to the live lineup'
              }
              className={`py-2 px-3 font-extrabold text-[11px] rounded-lg border transition uppercase tracking-wider text-center ${
                selectedMoveId && !pendingMoves.some((r) => r.id === selectedMoveId)
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

// ---------------------------------------------------------------------------
// Small presentational helpers for the right-hand column's 3 move sections
// (Pending, Planned Moves, Scheduled Rotations).
// ---------------------------------------------------------------------------

function MoveSection({
  title,
  count,
  accent,
  icon,
  children,
  onClearAll,
  clearLabel,
}: {
  title: string;
  count: number;
  accent: 'amber' | 'orange' | 'slate';
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClearAll?: () => void;
  clearLabel?: string;
}) {
  const badgeClasses = {
    amber: 'border-amber-500/80 text-amber-700',
    orange: 'border-orange-500/80 text-slate-900',
    slate: 'border-slate-400/80 text-slate-600',
  }[accent];

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full border-2 font-extrabold text-xs flex items-center justify-center ${badgeClasses}`}>
            {count}
          </div>
          <div className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
            {icon}
            <span>{title}</span>
          </div>
        </div>
        {onClearAll && (
          <button
            onClick={onClearAll}
            className="text-[10px] font-bold text-red-600 hover:text-red-700 transition cursor-pointer"
          >
            {clearLabel || 'Clear All'}
          </button>
        )}
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function MoveCard({
  rot,
  players,
  seq,
  accent,
  isSelected,
  isApplied,
  onSelect,
  onRemove,
}: {
  rot: Rotation;
  players: Player[];
  seq?: number;
  accent: 'amber' | 'orange' | 'slate';
  isSelected: boolean;
  isApplied?: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const pOut = players.find((p) => p.id === rot.outId);
  const pIn = players.find((p) => p.id === rot.inId);
  const isBench = rot.type === 'bench' ||
                  rot.out.toUpperCase().startsWith('OFF') ||
                  rot.inn.toUpperCase().startsWith('ON') ||
                  rot.out.toLowerCase().includes('bench') ||
                  rot.inn.toLowerCase().includes('bench');

  const getCleanPosLabel = (str: string) => {
    return str.replace(/^(OFF|ON|FROM|TO|Pos A|Pos B)\s*/i, '').replace(/^\(([^\)]+)\)/, '$1').trim().split(' ')[0] || 'Field';
  };

  const ringClass = isSelected
    ? accent === 'amber'
      ? 'border-amber-600 ring-2 ring-amber-300 bg-amber-50/60'
      : accent === 'orange'
        ? 'border-orange-600 ring-2 ring-orange-300 bg-orange-50/60'
        : 'border-slate-600 ring-2 ring-slate-300 bg-slate-100'
    : 'border-slate-200 bg-slate-50/80 hover:bg-slate-50';

  const badgeBg = accent === 'amber' ? 'bg-amber-500' : accent === 'orange' ? 'bg-orange-500' : 'bg-slate-400';

  return (
    <div
      onClick={onSelect}
      className={`p-2.5 rounded-xl border transition flex items-center gap-2 text-xs cursor-pointer ${ringClass}`}
      title={isSelected ? 'Selected — showing this move\'s arrow on the field' : 'Tap to see this move\'s path on the field'}
    >
      {seq !== undefined && (
        <div className={`shrink-0 w-5 h-5 rounded-full text-white font-black text-[10px] flex items-center justify-center ${badgeBg}`}>
          {seq}
        </div>
      )}
      <div className="space-y-1.5 min-w-0 flex-1">
        {pOut && (
          <div className="flex items-center gap-1.5 font-extrabold text-slate-900 truncate">
            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${
              isBench ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
            }`}>
              {isBench ? 'OFF' : 'FROM'}
            </span>
            <span className={`text-[11px] font-black ${isBench ? 'text-red-600' : 'text-blue-600'}`}>#{pOut.number}</span>
            <span className="truncate">{pOut.name}</span>
            <span className="text-[9px] text-slate-500 font-semibold uppercase">({getCleanPosLabel(rot.out)})</span>
          </div>
        )}

        {pIn && (
          <div className="flex items-center gap-1.5 font-extrabold text-slate-900 truncate">
            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${
              isBench ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-purple-100 text-purple-700 border border-purple-200'
            }`}>
              {isBench ? 'ON' : 'TO'}
            </span>
            <span className={`text-[11px] font-black ${isBench ? 'text-emerald-600' : 'text-purple-600'}`}>#{pIn.number}</span>
            <span className="truncate">{pIn.name}</span>
            <span className="text-[9px] text-slate-500 font-semibold uppercase">({getCleanPosLabel(rot.inn)})</span>
          </div>
        )}

        {isApplied && (
          <span className="inline-block text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
            ✓ Applied to game
          </span>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition shrink-0 cursor-pointer"
        title="Remove"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

