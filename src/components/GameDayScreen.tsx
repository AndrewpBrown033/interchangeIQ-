import React, { useState, useEffect, useRef } from 'react';
import { Player, Score, GameInfo, Rotation, Plan } from '../types';
import { POSITIONS, POSITION_GROUPS, POSITION_FULL_NAMES, normalizePosition } from '../constants';
import LineupPhotoImport from './LineupPhotoImport';
import PlanModeView from './PlanModeView';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Minus,
  Camera,
  Layers,
  ChevronRight,
  UserCheck,
  UserX,
  AlertCircle,
  Clock,
  Shield,
  Trophy,
  ArrowRightLeft,
  CheckCircle2,
  X,
  Sparkles,
  Save,
  FileSpreadsheet,
  Zap,
  Volume2,
  VolumeX,
  Smartphone
} from 'lucide-react';

export interface GameDayScreenProps {
  players: Player[];
  onUpdatePlayers: (players: Player[]) => void;
  lineup: Record<string, string>; // slotName -> playerId
  onUpdateLineup: (lineup: Record<string, string>) => void;
  score: Score;
  onUpdateScore: (score: Score) => void;
  gameInfo: GameInfo;
  onUpdateGameInfo: (gameInfo: GameInfo) => void;
  rotations: Rotation[];
  onUpdateRotations: (rotations: Rotation[]) => void;
  plans: Plan[];
  onUpdatePlans: (plans: Plan[]) => void;
  activePlanIds?: string[];
  onTogglePlanRunning?: (planId: string) => void;
  onCompleteGame: () => void;
  onSaveGameToHistory?: () => void;
  onOpenLoadLineup: () => void;
  onOpenNewGame: () => void;
  onSaveLineup: () => void;
  onSelectPlayerId: (id: string) => void;
  onNavigate: (tab: string) => void;
  soundEnabled?: boolean;
  soundVolume?: number;
  soundTone?: string;
  hapticEnabled?: boolean;
  hapticPattern?: string;
}

