import React, { useState } from 'react';
import { Player, LineupTemplate, GameHistory, SkillAssessment } from '../types';
import { POSITION_GROUPS, POSITIONS, DEFAULT_PLAYERS, normalizePosition, getZoneForPosition, POSITION_FULL_NAMES } from '../constants';
import { evaluatePlayerPositionalRubric } from '../utils/aflPositionalRubric';
import { calculateInterchangeIQGrade } from '../utils/interchangeIQRubric';
import { 
  Plus, Edit3, Trash, ShieldCheck, UserMinus, UserCheck, AlertTriangle, 
  Check, X, Flame, Sparkles, Clock, Activity, RotateCcw, Landmark, 
  Users, Trophy, Shield, Layers, Play, ArrowRight, FileSpreadsheet, Download, ArrowUp,
  ArrowLeft, Search, ChevronLeft, ChevronRight, Eye, User, FileText, ChevronDown, ChevronUp,
  Award, Target, Zap, Dumbbell, Ruler, Sliders
} from 'lucide-react';
import CsvImportGuide from './CsvImportGuide';

interface TeamScreenProps {
  players: Player[];
  onUpdatePlayers: (players: Player[]) => void;
  selectedPlayerId: string | null;
  onSelectPlayerId: (id: string | null) => void;
  lineup: Record<string, string>;
  onUpdateLineup: (lineup: Record<string, string>) => void;
  savedLineups?: LineupTemplate[];
  history?: GameHistory[];
  growthRecords?: SkillAssessment[];
  onUpdateGrowthRecords?: (records: SkillAssessment[]) => void;
  teamName?: string;
  isInactive?: boolean;
  onNavigateTab?: (tab: string) => void;
}

export default function TeamScreen({
  players,
  onUpdatePlayers,
  selectedPlayerId,
  onSelectPlayerId,
  lineup,
  onUpdateLineup,
  savedLineups = [],
  history = [],
  growthRecords = [],
  onUpdateGrowthRecords,
  teamName,
  isInactive,
  onNavigateTab,
}: TeamScreenProps) {
  const [filterZone, setFilterZone] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'number' | 'name'>('number');
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [showGameDayHeatmap, setShowGameDayHeatmap] = useState(false);

  // Static Attributes Adjustment Modal State
  const [showAdjustAttributesModal, setShowAdjustAttributesModal] = useState(false);
  const [attrKickAcc, setAttrKickAcc] = useState(4);
  const [attrKickDist, setAttrKickDist] = useState(45);
  const [attrOppFoot, setAttrOppFoot] = useState(6);
  const [attrHandball, setAttrHandball] = useState(8);
  const [attrMarking, setAttrMarking] = useState(4);
  const [attrTackling, setAttrTackling] = useState(8);
  const [attrGameSense, setAttrGameSense] = useState(8);
  const [attrFitness, setAttrFitness] = useState(4);
  const [attrSpoiling, setAttrSpoiling] = useState(4);
  const [attrOverheadMarking, setAttrOverheadMarking] = useState(4);
  const [attrCrumbing, setAttrCrumbing] = useState(4);
  const [attrPressureActs, setAttrPressureActs] = useState(8);
  const [attrRuckTap, setAttrRuckTap] = useState(5);
  const [attrLeadingTiming, setAttrLeadingTiming] = useState(4);
  const [attrSnapGoal, setAttrSnapGoal] = useState(6);
  const [attrDefTransition, setAttrDefTransition] = useState(8);

  // Combine Test Snapshot Modal State
  const [showCombineModal, setShowCombineModal] = useState(false);
  const [combineSprint, setCombineSprint] = useState('3.15s');
  const [combineAgility, setCombineAgility] = useState('8.40s');
  const [combineVertical, setCombineVertical] = useState('55');
  const [combineTimeTrial, setCombineTimeTrial] = useState('08:15');
  const [combineYoyo, setCombineYoyo] = useState('16.5');

  // Player Form states
  const [formName, setFormName] = useState('');
  const [formNick, setFormNick] = useState('');
  const [formNumber, setFormNumber] = useState('');
  const [formPrimaryZone, setFormPrimaryZone] = useState('MID');
  const [formPositions, setFormPositions] = useState<string[]>([]);
  const [formStatus, setFormStatus] = useState<'available' | 'away' | 'injured' | 'other_team'>('available');
  const [formNote, setFormNote] = useState('');
  const [formHeightCm, setFormHeightCm] = useState<string>('0');
  const [formWeightKg, setFormWeightKg] = useState<string>('0');
  const [formPreferredFoot, setFormPreferredFoot] = useState<'Right' | 'Left' | 'Dual'>('Right');
  const [formGender, setFormGender] = useState<'Female' | 'Male'>('Female');
  const [formAgeGroup, setFormAgeGroup] = useState<'U10' | 'U12' | 'U14' | 'U16' | 'U18' | 'Seniors'>('U14');
  const [formError, setFormError] = useState('');

  // Sorting and filtering list
  const filtered = players
    .filter((p) => {
      if (filterZone !== 'All' && p.primaryZone !== filterZone) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = p.name.toLowerCase().includes(q);
        const nickMatch = (p.nick || '').toLowerCase().includes(q);
        const numMatch = p.number.includes(q);
        const posMatch = (p.positions || []).some((pos) => pos.toLowerCase().includes(q));
        return nameMatch || nickMatch || numMatch || posMatch;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'number') {
        return (parseInt(a.number, 10) || 999) - (parseInt(b.number, 10) || 999);
      }
      return a.name.localeCompare(b.name);
    });

  const activePlayer = selectedPlayerId ? players.find((p) => p.id === selectedPlayerId) || null : null;
  const activeIndex = activePlayer ? filtered.findIndex((p) => p.id === activePlayer.id) : -1;
  const prevPlayer = activeIndex > 0 ? filtered[activeIndex - 1] : null;
  const nextPlayer = activeIndex >= 0 && activeIndex < filtered.length - 1 ? filtered[activeIndex + 1] : null;

  // Derive active player growth assessment & physical/skill attributes
  const playerRecords = activePlayer
    ? growthRecords.filter((r) => r.playerId === activePlayer.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];
  const activePlayerLatestRecord = playerRecords[0] || null;

  const heightCm = activePlayer?.heightCm ?? 0;
  const weightKg = activePlayer?.weightKg ?? 0;
  const preferredFoot = activePlayer?.preferredFoot ?? 'Right';
  const gender = activePlayer?.gender ?? 'Female';
  const ageGroup = activePlayer?.ageGroup ?? 'U14';

  // Primary static player attributes (independent of snapshot combine tests)
  const kickAcc = activePlayer?.kickAccuracyRating ?? 4;
  const kickDist = activePlayer?.kickDistanceMeters ?? 45;
  const oppFoot = activePlayer?.oppositeFootRating ?? 6;
  const handball = activePlayer?.handballRating ?? 8;
  const marking = activePlayer?.markingRating ?? 4;
  const tackling = activePlayer?.tacklingRating ?? 8;
  const gameSense = activePlayer?.gameSenseRating ?? 8;
  const fitness = activePlayer?.fitnessRating ?? 4;

  const spoiling = activePlayer?.spoilingRating ?? 4;
  const overheadMarking = activePlayer?.overheadMarkingRating ?? 4;
  const crumbing = activePlayer?.crumbingRating ?? 4;
  const pressureActs = activePlayer?.pressureActsRating ?? 8;
  const ruckTap = activePlayer?.ruckTapRating ?? 5;
  const leadingTiming = activePlayer?.leadingTimingRating ?? 4;
  const snapGoal = activePlayer?.snapGoalRating ?? 6;
  const defTransition = activePlayer?.defensiveTransitionRating ?? 8;

  // Filter Combine test snapshot records specifically
  const combineRecords = playerRecords.filter(r => r.isCombineTest || r.assessmentType === 'Combine Test' || r.sprint20m || r.timeTrial2km);
  const latestCombineRecord = combineRecords[0] || null;

  const evaluations = activePlayer ? evaluatePlayerPositionalRubric(activePlayer, activePlayerLatestRecord) : [];
  const topChoice = evaluations.length > 0 ? evaluations[0] : null;

  // Handlers for adjusting static attributes
  const handleOpenAdjustAttributes = () => {
    if (!activePlayer) return;
    setAttrKickAcc(activePlayer.kickAccuracyRating ?? 4);
    setAttrKickDist(activePlayer.kickDistanceMeters ?? 45);
    setAttrOppFoot(activePlayer.oppositeFootRating ?? 6);
    setAttrHandball(activePlayer.handballRating ?? 8);
    setAttrMarking(activePlayer.markingRating ?? 4);
    setAttrTackling(activePlayer.tacklingRating ?? 8);
    setAttrGameSense(activePlayer.gameSenseRating ?? 8);
    setAttrFitness(activePlayer.fitnessRating ?? 4);
    setAttrSpoiling(activePlayer.spoilingRating ?? 4);
    setAttrOverheadMarking(activePlayer.overheadMarkingRating ?? 4);
    setAttrCrumbing(activePlayer.crumbingRating ?? 4);
    setAttrPressureActs(activePlayer.pressureActsRating ?? 8);
    setAttrRuckTap(activePlayer.ruckTapRating ?? 5);
    setAttrLeadingTiming(activePlayer.leadingTimingRating ?? 4);
    setAttrSnapGoal(activePlayer.snapGoalRating ?? 6);
    setAttrDefTransition(activePlayer.defensiveTransitionRating ?? 8);
    setShowAdjustAttributesModal(true);
  };

  const handleSaveAdjustAttributes = () => {
    if (!activePlayer) return;
    const updated = players.map(p => {
      if (p.id === activePlayer.id) {
        return {
          ...p,
          kickAccuracyRating: attrKickAcc,
          kickDistanceMeters: attrKickDist,
          oppositeFootRating: attrOppFoot,
          handballRating: attrHandball,
          markingRating: attrMarking,
          tacklingRating: attrTackling,
          gameSenseRating: attrGameSense,
          fitnessRating: attrFitness,
          spoilingRating: attrSpoiling,
          overheadMarkingRating: attrOverheadMarking,
          crumbingRating: attrCrumbing,
          pressureActsRating: attrPressureActs,
          ruckTapRating: attrRuckTap,
          leadingTimingRating: attrLeadingTiming,
          snapGoalRating: attrSnapGoal,
          defensiveTransitionRating: attrDefTransition,
        };
      }
      return p;
    });
    onUpdatePlayers(updated);
    setShowAdjustAttributesModal(false);
  };

  // Handlers for combine test snapshot loading/recording
  const handleLoadSampleCombine = () => {
    if (!activePlayer || !onUpdateGrowthRecords) return;
    const sampleCombine: SkillAssessment = {
      id: `combine-${Date.now()}`,
      playerId: activePlayer.id,
      date: new Date().toISOString().slice(0, 10),
      seasonLabel: 'AFL Combine Test Benchmark',
      isCombineTest: true,
      assessmentType: 'Combine Test',
      gender: activePlayer.gender || 'Female',
      ageGroup: activePlayer.ageGroup || 'U14',
      sprint20m: '3.12s',
      agilityTime: '8.38s',
      standingVerticalCm: 56,
      timeTrial2km: '08:12',
      yoyoLevel: '16.8',
      fitnessRating: activePlayer.fitnessRating || 4,
      preferredFoot: activePlayer.preferredFoot || 'Right',
      kickDistanceMeters: activePlayer.kickDistanceMeters || 35,
      kickAccuracyRating: activePlayer.kickAccuracyRating || 4,
      oppositeFootRating: activePlayer.oppositeFootRating || 6,
      handballRating: activePlayer.handballRating || 8,
      markingRating: activePlayer.markingRating || 4,
      tacklingRating: activePlayer.tacklingRating || 8,
      gameSenseRating: activePlayer.gameSenseRating || 8,
      developmentGoals: 'Point-in-time AFL Combine benchmark.',
      coachNotes: 'Loaded Combine snapshot test results. Note: Combine test results do not alter the player\'s static core attributes.'
    };
    onUpdateGrowthRecords([sampleCombine, ...growthRecords]);
  };

  const handleOpenCombineModal = () => {
    if (latestCombineRecord) {
      setCombineSprint(latestCombineRecord.sprint20m || '3.15s');
      setCombineAgility(latestCombineRecord.agilityTime || '8.40s');
      setCombineVertical(latestCombineRecord.standingVerticalCm ? String(latestCombineRecord.standingVerticalCm) : '55');
      setCombineTimeTrial(latestCombineRecord.timeTrial2km || '08:15');
      setCombineYoyo(latestCombineRecord.yoyoLevel || '16.5');
    }
    setShowCombineModal(true);
  };

  const handleSaveCombineSnapshot = () => {
    if (!activePlayer || !onUpdateGrowthRecords) return;
    const newCombine: SkillAssessment = {
      id: `combine-${Date.now()}`,
      playerId: activePlayer.id,
      date: new Date().toISOString().slice(0, 10),
      seasonLabel: 'Combine Snapshot Entry',
      isCombineTest: true,
      assessmentType: 'Combine Test',
      gender: activePlayer.gender || 'Female',
      ageGroup: activePlayer.ageGroup || 'U14',
      sprint20m: combineSprint.trim(),
      agilityTime: combineAgility.trim(),
      standingVerticalCm: Number(combineVertical) || 50,
      timeTrial2km: combineTimeTrial.trim(),
      yoyoLevel: combineYoyo.trim(),
      fitnessRating: activePlayer.fitnessRating || 4,
      preferredFoot: activePlayer.preferredFoot || 'Right',
      kickDistanceMeters: activePlayer.kickDistanceMeters || 35,
      kickAccuracyRating: activePlayer.kickAccuracyRating || 4,
      oppositeFootRating: activePlayer.oppositeFootRating || 6,
      handballRating: activePlayer.handballRating || 8,
      markingRating: activePlayer.markingRating || 4,
      tacklingRating: activePlayer.tacklingRating || 8,
      gameSenseRating: activePlayer.gameSenseRating || 8,
      developmentGoals: 'AFL Combine physical testing snapshot.',
      coachNotes: 'Snapshot combine metrics recorded. Does not influence static attributes.'
    };
    onUpdateGrowthRecords([newCombine, ...growthRecords]);
    setShowCombineModal(false);
  };

  const handleExportCSV = () => {
    if (!players || players.length === 0) return;
    const headers = "Name,Number,Positions,Status,Nickname,Note";
    const rows = players.map((p) => {
      const name = `"${(p.name || '').replace(/"/g, '""')}"`;
      const num = `"${(p.number || '').replace(/"/g, '""')}"`;
      const pos = `"${(p.positions || []).join('; ')}"`;
      const status = p.status || 'available';
      const nick = `"${(p.nick || '').replace(/"/g, '""')}"`;
      const note = `"${(p.note || '').replace(/"/g, '""')}"`;
      return `${name},${num},${pos},${status},${nick},${note}`;
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${(teamName || 'squad').toLowerCase().replace(/\s+/g, '_')}_players_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenAddPlayer = () => {
    setEditingPlayer(null);
    setFormName('');
    setFormNick('');
    setFormNumber('');
    setFormPrimaryZone('MID');
    setFormPositions([]);
    setFormStatus('available');
    setFormNote('');
    setFormHeightCm('0');
    setFormWeightKg('0');
    setFormPreferredFoot('Right');
    setFormGender('Female');
    setFormAgeGroup('U14');
    setFormError('');
    setShowAddEditModal(true);
  };

  const handleOpenEditPlayer = (p: Player) => {
    setEditingPlayer(p);
    setFormName(p.name);
    setFormNick(p.nick || '');
    setFormNumber(p.number);
    setFormPrimaryZone(p.primaryZone);
    setFormPositions((p.positions || []).map(normalizePosition));
    setFormStatus(p.status);
    setFormNote(p.note || '');
    setFormHeightCm(p.heightCm ? String(p.heightCm) : '0');
    setFormWeightKg(p.weightKg ? String(p.weightKg) : '0');
    setFormPreferredFoot(p.preferredFoot || 'Right');
    setFormGender((p.gender as any) || 'Female');
    setFormAgeGroup(p.ageGroup || 'U14');
    setFormError('');
    setShowAddEditModal(true);
  };

  const handleSavePlayer = () => {
    if (!formName.trim() || !formNumber.trim()) {
      setFormError('Please fill in both name and jumper number.');
      return;
    }

    const normPositions = formPositions.map(normalizePosition);
    let finalPrimaryZone = formPrimaryZone;
    if (normPositions.length > 0) {
      const derivedZone = getZoneForPosition(normPositions[0]);
      if (derivedZone) {
        finalPrimaryZone = derivedZone;
      }
    }

    const data: Partial<Player> = {
      name: formName.trim(),
      nick: formNick.trim(),
      number: formNumber.trim(),
      primaryZone: finalPrimaryZone,
      positions: normPositions,
      status: formStatus,
      note: formNote.trim(),
      heightCm: parseFloat(formHeightCm) || 0,
      weightKg: parseFloat(formWeightKg) || 0,
      preferredFoot: formPreferredFoot,
      gender: formGender,
      ageGroup: formAgeGroup,
    };

    if (editingPlayer) {
      onUpdatePlayers(
        players.map((p) => (p.id === editingPlayer.id ? { ...p, ...data } : p))
      );
      // Remove from active lineup if marked absent
      if (formStatus !== 'available') {
        const nextLineup = { ...lineup };
        const slot = Object.keys(lineup).find((k) => lineup[k] === editingPlayer.id);
        if (slot) {
          delete nextLineup[slot];
          onUpdateLineup(nextLineup);
        }
      }
    } else {
      const newPlayer: Player = {
        id: `p-${Date.now()}`,
        active: 0,
        bench: 0,
        name: formName.trim(),
        nick: formNick.trim(),
        number: formNumber.trim(),
        primaryZone: finalPrimaryZone,
        positions: normPositions,
        status: formStatus,
        note: formNote.trim(),
        heightCm: parseFloat(formHeightCm) || 0,
        weightKg: parseFloat(formWeightKg) || 0,
        preferredFoot: formPreferredFoot,
        gender: formGender,
        ageGroup: formAgeGroup,
      };
      onUpdatePlayers([...players, newPlayer]);
    }

    setShowAddEditModal(false);
  };

  const handleDeletePlayer = (id: string) => {
    if (!window.confirm('Delete this player permanently from the squad?')) return;
    onUpdatePlayers(players.filter((p) => p.id !== id));

    // Remove from active lineup
    const nextLineup = { ...lineup };
    const slot = Object.keys(lineup).find((k) => lineup[k] === id);
    if (slot) {
      delete nextLineup[slot];
      onUpdateLineup(nextLineup);
    }

    if (selectedPlayerId === id) {
      onSelectPlayerId(null);
    }
  };

  const handleSetStatus = (id: string, stat: 'available' | 'away' | 'injured' | 'other_team') => {
    onUpdatePlayers(
      players.map((p) => (p.id === id ? { ...p, status: stat } : p))
    );

    // Remove from active lineup if marked absent
    if (stat !== 'available') {
      const nextLineup = { ...lineup };
      const slot = Object.keys(lineup).find((k) => lineup[k] === id);
      if (slot) {
        delete nextLineup[slot];
        onUpdateLineup(nextLineup);
      }
    }
  };

  const handleSimulatePlaytime = (playerId: string) => {
    const randomActive = Math.floor(Math.random() * 1500) + 1200; // 1200 to 2700 seconds (20 to 45 mins)
    const randomBench = Math.floor(Math.random() * 600) + 300;   // 300 to 900 seconds
    
    const p = players.find(player => player.id === playerId);
    if (!p) return;

    let candidateSlots: string[] = [];
    if (p.positions && p.positions.length > 0) {
      candidateSlots = p.positions;
    } else if (p.primaryZone && POSITION_GROUPS[p.primaryZone]) {
      candidateSlots = POSITION_GROUPS[p.primaryZone];
    } else {
      candidateSlots = ['C', 'ROV', 'RR', 'FF', 'FB'];
    }

    const simulatedSlotTimes: Record<string, number> = {};
    let remainingActive = randomActive;
    
    const slotsToUse = candidateSlots.slice(0, 3);
    if (slotsToUse.length === 0) {
      slotsToUse.push('C');
    }

    slotsToUse.forEach((slot, idx) => {
      if (idx === slotsToUse.length - 1) {
        simulatedSlotTimes[slot] = remainingActive;
      } else {
        const portion = Math.floor(randomActive * (0.4 + Math.random() * 0.3)); // 40% to 70%
        const allocated = Math.min(portion, remainingActive);
        simulatedSlotTimes[slot] = allocated;
        remainingActive -= allocated;
      }
    });

    onUpdatePlayers(
      players.map(player => {
        if (player.id === playerId) {
          return {
            ...player,
            active: randomActive,
            bench: randomBench,
            slotTimes: simulatedSlotTimes
          };
        }
        return player;
      })
    );
  };

  const handleClearPlaytime = (playerId: string) => {
    onUpdatePlayers(
      players.map(player => {
        if (player.id === playerId) {
          return {
            ...player,
            active: 0,
            bench: 0,
            slotTimes: {}
          };
        }
        return player;
      })
    );
  };

  const toggleFormPosition = (pos: string) => {
    const norm = normalizePosition(pos);
    let next: string[];
    if (formPositions.includes(norm)) {
      next = formPositions.filter((p) => p !== norm);
    } else {
      next = [...formPositions, norm];
    }
    setFormPositions(next);

    // Auto-align primary zone if selecting positions
    if (next.length > 0) {
      const derived = getZoneForPosition(next[0]);
      if (derived) {
        setFormPrimaryZone(derived);
      }
    }
  };

  const handleSelectZonePreset = (zoneKey: string) => {
    const zonePositions = POSITION_GROUPS[zoneKey] || [];
    setFormPositions(zonePositions.map(normalizePosition));
    setFormPrimaryZone(zoneKey);
  };

  const handleClearPositions = () => {
    setFormPositions([]);
  };

  const handleRestoreDefaultSquad = () => {
    if (players.length > 0) {
      if (!window.confirm("Restore default AFL squad (22 players)? This will reset your current player list to default data.")) {
        return;
      }
    }
    onUpdatePlayers(DEFAULT_PLAYERS);
  };

  // Metrics calculation
  const squadCount = players.length;
  const availableCount = players.filter((p) => p.status === 'available').length;
  const injuredCount = players.filter((p) => p.status === 'injured').length;
  const awayCount = players.filter((p) => p.status === 'away').length;

  const totalGames = history.length;
  const winsCount = history.filter((g) => {
    const hTotal = (g.score?.home?.goals || 0) * 6 + (g.score?.home?.behinds || 0);
    const aTotal = (g.score?.away?.goals || 0) * 6 + (g.score?.away?.behinds || 0);
    return hTotal > aTotal;
  }).length;
  const lossesCount = history.filter((g) => {
    const hTotal = (g.score?.home?.goals || 0) * 6 + (g.score?.home?.behinds || 0);
    const aTotal = (g.score?.away?.goals || 0) * 6 + (g.score?.away?.behinds || 0);
    return hTotal < aTotal;
  }).length;
  const drawsCount = Math.max(0, totalGames - winsCount - lossesCount);

  const activeOnFieldCount = Object.values(lineup).filter(Boolean).length;
  const activeOnBenchCount = players.filter(
    (p) => p.status === 'available' && !Object.values(lineup).includes(p.id)
  ).length;

  const lineupsCount = savedLineups.length;

  return (
    <div className="space-y-6">
      {/* If a player is selected, show FOCUSED PLAYER DETAILS VIEW with Back Button */}
      {activePlayer ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Focused Player Navigation & Action Header */}
          <div className="bg-white p-4 rounded-2xl border border-[var(--line)] shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onSelectPlayerId(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <ArrowLeft className="w-4 h-4 text-emerald-400" />
                  <span>← Back to Squad List</span>
                </button>

                <div className="flex items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base text-white shadow-xs shrink-0 ${
                    activePlayer.primaryZone === 'FWD' ? 'bg-[#E5484D]' :
                    activePlayer.primaryZone === 'DEF' ? 'bg-[#16a765]' :
                    activePlayer.primaryZone === 'RUCK' ? 'bg-[#8B5CF6]' : 'bg-[#4C6FFF]'
                  }`}>
                    #{activePlayer.number}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 leading-tight">
                      {activePlayer.name} {activePlayer.nick && <span className="text-blue-600 text-xs font-bold">({activePlayer.nick})</span>}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase ${
                        activePlayer.primaryZone === 'FWD' ? 'bg-red-50 text-red-700 border border-red-200' :
                        activePlayer.primaryZone === 'DEF' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                        activePlayer.primaryZone === 'RUCK' ? 'bg-purple-50 text-purple-800 border border-purple-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}>
                        {activePlayer.primaryZone} Zone
                      </span>
                      <span className={`px-2 py-0.5 text-[9px] font-black rounded-md uppercase ${
                        activePlayer.status === 'available' ? 'bg-green-50 text-[#0E7A48] border border-green-200' :
                        activePlayer.status === 'injured' ? 'bg-red-50 text-red-700 border border-red-200' :
                        activePlayer.status === 'other_team' ? 'bg-purple-100 text-purple-900 border border-purple-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {activePlayer.status === 'other_team' ? 'Playing for Opponent' : activePlayer.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {prevPlayer && (
                  <button
                    onClick={() => onSelectPlayerId(prevPlayer.id)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                    title={`Previous Player: #${prevPlayer.number} ${prevPlayer.name}`}
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                    <span>#{prevPlayer.number} {prevPlayer.nick || prevPlayer.name.split(' ')[0]}</span>
                  </button>
                )}
                {nextPlayer && (
                  <button
                    onClick={() => onSelectPlayerId(nextPlayer.id)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                    title={`Next Player: #${nextPlayer.number} ${nextPlayer.name}`}
                  >
                    <span>#{nextPlayer.number} {nextPlayer.nick || nextPlayer.name.split(' ')[0]}</span>
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                )}

                <button
                  onClick={() => handleOpenEditPlayer(activePlayer)}
                  className="px-3 py-2 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>

                <button
                  onClick={() => handleDeletePlayer(activePlayer.id)}
                  className="px-3 py-2 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>

          {/* MAIN PLAYER DETAILS & ATTRIBUTES CONTENT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT COLUMN (7 COLS): PHYSICAL DETAILS, PREFERENCES & AI RUBRIC FIT */}
            <div className="lg:col-span-7 space-y-6">

              {/* Physical Profile & Status Details */}
              <div className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4.5 h-4.5 text-blue-600" />
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Physical Details & Bio
                    </h3>
                  </div>
                  <button
                    onClick={() => handleOpenEditPlayer(activePlayer)}
                    className="text-xs font-extrabold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 cursor-pointer"
                  >
                    Edit Physicals
                  </button>
                </div>

                {/* 4 Physical Metric Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl text-center">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Height</span>
                    <span className="text-base font-black text-slate-900 mt-0.5 block">{heightCm} cm</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl text-center">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Weight</span>
                    <span className="text-base font-black text-slate-900 mt-0.5 block">{weightKg} kg</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl text-center">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Preferred Foot</span>
                    <span className="text-base font-black text-indigo-900 mt-0.5 block">{preferredFoot}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl text-center">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Gender & Age</span>
                    <span className="text-xs font-black text-slate-800 mt-1 block">{gender} {ageGroup}</span>
                  </div>
                </div>

                {/* Status Selection */}
                <div className="bg-gray-50 border border-gray-200/80 p-3.5 rounded-xl space-y-2">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">
                    Squad Selection Status
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      onClick={() => handleSetStatus(activePlayer.id, 'available')}
                      className={`py-1.5 px-3 text-xs font-bold rounded-xl border transition cursor-pointer ${
                        activePlayer.status === 'available'
                          ? 'bg-green-600 text-white border-green-700 font-black shadow-2xs'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      Available
                    </button>
                    <button
                      onClick={() => handleSetStatus(activePlayer.id, 'away')}
                      className={`py-1.5 px-3 text-xs font-bold rounded-xl border transition cursor-pointer ${
                        activePlayer.status === 'away'
                          ? 'bg-amber-500 text-white border-amber-600 font-black shadow-2xs'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      Away
                    </button>
                    <button
                      onClick={() => handleSetStatus(activePlayer.id, 'injured')}
                      className={`py-1.5 px-3 text-xs font-bold rounded-xl border transition cursor-pointer ${
                        activePlayer.status === 'injured'
                          ? 'bg-red-600 text-white border-red-700 font-black shadow-2xs'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      Injured
                    </button>
                    <button
                      onClick={() => handleSetStatus(activePlayer.id, 'other_team')}
                      className={`py-1.5 px-3 text-xs font-bold rounded-xl border transition cursor-pointer ${
                        activePlayer.status === 'other_team'
                          ? 'bg-purple-600 text-white border-purple-700 font-black shadow-2xs'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      Opponent
                    </button>
                  </div>
                </div>

                {/* Preferred Positions */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                      Preferred Positions & Primary Zone
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenEditPlayer(activePlayer)}
                      className="text-xs font-extrabold text-blue-600 hover:underline cursor-pointer"
                    >
                      Edit Positions
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {activePlayer.positions && activePlayer.positions.length > 0 ? (
                      activePlayer.positions.map((pos) => {
                        const normPos = normalizePosition(pos);
                        const fullName = POSITION_FULL_NAMES[normPos] || normPos;
                        return (
                          <span
                            key={pos}
                            title={fullName}
                            className="px-2.5 py-1 bg-white border border-blue-200 text-blue-900 rounded-lg text-xs font-black shadow-2xs flex items-center gap-1.5"
                          >
                            <span className="bg-blue-600 text-white px-1.5 py-0.2 rounded text-[10px] font-black">{normPos}</span>
                            <span>{fullName}</span>
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-xs text-gray-400 font-semibold italic">No positions assigned. Click Edit Positions to select.</span>
                    )}
                  </div>
                </div>

                {/* Game Day Alignment */}
                {(() => {
                  const rawFldPos = Object.keys(lineup).find((k) => lineup[k] === activePlayer.id);
                  const fldPos = rawFldPos ? normalizePosition(rawFldPos) : null;
                  return (
                    <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-black uppercase text-blue-800 tracking-wider block">
                          Game Day Lineup Status
                        </span>
                        {fldPos ? (
                          <p className="text-xs text-slate-800 font-bold mt-0.5">
                            Assigned Field Starter: <strong className="text-emerald-700 font-extrabold uppercase">{fldPos}</strong>
                          </p>
                        ) : activePlayer.status === 'available' ? (
                          <p className="text-xs text-amber-800 font-bold mt-0.5">Available Bench Reserve</p>
                        ) : (
                          <p className="text-xs text-gray-500 font-semibold italic mt-0.5">Unavailable for lineup</p>
                        )}
                      </div>
                      {onNavigateTab && (
                        <button
                          onClick={() => onNavigateTab('lineup')}
                          className="text-xs font-black text-blue-700 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <span>Game Day →</span>
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* Coaching Notes */}
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">
                    Coaching Notes
                  </span>
                  {activePlayer.note ? (
                    <p className="text-xs text-gray-700 font-medium bg-slate-50 p-3 rounded-xl border border-gray-200 italic leading-relaxed">
                      "{activePlayer.note}"
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 font-medium bg-slate-50 p-3 rounded-xl border border-gray-200 italic">
                      No notes logged for this player. Click Edit Profile to add comments.
                    </p>
                  )}
                </div>
              </div>

              {/* AFL Positional Rubric & AI Recommendation Card */}
              {topChoice && (
                <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white p-5 rounded-2xl border border-indigo-800 shadow-md space-y-4">
                  <div className="flex items-center justify-between border-b border-indigo-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                      <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider">
                        AFL Positional Rubric & Recommended Fit
                      </h3>
                    </div>
                    {onNavigateTab && (
                      <button
                        onClick={() => onNavigateTab('growth')}
                        className="text-xs font-extrabold text-amber-300 hover:underline cursor-pointer"
                      >
                        Explore Growth Profile →
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/5 p-3.5 rounded-xl border border-white/10">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-300 uppercase block">Primary Recommendation</span>
                      <h4 className="text-lg font-black text-white flex items-center gap-2 mt-0.5">
                        <span>{topChoice.group.iconEmoji}</span>
                        <span>{topChoice.group.title}</span>
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase border ${
                        topChoice.tier === 'Strong Match' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' :
                        topChoice.tier === 'Good Fit' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30' :
                        'bg-amber-500/20 text-amber-300 border-amber-400/30'
                      }`}>
                        {topChoice.tier} ({topChoice.suitabilityScore}/100)
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-indigo-100 font-medium leading-relaxed bg-black/20 p-3 rounded-xl border border-indigo-800/50">
                    <strong>Coaching Rationale:</strong> {topChoice.whyComment}
                  </p>

                  <div className="text-[11px] text-indigo-200 flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-indigo-800/50">
                    <span>
                      <strong>Age Stage Expectation ({gender} {ageGroup}):</strong> {topChoice.ageStageExpectation}
                    </span>
                    <span className="text-[10px] bg-amber-400/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-300/30">
                      Focus: {topChoice.growthFocus}
                    </span>
                  </div>
                </div>
              )}

            </div>

            {/* RIGHT COLUMN (5 COLS): PLAYER ATTRIBUTES & SKILL RATINGS */}
            <div className="lg:col-span-5 space-y-6">

              {/* Core Skill Attributes Card */}
              <div className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-4.5 h-4.5 text-emerald-600" />
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Core Skill Attributes
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleOpenAdjustAttributes}
                      className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-black transition cursor-pointer border border-emerald-200"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      Adjust Attributes
                    </button>
                    {onNavigateTab && (
                      <button
                        onClick={() => onNavigateTab('growth')}
                        className="text-xs font-extrabold text-indigo-600 hover:underline cursor-pointer"
                      >
                        Assessments →
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Kick Accuracy */}
                  <div>
                    <div className="flex justify-between text-xs font-extrabold text-slate-800 mb-1">
                      <span>⚡ Kick Accuracy</span>
                      <span className="text-emerald-700">{kickAcc}/10</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(kickAcc / 10) * 100}%` }}></div>
                    </div>
                  </div>

                  {/* Kick Distance */}
                  <div>
                    <div className="flex justify-between text-xs font-extrabold text-slate-800 mb-1">
                      <span>👟 Kick Distance</span>
                      <span className="text-blue-700">{kickDist} meters</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (kickDist / 60) * 100)}%` }}></div>
                    </div>
                  </div>

                  {/* Opposite Foot */}
                  <div>
                    <div className="flex justify-between text-xs font-extrabold text-slate-800 mb-1">
                      <span>🦵 Opposite Foot Competency</span>
                      <span className="text-indigo-700">{oppFoot}/10</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(oppFoot / 10) * 100}%` }}></div>
                    </div>
                  </div>

                  {/* Handball */}
                  <div>
                    <div className="flex justify-between text-xs font-extrabold text-slate-800 mb-1">
                      <span>🤾 Handball Speed & Accuracy</span>
                      <span className="text-emerald-700">{handball}/10</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(handball / 10) * 100}%` }}></div>
                    </div>
                  </div>

                  {/* Marking */}
                  <div>
                    <div className="flex justify-between text-xs font-extrabold text-slate-800 mb-1">
                      <span>🤲 Marking (Chest & Overhead)</span>
                      <span className="text-purple-700">{marking}/10</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(marking / 10) * 100}%` }}></div>
                    </div>
                  </div>

                  {/* Tackling */}
                  <div>
                    <div className="flex justify-between text-xs font-extrabold text-slate-800 mb-1">
                      <span>🛡️ Tackling & Defensive Effort</span>
                      <span className="text-amber-700">{tackling}/10</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(tackling / 10) * 100}%` }}></div>
                    </div>
                  </div>

                  {/* Game Sense */}
                  <div>
                    <div className="flex justify-between text-xs font-extrabold text-slate-800 mb-1">
                      <span>🧠 Game Sense & Decision Speed</span>
                      <span className="text-indigo-700">{gameSense}/10</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${(gameSense / 10) * 100}%` }}></div>
                    </div>
                  </div>

                  {/* Fitness Rating */}
                  <div>
                    <div className="flex justify-between text-xs font-extrabold text-slate-800 mb-1">
                      <span>🏃 Endurance & Work Rate</span>
                      <span className="text-[#0E7A48]">{fitness}/10</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-600 rounded-full" style={{ width: `${(fitness / 10) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Positional Rubric Skills Card */}
              <div className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4.5 h-4.5 text-indigo-600" />
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Positional Rubric Skills
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-800">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 uppercase block font-extrabold">Spoiling</span>
                    <span className="text-sm font-black text-slate-900">{spoiling}/10</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 uppercase block font-extrabold">Overhead Mark</span>
                    <span className="text-sm font-black text-slate-900">{overheadMarking}/10</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 uppercase block font-extrabold">Crumbing</span>
                    <span className="text-sm font-black text-slate-900">{crumbing}/10</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 uppercase block font-extrabold">Pressure Acts</span>
                    <span className="text-sm font-black text-slate-900">{pressureActs}/10</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 uppercase block font-extrabold">Ruck Tap</span>
                    <span className="text-sm font-black text-slate-900">{ruckTap}/10</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 uppercase block font-extrabold">Leading Timing</span>
                    <span className="text-sm font-black text-slate-900">{leadingTiming}/10</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 uppercase block font-extrabold">Snap Goal</span>
                    <span className="text-sm font-black text-slate-900">{snapGoal}/10</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 uppercase block font-extrabold">Def Transition</span>
                    <span className="text-sm font-black text-slate-900">{defTransition}/10</span>
                  </div>
                </div>
              </div>

              {/* Combine Test Snapshot Results Card */}
              <div className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4.5 h-4.5 text-amber-500" />
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Combine Test Snapshot Results
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                    ⚡ Point-in-Time Test
                  </span>
                </div>

                {latestCombineRecord ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
                      <span>Last Tested: <strong>{latestCombineRecord.date}</strong></span>
                      <span className="font-bold text-slate-700">{latestCombineRecord.seasonLabel}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60">
                        <span className="text-[10px] text-amber-800 uppercase block font-extrabold">🏃 20m Sprint</span>
                        <span className="text-sm font-black text-slate-900">{latestCombineRecord.sprint20m || '3.15s'}</span>
                      </div>
                      <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60">
                        <span className="text-[10px] text-amber-800 uppercase block font-extrabold">⚡ Agility Test</span>
                        <span className="text-sm font-black text-slate-900">{latestCombineRecord.agilityTime || '8.40s'}</span>
                      </div>
                      <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60">
                        <span className="text-[10px] text-amber-800 uppercase block font-extrabold">🦘 Vertical Jump</span>
                        <span className="text-sm font-black text-slate-900">
                          {latestCombineRecord.standingVerticalCm ? `${latestCombineRecord.standingVerticalCm} cm` : '55 cm'}
                        </span>
                      </div>
                      <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60">
                        <span className="text-[10px] text-amber-800 uppercase block font-extrabold">🏃‍♂️ 2km Time Trial</span>
                        <span className="text-sm font-black text-slate-900">{latestCombineRecord.timeTrial2km || '08:15'}</span>
                      </div>
                      <div className="col-span-2 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-amber-800 uppercase block font-extrabold">🔊 Yo-Yo Intermittent Test</span>
                          <span className="text-sm font-black text-slate-900">Level {latestCombineRecord.yoyoLevel || '16.5'}</span>
                        </div>
                        <Dumbbell className="w-5 h-5 text-amber-600 opacity-80" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 p-4 rounded-xl text-center space-y-2 border border-slate-200">
                    <p className="text-xs font-semibold text-slate-600">
                      No combine test snapshot results loaded for this player yet.
                    </p>
                  </div>
                )}

                {/* Actions: Load sample combine benchmarks or log new combine snapshot */}
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleLoadSampleCombine}
                    className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Load Combine Test Results
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenCombineModal}
                    className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Log Custom Combine
                  </button>
                </div>

                <div className="p-2.5 bg-blue-50/80 rounded-xl border border-blue-200/80 text-[11px] text-blue-900 font-medium leading-tight">
                  📌 <strong>Snapshot Note:</strong> Combine test results are athletic snapshots recorded at a point in time. They do <strong>NOT</strong> alter or overwrite the player's static core attributes or skill ratings.
                </div>
              </div>

            </div>
          </div>

          {/* MINIMISED GAME DAY STATS & TIME IN POSITIONS (HEATMAP) ACCORDION */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-2xs transition-all">
            <button
              type="button"
              onClick={() => setShowGameDayHeatmap(!showGameDayHeatmap)}
              className="w-full p-4 flex items-center justify-between bg-slate-100 hover:bg-slate-200/80 transition text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-400/30 flex items-center justify-center text-orange-600 shrink-0">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Game Day Match Stats & Time in Positions (Heatmap)
                    </h4>
                    <span className="px-2 py-0.5 text-[9px] font-black bg-amber-100 text-amber-800 rounded border border-amber-200 uppercase">
                      {showGameDayHeatmap ? 'Expanded' : 'Minimised'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                    On Field: <strong>{activePlayer.active ? `${Math.floor(activePlayer.active / 60)} mins` : '0 mins'}</strong> • On Bench: <strong>{activePlayer.bench ? `${Math.floor(activePlayer.bench / 60)} mins` : '0 mins'}</strong> • Click to {showGameDayHeatmap ? 'collapse' : 'expand live position heat map'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-black text-slate-700 shrink-0">
                <span>{showGameDayHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}</span>
                {showGameDayHeatmap ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showGameDayHeatmap && (
              <div className="p-5 border-t border-slate-200 bg-white space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs text-slate-600 font-bold">
                    Simulated live match duration and position heat intensity on ground:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSimulatePlaytime(activePlayer.id)}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-black rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      Simulate Match Playtime
                    </button>
                    {activePlayer.slotTimes && Object.keys(activePlayer.slotTimes).length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleClearPlaytime(activePlayer.id)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-xs font-black rounded-lg transition cursor-pointer"
                      >
                        Reset Data
                      </button>
                    )}
                  </div>
                </div>

                {/* Heatmap Field */}
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl flex flex-col items-center justify-center overflow-x-auto">
                  <div className="w-full max-w-[460px] field relative select-none mx-auto shadow-md shrink-0" style={{ height: '620px' }}>
                    <div className="centre-square"></div>
                    <div className="centre-circle-inner"></div>
                    <div className="fifty-arc-top"></div>
                    <div className="fifty-arc-bottom"></div>

                    {/* AFL Goal Posts & Markings - Top End */}
                    <div className="goal-line-top"></div>
                    <div className="goal-square-top"></div>
                    <div className="goal-post behind top-left-behind"></div>
                    <div className="goal-post main top-left-main"></div>
                    <div className="goal-post main top-right-main"></div>
                    <div className="goal-post behind top-right-behind"></div>

                    {/* AFL Goal Posts & Markings - Bottom End */}
                    <div className="goal-line-bottom"></div>
                    <div className="goal-square-bottom"></div>
                    <div className="goal-post behind bottom-left-behind"></div>
                    <div className="goal-post main bottom-left-main"></div>
                    <div className="goal-post main bottom-right-main"></div>
                    <div className="goal-post behind bottom-right-behind"></div>

                    {POSITIONS.map(([slotName, label, x, y]) => {
                      const playerSlotTimes = activePlayer.slotTimes || {};
                      const secondsSpent = playerSlotTimes[slotName] || 0;
                      const activeTimesArray = Object.values(playerSlotTimes);
                      const maxTime = activeTimesArray.length > 0 ? Math.max(...activeTimesArray) : 0;
                      const hasHeat = secondsSpent > 0;
                      const heatRatio = maxTime > 0 ? secondsSpent / maxTime : 0;

                      return (
                        <div
                          key={slotName}
                          style={{ left: `${x}%`, top: `${y}%` }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none z-10"
                        >
                          {hasHeat && (
                            <div
                              className="absolute rounded-full blur-[8px] opacity-85 animate-pulse transition-all duration-500"
                              style={{
                                width: `${24 + heatRatio * 36}px`,
                                height: `${24 + heatRatio * 36}px`,
                                backgroundColor: `rgba(${235 + heatRatio * 20}, ${110 - heatRatio * 75}, 25, ${0.45 + heatRatio * 0.45})`,
                                boxShadow: `0 0 ${12 + heatRatio * 16}px rgba(${245 + heatRatio * 10}, 110, 0, ${0.35 + heatRatio * 0.45})`
                              }}
                            />
                          )}

                          {hasHeat ? (
                            <div className="relative z-10 flex flex-col items-center bg-black/80 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-white/30 shadow-xs">
                              <span className="text-[9px] font-black text-white leading-none tracking-tight">{slotName}</span>
                              <span className="text-[8px] font-black text-amber-300 leading-none mt-0.5">
                                {Math.round(secondsSpent / 60)}m
                              </span>
                            </div>
                          ) : (
                            <div className="relative z-10 flex flex-col items-center bg-black/20 border border-white/20 px-1 py-0.5 rounded-sm backdrop-blur-2xs">
                              <span className="text-[7px] font-bold text-white/50 leading-none">{slotName}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

            {/* Bottom Navigation Bar */}
            <div className="border-t border-gray-100 pt-4 flex items-center justify-between flex-wrap gap-3">
              <button
                onClick={() => onSelectPlayerId(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-400" />
                <span>← Back to Squad List</span>
              </button>

              <div className="flex items-center gap-2">
                {prevPlayer && (
                  <button
                    onClick={() => onSelectPlayerId(prevPlayer.id)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold text-xs rounded-xl transition cursor-pointer"
                  >
                    ← #{prevPlayer.number} {prevPlayer.name.split(' ')[0]}
                  </button>
                )}
                {nextPlayer && (
                  <button
                    onClick={() => onSelectPlayerId(nextPlayer.id)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold text-xs rounded-xl transition cursor-pointer"
                  >
                    #{nextPlayer.number} {nextPlayer.name.split(' ')[0]} →
                  </button>
                )}
              </div>
            </div>
          </div>
      ) : (
        <div className="space-y-6">
          {/* If NO player is selected, show SQUAD LIST VIEW with cards & search */}
          {/* Squad Summary & Metrics Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-white tracking-tight">{teamName || 'Active Team View'}</h2>
                    {isInactive ? (
                      <span className="px-2 py-0.5 text-[10px] font-black bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-full uppercase tracking-wider">
                        Inactive • Season Finished
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full uppercase tracking-wider">
                        Live Dataset View
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-semibold">Squad Summary & Performance Metrics</p>
                </div>
              </div>
              {onNavigateTab && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onNavigateTab('lineup')}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Play className="w-3.5 h-3.5 text-white" />
                    <span>Game Day →</span>
                  </button>
                  <button
                    onClick={() => onNavigateTab('admin')}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Admin Panel
                  </button>
                </div>
              )}
            </div>

            {/* 4 Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Squad Count */}
              <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                  <span>Total Roster</span>
                  <Users className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-black text-white">
                  {squadCount} <span className="text-xs text-slate-400 font-semibold">Players</span>
                </div>
                <div className="flex flex-wrap gap-1 pt-1 text-[9px] font-extrabold">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {availableCount} Avail
                  </span>
                  {injuredCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                      {injuredCount} Inj
                    </span>
                  )}
                  {awayCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {awayCount} Away
                    </span>
                  )}
                </div>
              </div>

              {/* Games Record */}
              <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                  <span>Match Record</span>
                  <Trophy className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-white">
                  {totalGames} <span className="text-xs text-slate-400 font-semibold">Games</span>
                </div>
                <div className="flex flex-wrap gap-1 pt-1 text-[9px] font-extrabold">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {winsCount} Wins
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                    {lossesCount} Loss
                  </span>
                  {drawsCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {drawsCount} Draw
                    </span>
                  )}
                </div>
              </div>

              {/* Starter Slots / Field */}
              <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                  <span>Field / Bench</span>
                  <Shield className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-black text-white">
                  {activeOnFieldCount} <span className="text-xs text-slate-400 font-semibold">Field</span> / {activeOnBenchCount} <span className="text-xs text-slate-400 font-semibold">Bench</span>
                </div>
                <div className="text-[10px] font-bold text-indigo-300 pt-1">
                  {activeOnFieldCount}/18 Starter Slots Set
                </div>
              </div>

              {/* Lineups Saved */}
              <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                  <span>Lineup Presets</span>
                  <Layers className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-black text-white">
                  {lineupsCount} <span className="text-xs text-slate-400 font-semibold">Presets</span>
                </div>
                <div className="text-[10px] font-bold text-cyan-300 pt-1">
                  Ready for Game Day
                </div>
              </div>
            </div>
          </div>

          {/* Top Action Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[var(--line)] shadow-sm">
            <div>
              <h2 className="text-xl font-black text-[var(--navy)] tracking-tight">Team Squad ({players.length})</h2>
              <p className="text-xs text-[var(--muted)] font-semibold mt-1">
                Click any player card to view their full profile details, positions, and live match heatmaps.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl border border-slate-300 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => setShowCsvModal(!showCsvModal)}
                className="px-3.5 py-2 text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl border border-blue-200 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                <span>{showCsvModal ? 'Close CSV Guide' : 'Import CSV Roster'}</span>
              </button>
              <button
                onClick={handleOpenAddPlayer}
                className="px-3.5 py-2 text-xs font-bold bg-[var(--green)] text-white rounded-xl hover:opacity-95 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Player</span>
              </button>
            </div>
          </div>

          {/* CSV Import Drawer / Guide Modal */}
          {showCsvModal && (
            <CsvImportGuide
              players={players}
              onUpdatePlayers={onUpdatePlayers}
              onUpdateLineup={onUpdateLineup}
              title="Import Roster from CSV / Excel"
              onSuccess={() => setShowCsvModal(false)}
            />
          )}

          {/* Search, Zone Filters & Sort Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-[var(--line)] shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search player by name, nickname, jersey #..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Zone Pills & Sort Toggle */}
              <div className="flex flex-wrap items-center justify-between md:justify-end gap-2">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {['All', 'FWD', 'MID', 'DEF', 'RUCK'].map((zone) => (
                    <button
                      key={zone}
                      onClick={() => setFilterZone(zone)}
                      className={`px-3 py-1.5 text-xs font-black rounded-lg transition cursor-pointer ${
                        filterZone === zone
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      {zone}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setSortBy(sortBy === 'number' ? 'name' : 'number')}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 cursor-pointer transition"
                >
                  Sort: <strong className="text-slate-900">{sortBy === 'number' ? 'Jumper #' : 'Name'}</strong>
                </button>
              </div>
            </div>
          </div>

          {/* Squad Grid View */}
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((p) => {
                const rawFldPos = Object.keys(lineup).find((k) => lineup[k] === p.id);
                const fldPos = rawFldPos ? normalizePosition(rawFldPos) : undefined;

                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectPlayerId(p.id)}
                    className="bg-white hover:bg-slate-50/80 rounded-2xl border border-gray-200 hover:border-blue-300 p-4 shadow-2xs hover:shadow-md transition duration-150 cursor-pointer flex flex-col justify-between gap-3 group relative overflow-hidden"
                  >
                    {/* Top row: Jumper badge + Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-xs shrink-0 ${
                          p.primaryZone === 'FWD' ? 'bg-[#E5484D]' :
                          p.primaryZone === 'DEF' ? 'bg-[#16a765]' :
                          p.primaryZone === 'RUCK' ? 'bg-[#8B5CF6]' : 'bg-[#4C6FFF]'
                        }`}>
                          #{p.number}
                        </div>
                        <div>
                          <h3 className="font-black text-sm text-slate-900 group-hover:text-blue-700 transition leading-tight">
                            {p.name}
                          </h3>
                          {p.nick && (
                            <p className="text-[11px] text-blue-600 font-bold">"{p.nick}"</p>
                          )}
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 text-[9px] font-black rounded-md uppercase shrink-0 ${
                        p.status === 'available' ? 'bg-green-50 text-[#0E7A48] border border-green-200' :
                        p.status === 'injured' ? 'bg-red-50 text-red-700 border border-red-200' :
                        p.status === 'other_team' ? 'bg-purple-100 text-purple-900 border border-purple-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {p.status === 'other_team' ? 'Opponent' : p.status}
                      </span>
                    </div>

                    {/* Middle row: Zones & Positions */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase ${
                          p.primaryZone === 'FWD' ? 'bg-red-50 text-red-700 border border-red-200' :
                          p.primaryZone === 'DEF' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          p.primaryZone === 'RUCK' ? 'bg-purple-50 text-purple-800 border border-purple-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}>
                          {p.primaryZone}
                        </span>

                        {p.positions && p.positions.length > 0 ? (
                          <span className="text-[9px] font-extrabold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {p.positions.map(normalizePosition).join(', ')}
                          </span>
                        ) : (
                          <span className="text-[9px] text-gray-400 font-medium italic">No preferred pos</span>
                        )}
                      </div>

                      {fldPos ? (
                        <div className="flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-50 p-1.5 rounded-lg border border-emerald-200">
                          <span>Starter Position: {fldPos}</span>
                        </div>
                      ) : p.status === 'available' ? (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 p-1 rounded-lg">
                          <span>Bench Reserve</span>
                        </div>
                      ) : null}
                    </div>

                    {/* Bottom row: Click prompt */}
                    <div className="flex items-center justify-between text-xs font-black text-blue-600 group-hover:text-blue-800 pt-1 border-t border-slate-100">
                      <span>View Player Details</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center space-y-4 bg-white border border-gray-200 rounded-2xl shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-sm text-[var(--navy)]">No Players Found</h4>
                <p className="text-xs text-gray-500 font-semibold mt-1 max-w-sm mx-auto">
                  {searchQuery || filterZone !== 'All'
                    ? `No squad members matched filter "${filterZone}" / query "${searchQuery}".`
                    : 'This squad currently has no players. Register players manually, import CSV roster, or load sample data.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  onClick={handleOpenAddPlayer}
                  className="px-4 py-2 bg-[var(--green)] hover:opacity-95 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add First Player</span>
                </button>
                <button
                  onClick={handleRestoreDefaultSquad}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Load Sample Squad</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Add/Edit Player */}
      {showAddEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[2000] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-[var(--line)] shadow-2xl p-6 max-h-[92vh] overflow-y-auto space-y-4">
            <h3 className="text-lg font-black text-[var(--navy)] border-b border-gray-100 pb-2">
              {editingPlayer ? 'Edit Player' : 'Register New Player'}
            </h3>

            {formError && (
              <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
                {formError}
              </p>
            )}

            <div className="space-y-4 text-xs font-semibold text-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Name */}
                <div>
                  <label className="block mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Liam Ryan"
                    className="w-full p-2.5 border border-gray-200 bg-white rounded-xl focus:outline-none text-sm font-bold text-[var(--ink)]"
                  />
                </div>

                {/* Nickname */}
                <div>
                  <label className="block mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Nickname (e.g. "Flyer")
                  </label>
                  <input
                    type="text"
                    value={formNick}
                    onChange={(e) => setFormNick(e.target.value)}
                    placeholder="e.g. Flash"
                    className="w-full p-2.5 border border-gray-200 bg-white rounded-xl focus:outline-none text-sm font-bold text-[var(--ink)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Jumper Number */}
                <div>
                  <label className="block mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Jumper Number *
                  </label>
                  <input
                    type="number"
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    placeholder="e.g. 9"
                    className="w-full p-2.5 border border-gray-200 bg-white rounded-xl focus:outline-none text-sm font-bold text-[var(--ink)]"
                  />
                </div>

                {/* Primary Zone */}
                <div>
                  <label className="block mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Primary Zone
                  </label>
                  <select
                    value={formPrimaryZone}
                    onChange={(e) => setFormPrimaryZone(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 bg-white rounded-xl focus:outline-none text-sm font-bold text-[var(--ink)]"
                  >
                    <option value="FWD">FWD (Forwards)</option>
                    <option value="MID">MID (Midfielders)</option>
                    <option value="DEF">DEF (Defenders)</option>
                    <option value="RUCK">RUCK (Rucks)</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Squad Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full p-2.5 border border-gray-200 bg-white rounded-xl focus:outline-none text-sm font-bold text-[var(--ink)]"
                  >
                    <option value="available">Available for selection</option>
                    <option value="other_team">Playing for Opponent / Other Team</option>
                    <option value="away">Absent / Away</option>
                    <option value="injured">Injured</option>
                  </select>
                </div>
              </div>

              {/* Preferred Positions Builder */}
              <div className="space-y-2 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                      Select Preferred Positions
                    </label>
                    <p className="text-[10px] text-gray-500 font-medium">
                      Select all positions this player is preferred or trained to play. Primary zone aligns automatically.
                    </p>
                  </div>
                  {formPositions.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearPositions}
                      className="text-[10px] font-bold text-red-600 hover:text-red-800 bg-red-50 px-2 py-0.5 rounded border border-red-200 cursor-pointer"
                    >
                      Clear All ({formPositions.length})
                    </button>
                  )}
                </div>

                {/* Currently selected summary pills */}
                {formPositions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 bg-white p-2 rounded-xl border border-blue-100 shadow-2xs">
                    <span className="text-[9px] font-black uppercase text-blue-600 mr-1">Selected ({formPositions.length}):</span>
                    {formPositions.map((pos) => {
                      const norm = normalizePosition(pos);
                      return (
                        <span
                          key={`selected-${norm}`}
                          className="px-2 py-0.5 bg-blue-600 text-white font-black text-[10px] rounded-md flex items-center gap-1"
                        >
                          <span>{norm}</span>
                          <button
                            type="button"
                            onClick={() => toggleFormPosition(norm)}
                            className="hover:text-red-200 cursor-pointer ml-0.5 font-bold"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Preset buttons */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[9px] font-black uppercase text-gray-400">Quick Presets:</span>
                  {Object.keys(POSITION_GROUPS).map((groupName) => (
                    <button
                      key={`preset-${groupName}`}
                      type="button"
                      onClick={() => handleSelectZonePreset(groupName)}
                      className="px-2 py-0.5 text-[9px] font-bold bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-800 rounded-md border border-slate-200 transition cursor-pointer"
                    >
                      + All {groupName}
                    </button>
                  ))}
                </div>

                {/* Grouped Position Pickers */}
                <div className="space-y-3 max-h-52 overflow-y-auto border border-slate-200/80 p-2.5 rounded-xl bg-white mt-1">
                  {Object.keys(POSITION_GROUPS).map((groupName) => (
                    <div key={groupName} className="space-y-1">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-0.5">
                        <b className="text-[10px] font-black uppercase text-slate-500">{groupName} Zone</b>
                        <span className="text-[9px] text-gray-400 font-semibold">{POSITION_GROUPS[groupName].length} positions</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                        {POSITION_GROUPS[groupName].map((pos) => {
                          const norm = normalizePosition(pos);
                          const isSel = formPositions.includes(norm);
                          const fullName = POSITION_FULL_NAMES[norm] || norm;
                          return (
                            <button
                              key={pos}
                              type="button"
                              onClick={() => toggleFormPosition(pos)}
                              className={`p-1.5 rounded-lg border text-left transition flex flex-col justify-between cursor-pointer ${
                                isSel
                                  ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-black text-xs">{norm}</span>
                                {isSel && <Check className="w-3 h-3 stroke-[3] text-white" />}
                              </div>
                              <span className={`text-[9px] truncate font-medium ${isSel ? 'text-blue-100' : 'text-slate-500'}`}>
                                {fullName}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Physical Attributes Section */}
              <div className="space-y-3 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                <span className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                  Physical Profile & Bio Details
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block mb-1 text-[9px] font-black uppercase text-slate-500">Height (cm)</label>
                    <input
                      type="number"
                      value={formHeightCm}
                      onChange={(e) => setFormHeightCm(e.target.value)}
                      placeholder="0"
                      className="w-full p-2 border border-gray-200 bg-white rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-[9px] font-black uppercase text-slate-500">Weight (kg)</label>
                    <input
                      type="number"
                      value={formWeightKg}
                      onChange={(e) => setFormWeightKg(e.target.value)}
                      placeholder="0"
                      className="w-full p-2 border border-gray-200 bg-white rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-[9px] font-black uppercase text-slate-500">Preferred Foot</label>
                    <select
                      value={formPreferredFoot}
                      onChange={(e) => setFormPreferredFoot(e.target.value as any)}
                      className="w-full p-2 border border-gray-200 bg-white rounded-xl text-xs font-bold text-slate-800"
                    >
                      <option value="Right">Right</option>
                      <option value="Left">Left</option>
                      <option value="Dual">Dual Footed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-[9px] font-black uppercase text-slate-500">Gender</label>
                    <select
                      value={formGender}
                      onChange={(e) => setFormGender(e.target.value as any)}
                      className="w-full p-2 border border-gray-200 bg-white rounded-xl text-xs font-bold text-slate-800"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-[9px] font-black uppercase text-slate-500">Age Bracket</label>
                    <select
                      value={formAgeGroup}
                      onChange={(e) => setFormAgeGroup(e.target.value as any)}
                      className="w-full p-2 border border-gray-200 bg-white rounded-xl text-xs font-bold text-slate-800"
                    >
                      <option value="U10">U10</option>
                      <option value="U12">U12</option>
                      <option value="U14">U14</option>
                      <option value="U16">U16</option>
                      <option value="U18">U18 / Senior</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Coaching Notes / Remarks
                </label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="e.g. strong tackling technique, work on left foot"
                  className="w-full p-2.5 border border-gray-200 bg-white rounded-xl focus:outline-none text-sm font-bold text-[var(--ink)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3 mt-4">
              <button
                onClick={() => setShowAddEditModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlayer}
                className="px-4 py-2 text-xs font-bold bg-[var(--green)] hover:opacity-90 text-white rounded-xl"
              >
                Save Player
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADJUST STATIC ATTRIBUTES MODAL */}
      {showAdjustAttributesModal && activePlayer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 border border-slate-200 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Adjust Static Attributes — {activePlayer.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Static attributes represent the baseline skill profile used across team rubrics and lineup recommendations.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdjustAttributesModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/80 text-xs text-emerald-900 font-medium">
              💡 <strong>Static Ratings:</strong> You can adjust these static fields anytime. Point-in-time Combine test snapshots will never overwrite or alter these values.
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b pb-1">
                  Core Skills (1–10 Ratings & Kick Distance)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold">
                  {/* Kick Accuracy */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex justify-between mb-1">
                      <label className="text-slate-700">Kick Accuracy</label>
                      <span className="text-emerald-700 font-black">{attrKickAcc}/10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={attrKickAcc}
                      onChange={(e) => setAttrKickAcc(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  {/* Kick Distance */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex justify-between mb-1">
                      <label className="text-slate-700">Kick Distance (m)</label>
                      <span className="text-blue-700 font-black">{attrKickDist} meters</span>
                    </div>
                    <input
                      type="number"
                      min="15"
                      max="70"
                      value={attrKickDist}
                      onChange={(e) => setAttrKickDist(Number(e.target.value))}
                      className="w-full p-1.5 bg-white border rounded-lg text-xs font-black text-slate-800"
                    />
                  </div>

                  {/* Opposite Foot */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex justify-between mb-1">
                      <label className="text-slate-700">Opposite Foot</label>
                      <span className="text-indigo-700 font-black">{attrOppFoot}/10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={attrOppFoot}
                      onChange={(e) => setAttrOppFoot(Number(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  {/* Handball */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex justify-between mb-1">
                      <label className="text-slate-700">Handball</label>
                      <span className="text-emerald-700 font-black">{attrHandball}/10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={attrHandball}
                      onChange={(e) => setAttrHandball(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  {/* Marking */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex justify-between mb-1">
                      <label className="text-slate-700">Marking</label>
                      <span className="text-purple-700 font-black">{attrMarking}/10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={attrMarking}
                      onChange={(e) => setAttrMarking(Number(e.target.value))}
                      className="w-full accent-purple-600 cursor-pointer"
                    />
                  </div>

                  {/* Tackling */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex justify-between mb-1">
                      <label className="text-slate-700">Tackling</label>
                      <span className="text-amber-700 font-black">{attrTackling}/10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={attrTackling}
                      onChange={(e) => setAttrTackling(Number(e.target.value))}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                  </div>

                  {/* Game Sense */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex justify-between mb-1">
                      <label className="text-slate-700">Game Sense</label>
                      <span className="text-indigo-700 font-black">{attrGameSense}/10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={attrGameSense}
                      onChange={(e) => setAttrGameSense(Number(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  {/* Fitness */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex justify-between mb-1">
                      <label className="text-slate-700">Work Rate & Fitness</label>
                      <span className="text-green-700 font-black">{attrFitness}/10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={attrFitness}
                      onChange={(e) => setAttrFitness(Number(e.target.value))}
                      className="w-full accent-green-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b pb-1">
                  Positional Rubric Attributes
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase block mb-1">Spoiling</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={attrSpoiling}
                      onChange={(e) => setAttrSpoiling(Number(e.target.value))}
                      className="w-full p-2 bg-slate-50 border rounded-xl font-black text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase block mb-1">Overhead Mark</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={attrOverheadMarking}
                      onChange={(e) => setAttrOverheadMarking(Number(e.target.value))}
                      className="w-full p-2 bg-slate-50 border rounded-xl font-black text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase block mb-1">Crumbing</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={attrCrumbing}
                      onChange={(e) => setAttrCrumbing(Number(e.target.value))}
                      className="w-full p-2 bg-slate-50 border rounded-xl font-black text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase block mb-1">Pressure Acts</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={attrPressureActs}
                      onChange={(e) => setAttrPressureActs(Number(e.target.value))}
                      className="w-full p-2 bg-slate-50 border rounded-xl font-black text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase block mb-1">Ruck Tap</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={attrRuckTap}
                      onChange={(e) => setAttrRuckTap(Number(e.target.value))}
                      className="w-full p-2 bg-slate-50 border rounded-xl font-black text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase block mb-1">Leading Timing</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={attrLeadingTiming}
                      onChange={(e) => setAttrLeadingTiming(Number(e.target.value))}
                      className="w-full p-2 bg-slate-50 border rounded-xl font-black text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase block mb-1">Snap Goal</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={attrSnapGoal}
                      onChange={(e) => setAttrSnapGoal(Number(e.target.value))}
                      className="w-full p-2 bg-slate-50 border rounded-xl font-black text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase block mb-1">Def Transition</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={attrDefTransition}
                      onChange={(e) => setAttrDefTransition(Number(e.target.value))}
                      className="w-full p-2 bg-slate-50 border rounded-xl font-black text-slate-800"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowAdjustAttributesModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAdjustAttributes}
                className="px-5 py-2 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition cursor-pointer"
              >
                Save Static Attributes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMBINE TEST SNAPSHOT MODAL */}
      {showCombineModal && activePlayer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-slate-200 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Log Combine Test Snapshot
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Record point-in-time physical combine test benchmark.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCombineModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs text-amber-900 font-medium">
              ⚡ <strong>Point-in-time test:</strong> Logging combine test results creates a historical snapshot entry. It will NOT overwrite the player's core static skill ratings.
            </div>

            <div className="space-y-3 text-xs font-bold text-slate-800">
              <div>
                <label className="block text-[10px] text-slate-500 uppercase mb-1">🏃 20m Sprint (e.g. 3.15s)</label>
                <input
                  type="text"
                  value={combineSprint}
                  onChange={(e) => setCombineSprint(e.target.value)}
                  placeholder="3.15s"
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 uppercase mb-1">⚡ Agility Test (e.g. 8.40s)</label>
                <input
                  type="text"
                  value={combineAgility}
                  onChange={(e) => setCombineAgility(e.target.value)}
                  placeholder="8.40s"
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 uppercase mb-1">🦘 Standing Vertical Jump (cm)</label>
                <input
                  type="number"
                  value={combineVertical}
                  onChange={(e) => setCombineVertical(e.target.value)}
                  placeholder="55"
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 uppercase mb-1">🏃‍♂️ 2km Time Trial (e.g. 08:15)</label>
                <input
                  type="text"
                  value={combineTimeTrial}
                  onChange={(e) => setCombineTimeTrial(e.target.value)}
                  placeholder="08:15"
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 uppercase mb-1">🔊 Yo-Yo Recovery Test (Level)</label>
                <input
                  type="text"
                  value={combineYoyo}
                  onChange={(e) => setCombineYoyo(e.target.value)}
                  placeholder="16.5"
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowCombineModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCombineSnapshot}
                className="px-5 py-2 text-xs font-black bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-xs transition cursor-pointer"
              >
                Save Combine Snapshot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