export default function GameDayScreen({
  players,
  onUpdatePlayers,
  lineup,
  onUpdateLineup,
  score,
  onUpdateScore,
  gameInfo,
  onUpdateGameInfo,
  rotations,
  onUpdateRotations,
  plans,
  onUpdatePlans,
  activePlanIds = [],
  onTogglePlanRunning,
  onCompleteGame,
  onOpenLoadLineup,
  onOpenNewGame,
  onSaveLineup,
  onSelectPlayerId,
  onNavigate,
  soundEnabled = true,
  soundVolume = 80,
  soundTone = 'chime',
  hapticEnabled = true
}: GameDayScreenProps) {
  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Modals & Overlays
  const [showScanLineup, setShowScanLineup] = useState(false);
  const [showPlanMode, setShowPlanMode] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedBenchPlayerId, setSelectedBenchPlayerId] = useState<string | null>(null);
  const [swapSourceSlot, setSwapSourceSlot] = useState<string | null>(null);
  const [showEndGameModal, setShowEndGameModal] = useState(false);

  // Sound feedback helper
  const playSoundEffect = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = soundTone === 'beep' ? 'square' : 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime((soundVolume / 100) * 0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // Audio context error fallback
    }
  };

  const triggerHaptic = () => {
    if (hapticEnabled && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  };

  // Timer loop for active / bench seconds tracking
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);

        // Update player active / bench time
        const activeIds = new Set(Object.values(lineup).filter(Boolean));
        onUpdatePlayers(
          players.map((p) => {
            if (p.status !== 'available') return p;
            if (activeIds.has(p.id)) {
              return { ...p, active: (p.active || 0) + 1 };
            } else {
              return { ...p, bench: (p.bench || 0) + 1 };
            }
          })
        );
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, lineup, players, onUpdatePlayers]);

  // Check scheduled rotations that trigger at current minute
  const currentMinute = Math.floor(seconds / 60);
  const dueRotations = rotations.filter(
    (r) => !r.applied && r.quarter === score.quarter && r.minute <= currentMinute
  );

  const handleApplyRotation = (rotation: Rotation) => {
    playSoundEffect();
    triggerHaptic();

    // Perform swap in lineup
    let newLineup = { ...lineup };
    let foundSlot = '';
    for (const [slot, pId] of Object.entries(newLineup)) {
      if (pId === rotation.outId) {
        foundSlot = slot;
        break;
      }
    }

    if (foundSlot) {
      newLineup[foundSlot] = rotation.inId;
      onUpdateLineup(newLineup);
    }

    // Mark rotation as applied
    onUpdateRotations(
      rotations.map((r) => (r.id === rotation.id ? { ...r, applied: true, status: 'applied' } : r))
    );
  };

  // Score handlers
  const handleScoreChange = (
    team: 'home' | 'away',
    type: 'goals' | 'behinds',
    delta: number
  ) => {
    const currentQtr = score.quarter;
    const qIndex = currentQtr - 1;

    const updatedHome = { ...score.home };
    const updatedAway = { ...score.away };

    const targetTeam = team === 'home' ? updatedHome : updatedAway;
    targetTeam[type] = Math.max(0, targetTeam[type] + delta);

    // Update current quarter score
    const newQuarters = [...targetTeam.quarters];
    if (!newQuarters[qIndex]) {
      newQuarters[qIndex] = { g: 0, b: 0 };
    }
    const qVal = type === 'goals' ? 'g' : 'b';
    newQuarters[qIndex] = {
      ...newQuarters[qIndex],
      [qVal]: Math.max(0, newQuarters[qIndex][qVal] + delta)
    };
    targetTeam.quarters = newQuarters;

    onUpdateScore({
      ...score,
      home: updatedHome,
      away: updatedAway
    });
  };

  // Slot player assignment or swap
  const handleSlotClick = (slotCode: string) => {
    if (swapSourceSlot) {
      if (swapSourceSlot === slotCode) {
        setSwapSourceSlot(null);
      } else {
        // Swap players between two slots
        const newLineup = { ...lineup };
        const p1 = newLineup[swapSourceSlot] || '';
        const p2 = newLineup[slotCode] || '';
        newLineup[swapSourceSlot] = p2;
        newLineup[slotCode] = p1;
        onUpdateLineup(newLineup);
        setSwapSourceSlot(null);
      }
    } else if (selectedBenchPlayerId) {
      // Put selected bench player into this slot
      const newLineup = { ...lineup };
      newLineup[slotCode] = selectedBenchPlayerId;
      onUpdateLineup(newLineup);
      setSelectedBenchPlayerId(null);
    } else {
      setSelectedSlot(slotCode);
    }
  };

  const handleAssignPlayerToSlot = (playerId: string) => {
    if (!selectedSlot) return;
    const newLineup = { ...lineup };
    // Remove player from any other slot first
    for (const [s, pid] of Object.entries(newLineup)) {
      if (pid === playerId) {
        delete newLineup[s];
      }
    }
    newLineup[selectedSlot] = playerId;
    onUpdateLineup(newLineup);
    setSelectedSlot(null);
  };

  const handleClearSlot = (slotCode: string) => {
    const newLineup = { ...lineup };
    delete newLineup[slotCode];
    onUpdateLineup(newLineup);
  };

  const handleBenchPlayerClick = (playerId: string) => {
    if (selectedBenchPlayerId === playerId) {
      setSelectedBenchPlayerId(null);
    } else {
      setSelectedBenchPlayerId(playerId);
      setSwapSourceSlot(null);
    }
  };

  // Find players currently on field
  const activePlayerIds = new Set(Object.values(lineup).filter(Boolean));
  const benchPlayers = players.filter(
    (p) => p.status === 'available' && !activePlayerIds.has(p.id)
  );

  // Total points calculation
  const homeTotal = score.home.goals * 6 + score.home.behinds;
  const awayTotal = score.away.goals * 6 + score.away.behinds;

  // Format timer
  const formatTime = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Modals */}
      {showScanLineup && (
        <LineupPhotoImport
          players={players}
          onUpdatePlayers={onUpdatePlayers}
          onUpdateLineup={onUpdateLineup}
          onClose={() => setShowScanLineup(false)}
        />
      )}

      {showPlanMode && (
        <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto">
          <PlanModeView
            onClose={() => setShowPlanMode(false)}
            players={players}
            onUpdatePlayers={onUpdatePlayers}
            lineup={lineup}
            onUpdateLineup={onUpdateLineup}
            rotations={rotations}
            onUpdateRotations={onUpdateRotations}
            plans={plans}
            onUpdatePlans={onUpdatePlans}
            currentQuarter={score.quarter}
            activePlanIds={activePlanIds}
            onTogglePlanRunning={onTogglePlanRunning}
          />
        </div>
      )}

      {/* Top Header / Scoreboard Bar */}
      <header className="bg-slate-900 border-b border-slate-800 p-3 sm:p-4 sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Match Info & Score Controls */}
          <div className="flex flex-wrap items-center justify-between w-full md:w-auto gap-4">
            
            {/* Team vs Opponent Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-extrabold text-lg">
                Q{score.quarter}
              </div>
              <div>
                <h1 className="text-lg font-bold text-white leading-snug">
                  {gameInfo.team || 'My Team'} <span className="text-slate-400 text-sm font-normal">vs</span> {gameInfo.opponent || 'Opponent'}
                </h1>
                <p className="text-xs text-slate-400">
                  Round {gameInfo.round || '1'} • {gameInfo.date || new Date().toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Live Timer Control */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="font-mono text-xl font-bold text-emerald-400 w-16 text-center">
                {formatTime(seconds)}
              </span>
              <button
                onClick={() => setTimerRunning(!timerRunning)}
                className={`p-1.5 rounded-md transition-colors ${
                  timerRunning
                    ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                }`}
                title={timerRunning ? 'Pause Timer' : 'Start Timer'}
              >
                {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  setTimerRunning(false);
                  setSeconds(0);
                }}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                title="Reset Timer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Live Score Counter */}
          <div className="flex items-center gap-6 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 w-full md:w-auto justify-around">
            {/* Home Score */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-xs uppercase text-slate-400 font-semibold block">Home</span>
                <span className="text-xl font-bold text-white">
                  {score.home.goals}.{score.home.behinds} <span className="text-emerald-400">({homeTotal})</span>
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleScoreChange('home', 'goals', 1)}
                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold"
                >
                  +6 G
                </button>
                <button
                  onClick={() => handleScoreChange('home', 'behinds', 1)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-bold"
                >
                  +1 B
                </button>
              </div>
            </div>

            <div className="text-slate-600 font-extrabold text-sm">VS</div>

            {/* Away Score */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleScoreChange('away', 'goals', 1)}
                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold"
                >
                  +6 G
                </button>
                <button
                  onClick={() => handleScoreChange('away', 'behinds', 1)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-bold"
                >
                  +1 B
                </button>
              </div>
              <div className="text-left">
                <span className="text-xs uppercase text-slate-400 font-semibold block">Away</span>
                <span className="text-xl font-bold text-white">
                  {score.away.goals}.{score.away.behinds} <span className="text-emerald-400">({awayTotal})</span>
                </span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => setShowScanLineup(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md hover:shadow-indigo-500/20"
            >
              <Camera className="w-4 h-4" />
              Scan Team Sheet
            </button>

            <button
              onClick={() => setShowPlanMode(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-all"
            >
              <Layers className="w-4 h-4 text-emerald-400" />
              Plan Rotations
            </button>

            <button
              onClick={onOpenLoadLineup}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
            >
              Load
            </button>

            <button
              onClick={onSaveLineup}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
            >
              Save
            </button>

            <button
              onClick={onCompleteGame}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md"
            >
              End Match
            </button>
          </div>

        </div>
      </header>

      {/* Due Rotation Alert Banner */}
      {dueRotations.length > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
              <AlertCircle className="w-5 h-5 animate-bounce" />
              <span>{dueRotations.length} scheduled rotation(s) due now!</span>
            </div>
            <div className="flex items-center gap-2">
              {dueRotations.map((rot) => (
                <button
                  key={rot.id}
                  onClick={() => handleApplyRotation(rot)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-md shadow transition-all"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Apply: {rot.out} ➔ {rot.inn}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area: Field + Bench & Rotations */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* AFL Field Visualizer (8 cols) */}
        <section className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              On-Field Lineup ({activePlayerIds.size} / 18)
            </h2>
            {swapSourceSlot && (
              <span className="text-xs text-amber-400 font-medium bg-amber-400/10 px-2.5 py-1 rounded border border-amber-400/20">
                Click another slot to swap position with {swapSourceSlot}
              </span>
            )}
            {selectedBenchPlayerId && (
              <span className="text-xs text-indigo-400 font-medium bg-indigo-400/10 px-2.5 py-1 rounded border border-indigo-400/20">
                Click any slot to sub on player
              </span>
            )}
          </div>

          {/* Ground Graphic Overlay */}
          <div className="relative w-full aspect-[3/4] sm:aspect-[4/3] bg-emerald-950/60 rounded-3xl border-2 border-emerald-500/30 p-4 sm:p-6 overflow-hidden shadow-2xl flex flex-col justify-between backdrop-blur-sm">
            
            {/* Field Lines */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
              {/* Center Circle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-2 border-white" />
              {/* Center Square */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white" />
              {/* 50m Arcs */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-b-full border-2 border-white" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-t-full border-2 border-white" />
            </div>

            {/* Position Cards Grid overlayed on field coordinates */}
            <div className="relative z-10 w-full h-full grid grid-cols-3 grid-rows-6 gap-2 sm:gap-3">
              {POSITIONS.map(([slotCode, label]) => {
                const playerId = lineup[slotCode];
                const player = players.find((p) => p.id === playerId);
                const isSwapSource = swapSourceSlot === slotCode;

                return (
                  <div
                    key={slotCode}
                    onClick={() => handleSlotClick(slotCode)}
                    className={`relative rounded-xl p-2 sm:p-2.5 flex flex-col justify-between transition-all cursor-pointer border ${
                      isSwapSource
                        ? 'bg-amber-500/30 border-amber-400 ring-2 ring-amber-400'
                        : player
                        ? 'bg-slate-900/90 border-slate-700/80 hover:border-emerald-500/50 hover:bg-slate-900'
                        : 'bg-slate-950/40 border-dashed border-slate-800 hover:border-slate-600 hover:bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full text-[10px] sm:text-xs font-mono">
                      <span className="font-extrabold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/50">
                        {slotCode}
                      </span>
                      {player && (
                        <span className="text-slate-400 font-medium">
                          #{player.number}
                        </span>
                      )}
                    </div>

                    <div className="my-1 text-center">
                      {player ? (
                        <div>
                          <div className="font-bold text-white text-xs sm:text-sm truncate">
                            {player.nick || player.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {Math.round((player.active || 0) / 60)}m active
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] sm:text-xs text-slate-500 font-medium italic">
                          Empty
                        </div>
                      )}
                    </div>

                    {/* Quick Slot Actions */}
                    <div className="flex items-center justify-end gap-1 opacity-80 hover:opacity-100">
                      {player && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSwapSourceSlot(slotCode);
                          }}
                          className="p-1 hover:text-amber-400 text-slate-400 transition-colors"
                          title="Swap position"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                        </button>
                      )}
                      {player && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClearSlot(slotCode);
                          }}
                          className="p-1 hover:text-rose-400 text-slate-400 transition-colors"
                          title="Remove from slot"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Bench & Rotation Sidebar (4 cols) */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Interchange Bench */}
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex flex-col gap-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                Interchange Bench ({benchPlayers.length})
              </h3>
              {selectedBenchPlayerId && (
                <button
                  onClick={() => setSelectedBenchPlayerId(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Clear selection
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
              {benchPlayers.length === 0 ? (
                <div className="text-xs text-slate-500 italic p-3 text-center border border-dashed border-slate-800 rounded-lg">
                  No players currently on bench.
                </div>
              ) : (
                benchPlayers.map((p) => {
                  const isSelected = selectedBenchPlayerId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleBenchPlayerClick(p.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center">
                          #{p.number || '?'}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">
                            {p.name} {p.nick ? `(${p.nick})` : ''}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {Math.round((p.bench || 0) / 60)}m bench • {Math.round((p.active || 0) / 60)}m active
                          </div>
                        </div>
                      </div>

                      <div className="text-xs font-semibold text-indigo-400">
                        {isSelected ? 'Selected' : 'Sub On'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Rotation Schedule Quick Feed */}
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex flex-col gap-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                Scheduled Rotations (Q{score.quarter})
              </h3>
              <button
                onClick={() => setShowPlanMode(true)}
                className="text-xs text-emerald-400 hover:underline font-medium"
              >
                Manage
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
              {rotations.filter((r) => r.quarter === score.quarter).length === 0 ? (
                <div className="text-xs text-slate-500 italic p-3 text-center border border-dashed border-slate-800 rounded-lg">
                  No rotations planned for Q{score.quarter}. Click "Plan Rotations" to set up a plan.
                </div>
              ) : (
                rotations
                  .filter((r) => r.quarter === score.quarter)
                  .map((r) => (
                    <div
                      key={r.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                        r.applied
                          ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-200">
                          Min {r.minute}m: <span className="text-rose-400">{r.out}</span> ➔ <span className="text-emerald-400">{r.inn}</span>
                        </div>
                        {r.note && <div className="text-[10px] text-slate-400">{r.note}</div>}
                      </div>

                      {r.applied ? (
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Done
                        </span>
                      ) : (
                        <button
                          onClick={() => handleApplyRotation(r)}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold"
                        >
                          Apply
                        </button>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>

        </section>
      </main>

      {/* Select Player for Slot Modal */}
      {selectedSlot && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Assign Player to {selectedSlot}
                </h3>
                <p className="text-xs text-slate-400">
                  {POSITION_FULL_NAMES[selectedSlot] || selectedSlot}
                </p>
              </div>
              <button
                onClick={() => setSelectedSlot(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
              {players
                .filter((p) => p.status === 'available')
                .map((p) => {
                  const currentSlot = Object.entries(lineup).find(([_, id]) => id === p.id)?.[0];
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleAssignPlayerToSlot(p.id)}
                      className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl flex items-center justify-between text-left transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded bg-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center">
                          #{p.number || '?'}
                        </span>
                        <div>
                          <div className="text-sm font-bold text-white">{p.name}</div>
                          {currentSlot && (
                            <div className="text-xs text-amber-400">Currently in {currentSlot}</div>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
