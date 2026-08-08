import React, { useState } from 'react';
import { Player, SkillAssessment } from '../types';
import {
  TrendingUp, Award, Zap, Target, Plus, Calendar, Activity,
  ChevronRight, ArrowUpRight, Sparkles, CheckCircle2, Search, Filter,
  FileSpreadsheet, Edit3, Trash2, Flame, BookOpen, Layers, Trophy, ChevronDown, ChevronUp, BarChart3, User, Users
} from 'lucide-react';
import SkillRubricModal from './SkillRubricModal';
import { calculateInterchangeIQGrade, Gender, AgeGroup, INTERCHANGE_IQ_SCALE } from '../utils/interchangeIQRubric';
import { evaluatePlayerPositionalRubric } from '../utils/aflPositionalRubric';

function parseSeconds(val?: string): number | null {
  if (!val) return null;
  const cleaned = val.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseTimeToSeconds(val?: string): number | null {
  if (!val) return null;
  const parts = val.trim().split(':');
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10);
    const s = parseInt(parts[1], 10);
    if (!isNaN(m) && !isNaN(s)) return m * 60 + s;
  }
  return parseSeconds(val);
}

function getPlayerCombineRank(
  playerId: string,
  metric: 'sprint20m' | 'agilityTime' | 'standingVerticalCm' | 'timeTrial2km' | 'kickDistanceMeters',
  assessments: { record: SkillAssessment; player?: Player }[]
) {
  const items = assessments.map(a => {
    let val: number | null = null;
    if (metric === 'sprint20m') val = parseSeconds(a.record.sprint20m);
    else if (metric === 'agilityTime') val = parseSeconds(a.record.agilityTime);
    else if (metric === 'standingVerticalCm') val = a.record.standingVerticalCm || null;
    else if (metric === 'timeTrial2km') val = parseTimeToSeconds(a.record.timeTrial2km);
    else if (metric === 'kickDistanceMeters') val = a.record.kickDistanceMeters || null;
    return { playerId: a.record.playerId, val };
  }).filter(i => i.val !== null) as { playerId: string; val: number }[];

  const isAscending = metric === 'sprint20m' || metric === 'agilityTime' || metric === 'timeTrial2km';
  items.sort((a, b) => isAscending ? a.val - b.val : b.val - a.val);

  const index = items.findIndex(i => i.playerId === playerId);
  if (index === -1) return { rank: null, total: items.length, best: items[0]?.val ?? null };
  return { rank: index + 1, total: items.length, best: items[0]?.val ?? null };
}

interface PlayerGrowthScreenProps {
  players: Player[];
  growthRecords: SkillAssessment[];
  onUpdateGrowthRecords: (records: SkillAssessment[]) => void;
  selectedPlayerId: string | null;
  onSelectPlayerId: (id: string | null) => void;
}

export default function PlayerGrowthScreen({
  players = [],
  growthRecords = [],
  onUpdateGrowthRecords,
  selectedPlayerId,
  onSelectPlayerId,
}: PlayerGrowthScreenProps) {
  const [selectedZone, setSelectedZone] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRubricModal, setShowRubricModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SkillAssessment | null>(null);

  // Dashboard filter & toggle states
  const [dashboardSeasonFilter, setDashboardSeasonFilter] = useState<string>('All');
  const [showDashboardSummary, setShowDashboardSummary] = useState<boolean>(true);

  // Dashboard view scope ('squad' vs 'selected')
  const [dashboardViewScope, setDashboardViewScope] = useState<'squad' | 'selected'>('squad');

  // Interactive Tile Filter for Squad Roster list
  const [tileFilter, setTileFilter] = useState<'all' | 'tested' | 'untested' | 'assessments' | 'kick' | 'elite' | 'advanced' | 'developing' | 'emerging' | 'needsDev'>('all');

  const getFilterLabel = (f: string) => {
    switch (f) {
      case 'tested': return 'Tested Roster';
      case 'assessments': return 'Completed Assessments';
      case 'untested': return 'Untested Roster';
      case 'kick': return 'Kick Penetration Logged';
      case 'elite': return '🟢 Elite Tier (4.5+)';
      case 'advanced': return '🔵 Advanced Tier (3.5 - 4.4)';
      case 'developing': return '🟡 Developing Tier (2.5 - 3.4)';
      case 'emerging': return '🟠 Emerging Tier (1.5 - 2.4)';
      case 'needsDev': return '🔴 Needs Development (< 1.5)';
      default: return 'All Players';
    }
  };

  // Score selection callback from Rubric Modal
  const handleRubricScoreSelect = (
    category: 'kick' | 'oppFoot' | 'handball' | 'marking' | 'tackling' | 'gameSense' | 'fitness',
    score: number
  ) => {
    if (category === 'kick') setFormKickAccuracy(score);
    else if (category === 'oppFoot') setFormOppositeFoot(score);
    else if (category === 'handball') setFormHandball(score);
    else if (category === 'marking') setFormMarking(score);
    else if (category === 'tackling') setFormTackling(score);
    else if (category === 'gameSense') setFormGameSense(score);
    else if (category === 'fitness') setFormFitnessRating(score);
  };

  // Active Player Selection
  const activePlayerId = selectedPlayerId || players[0]?.id || '';
  const activePlayer = players.find((p) => p.id === activePlayerId) || players[0];

  // Assessment Form state
  const [formPlayerId, setFormPlayerId] = useState(activePlayerId);
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formSeasonLabel, setFormSeasonLabel] = useState('2026 Pre-Season');
  
  // InterchangeIQ Demographics
  const [formGender, setFormGender] = useState<Gender>('Female');
  const [formAgeGroup, setFormAgeGroup] = useState<AgeGroup>('U16');

  // Fitness & Combine states
  const [formTimeTrial, setFormTimeTrial] = useState('08:45');
  const [formYoyo, setFormYoyo] = useState('15.0');
  const [formSprint, setFormSprint] = useState('3.45s');
  const [formAgility, setFormAgility] = useState('8.90s');
  const [formVertical, setFormVertical] = useState<number>(48);
  const [formFitnessRating, setFormFitnessRating] = useState(7);
  
  // Kicking states
  const [formPreferredFoot, setFormPreferredFoot] = useState<'Right' | 'Left'>('Right');
  const [formKickDistance, setFormKickDistance] = useState(32);
  const [formKickAccuracy, setFormKickAccuracy] = useState(7);
  const [formOppositeFoot, setFormOppositeFoot] = useState(5);
  
  // Skill ratings
  const [formHandball, setFormHandball] = useState(7);
  const [formMarking, setFormMarking] = useState(7);
  const [formTackling, setFormTackling] = useState(7);
  const [formGameSense, setFormGameSense] = useState(7);

  // Position-Specific Rubric Attributes
  const [formSpoiling, setFormSpoiling] = useState(7);
  const [formOverheadMarking, setFormOverheadMarking] = useState(7);
  const [formCrumbing, setFormCrumbing] = useState(7);
  const [formPressureActs, setFormPressureActs] = useState(7);
  const [formRuckTap, setFormRuckTap] = useState(7);
  const [formLeadingTiming, setFormLeadingTiming] = useState(7);
  const [formSnapGoal, setFormSnapGoal] = useState(7);
  const [formDefensiveTransition, setFormDefensiveTransition] = useState(7);

  // Notes
  const [formGoals, setFormGoals] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Task-focused modal entry state ('fitness' | 'kicking' | 'skills' | 'goals' | 'all')
  const [entryTaskMode, setEntryTaskMode] = useState<'fitness' | 'kicking' | 'skills' | 'goals' | 'all'>('fitness');

  // Live InterchangeIQ Grade Calculation for current Modal Form
  const liveInterchangeIqGrade = calculateInterchangeIQGrade({
    sprint20m: formSprint,
    agilityTime: formAgility,
    standingVerticalCm: formVertical,
    timeTrial2km: formTimeTrial,
    yoyoLevel: formYoyo,
    fitnessRating: formFitnessRating,
    kickAccuracyRating: formKickAccuracy,
    oppositeFootRating: formOppositeFoot,
    handballRating: formHandball,
    markingRating: formMarking,
    tacklingRating: formTackling,
    gameSenseRating: formGameSense,
    gender: formGender,
    ageGroup: formAgeGroup
  });

  // Active player records sorted chronologically
  const playerRecords = growthRecords
    .filter((r) => r.playerId === activePlayerId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const latestRecord = playerRecords[playerRecords.length - 1];
  const earliestRecord = playerRecords[0];

  // Calculate year-on-year deltas for active player
  let kickDistDelta = 0;
  let oppFootDelta = 0;
  let fitnessRatingDelta = 0;

  if (playerRecords.length >= 2 && earliestRecord && latestRecord) {
    kickDistDelta = latestRecord.kickDistanceMeters - earliestRecord.kickDistanceMeters;
    oppFootDelta = latestRecord.oppositeFootRating - earliestRecord.oppositeFootRating;
    fitnessRatingDelta = latestRecord.fitnessRating - earliestRecord.fitnessRating;
  }

  // Dashboard level analytics computations
  const availableSeasons = Array.from(new Set(growthRecords.map(r => r.seasonLabel).filter(Boolean)));
  const filteredDashboardRecords = dashboardSeasonFilter === 'All'
    ? growthRecords
    : growthRecords.filter(r => r.seasonLabel === dashboardSeasonFilter);

  // Latest record per player inside filtered records
  const playerLatestMap = new Map<string, SkillAssessment>();
  filteredDashboardRecords.forEach(rec => {
    const existing = playerLatestMap.get(rec.playerId);
    if (!existing || new Date(rec.date).getTime() > new Date(existing.date).getTime()) {
      playerLatestMap.set(rec.playerId, rec);
    }
  });

  const latestAssessments = Array.from(playerLatestMap.values());
  const evaluatedAssessments = latestAssessments.map(rec => {
    const p = players.find(player => player.id === rec.playerId);
    const grade = calculateInterchangeIQGrade({
      sprint20m: rec.sprint20m,
      agilityTime: rec.agilityTime,
      standingVerticalCm: rec.standingVerticalCm,
      timeTrial2km: rec.timeTrial2km,
      yoyoLevel: rec.yoyoLevel,
      fitnessRating: rec.fitnessRating,
      kickAccuracyRating: rec.kickAccuracyRating,
      oppositeFootRating: rec.oppositeFootRating,
      handballRating: rec.handballRating,
      markingRating: rec.markingRating,
      tacklingRating: rec.tacklingRating,
      gameSenseRating: rec.gameSenseRating,
      gender: rec.gender || p?.gender || 'Female',
      ageGroup: rec.ageGroup || p?.ageGroup || 'U16'
    });
    return { record: rec, player: p, grade };
  });

  // Filtered Players using selectedZone, searchQuery, AND tileFilter
  const filteredPlayers = players.filter((p) => {
    const matchesZone = selectedZone === 'All' || p.primaryZone === selectedZone;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.number.includes(searchQuery);

    let matchesTile = true;
    if (tileFilter === 'tested' || tileFilter === 'assessments') {
      matchesTile = growthRecords.some(r => r.playerId === p.id);
    } else if (tileFilter === 'untested') {
      matchesTile = !growthRecords.some(r => r.playerId === p.id);
    } else if (tileFilter === 'kick') {
      matchesTile = growthRecords.some(r => r.playerId === p.id && r.kickDistanceMeters > 0);
    } else if (['elite', 'advanced', 'developing', 'emerging', 'needsDev'].includes(tileFilter)) {
      const pEval = evaluatedAssessments.find(e => e.player?.id === p.id);
      if (!pEval) {
        matchesTile = false;
      } else {
        const score = pEval.grade.overallScore;
        if (tileFilter === 'elite') matchesTile = score >= 4.5;
        else if (tileFilter === 'advanced') matchesTile = score >= 3.5 && score < 4.5;
        else if (tileFilter === 'developing') matchesTile = score >= 2.5 && score < 3.5;
        else if (tileFilter === 'emerging') matchesTile = score >= 1.5 && score < 2.5;
        else if (tileFilter === 'needsDev') matchesTile = score < 1.5;
      }
    }

    return matchesZone && matchesSearch && matchesTile;
  });

  // Selected Player Combine Data for Dashboard
  const activePlayerLatestRecord = activePlayer ? growthRecords
    .filter(r => r.playerId === activePlayer.id)
    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null;

  const activePlayerGrade = (activePlayer && activePlayerLatestRecord)
    ? calculateInterchangeIQGrade({
        sprint20m: activePlayerLatestRecord.sprint20m,
        agilityTime: activePlayerLatestRecord.agilityTime,
        standingVerticalCm: activePlayerLatestRecord.standingVerticalCm,
        timeTrial2km: activePlayerLatestRecord.timeTrial2km,
        yoyoLevel: activePlayerLatestRecord.yoyoLevel,
        fitnessRating: activePlayerLatestRecord.fitnessRating,
        kickAccuracyRating: activePlayerLatestRecord.kickAccuracyRating,
        oppositeFootRating: activePlayerLatestRecord.oppositeFootRating,
        handballRating: activePlayerLatestRecord.handballRating,
        markingRating: activePlayerLatestRecord.markingRating,
        tacklingRating: activePlayerLatestRecord.tacklingRating,
        gameSenseRating: activePlayerLatestRecord.gameSenseRating,
        gender: activePlayerLatestRecord.gender || activePlayer.gender || 'Female',
        ageGroup: activePlayerLatestRecord.ageGroup || activePlayer.ageGroup || 'U16'
      })
    : null;

  const activeSprintRank = activePlayer ? getPlayerCombineRank(activePlayer.id, 'sprint20m', evaluatedAssessments) : null;
  const activeAgilityRank = activePlayer ? getPlayerCombineRank(activePlayer.id, 'agilityTime', evaluatedAssessments) : null;
  const activeVerticalRank = activePlayer ? getPlayerCombineRank(activePlayer.id, 'standingVerticalCm', evaluatedAssessments) : null;
  const activeTimeTrialRank = activePlayer ? getPlayerCombineRank(activePlayer.id, 'timeTrial2km', evaluatedAssessments) : null;
  const activeKickRank = activePlayer ? getPlayerCombineRank(activePlayer.id, 'kickDistanceMeters', evaluatedAssessments) : null;

  // Calculate squad average InterchangeIQ score
  const teamAvgScore = evaluatedAssessments.length > 0
    ? (evaluatedAssessments.reduce((acc, curr) => acc + curr.grade.overallScore, 0) / evaluatedAssessments.length).toFixed(1)
    : 'N/A';

  const teamAvgKickDist = evaluatedAssessments.length > 0
    ? Math.round(evaluatedAssessments.reduce((acc, curr) => acc + curr.record.kickDistanceMeters, 0) / evaluatedAssessments.length)
    : 0;

  const teamAvgOppFoot = evaluatedAssessments.length > 0
    ? (evaluatedAssessments.reduce((acc, curr) => acc + curr.record.oppositeFootRating, 0) / evaluatedAssessments.length).toFixed(1)
    : '0.0';

  // Tier distribution counts
  const tierDistribution = {
    elite: evaluatedAssessments.filter(e => e.grade.overallScore >= 4.5).length,
    advanced: evaluatedAssessments.filter(e => e.grade.overallScore >= 3.5 && e.grade.overallScore < 4.5).length,
    developing: evaluatedAssessments.filter(e => e.grade.overallScore >= 2.5 && e.grade.overallScore < 3.5).length,
    emerging: evaluatedAssessments.filter(e => e.grade.overallScore >= 1.5 && e.grade.overallScore < 2.5).length,
    needsDev: evaluatedAssessments.filter(e => e.grade.overallScore < 1.5).length,
  };

  // Combine Leaders
  let fastestSprintItem: { player?: Player; record?: SkillAssessment; time: number; strVal: string } | null = null;
  let fastestAgilityItem: { player?: Player; record?: SkillAssessment; time: number; strVal: string } | null = null;
  let highestVerticalItem: { player?: Player; record?: SkillAssessment; cm: number } | null = null;
  let bestTimeTrialItem: { player?: Player; record?: SkillAssessment; sec: number; strVal: string } | null = null;
  let longestKickItem: { player?: Player; record?: SkillAssessment; m: number } | null = null;

  evaluatedAssessments.forEach(({ record, player }) => {
    // Sprint 20m
    const spSec = parseSeconds(record.sprint20m);
    if (spSec !== null && (!fastestSprintItem || spSec < fastestSprintItem.time)) {
      fastestSprintItem = { player, record, time: spSec, strVal: record.sprint20m };
    }
    // Agility
    const agSec = parseSeconds(record.agilityTime);
    if (agSec !== null && (!fastestAgilityItem || agSec < fastestAgilityItem.time)) {
      fastestAgilityItem = { player, record, time: agSec, strVal: record.agilityTime };
    }
    // Vertical Jump
    if (record.standingVerticalCm && (!highestVerticalItem || record.standingVerticalCm > highestVerticalItem.cm)) {
      highestVerticalItem = { player, record, cm: record.standingVerticalCm };
    }
    // 2km Time Trial
    const ttSec = parseTimeToSeconds(record.timeTrial2km);
    if (ttSec !== null && (!bestTimeTrialItem || ttSec < bestTimeTrialItem.sec)) {
      bestTimeTrialItem = { player, record, sec: ttSec, strVal: record.timeTrial2km };
    }
    // Kicking Distance
    if (record.kickDistanceMeters && (!longestKickItem || record.kickDistanceMeters > longestKickItem.m)) {
      longestKickItem = { player, record, m: record.kickDistanceMeters };
    }
  });

  // Open Add Assessment Modal with task mode focus
  const handleOpenAddModal = (
    playerId?: string,
    initialTaskMode: 'fitness' | 'kicking' | 'skills' | 'goals' | 'all' = 'fitness'
  ) => {
    const targetId = playerId || activePlayerId;
    const targetPlayer = players.find(p => p.id === targetId);
    setEditingRecord(null);
    setEntryTaskMode(initialTaskMode);
    setFormPlayerId(targetId);
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormSeasonLabel('2026 Pre-Season');

    setFormGender(targetPlayer?.gender || 'Female');
    setFormAgeGroup(targetPlayer?.ageGroup || 'U16');
    
    // Autofill from latest record if available
    const last = growthRecords.filter(r => r.playerId === targetId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    if (last) {
      setFormPreferredFoot(last.preferredFoot || 'Right');
      setFormKickDistance(last.kickDistanceMeters || 32);
      setFormKickAccuracy(last.kickAccuracyRating || 7);
      setFormOppositeFoot(last.oppositeFootRating || 5);
      setFormTimeTrial(last.timeTrial2km || '08:45');
      setFormYoyo(last.yoyoLevel || '15.0');
      setFormSprint(last.sprint20m || '3.45s');
      setFormAgility(last.agilityTime || '8.90s');
      setFormVertical(last.standingVerticalCm || 48);
      setFormFitnessRating(last.fitnessRating || 7);
      setFormHandball(last.handballRating || 7);
      setFormMarking(last.markingRating || 7);
      setFormTackling(last.tacklingRating || 7);
      setFormGameSense(last.gameSenseRating || 7);
      setFormSpoiling(last.spoilingRating || 7);
      setFormOverheadMarking(last.overheadMarkingRating || 7);
      setFormCrumbing(last.crumbingRating || 7);
      setFormPressureActs(last.pressureActsRating || 7);
      setFormRuckTap(last.ruckTapRating || 7);
      setFormLeadingTiming(last.leadingTimingRating || 7);
      setFormSnapGoal(last.snapGoalRating || 7);
      setFormDefensiveTransition(last.defensiveTransitionRating || 7);
      setFormGoals(last.developmentGoals || '');
      setFormNotes('');
    } else {
      setFormPreferredFoot('Right');
      setFormKickDistance(30);
      setFormKickAccuracy(7);
      setFormOppositeFoot(5);
      setFormTimeTrial('08:45');
      setFormYoyo('15.0');
      setFormSprint('3.45s');
      setFormAgility('8.90s');
      setFormVertical(48);
      setFormFitnessRating(7);
      setFormHandball(7);
      setFormMarking(7);
      setFormTackling(7);
      setFormGameSense(7);
      setFormSpoiling(7);
      setFormOverheadMarking(7);
      setFormCrumbing(7);
      setFormPressureActs(7);
      setFormRuckTap(7);
      setFormLeadingTiming(7);
      setFormSnapGoal(7);
      setFormDefensiveTransition(7);
      setFormGoals('');
      setFormNotes('');
    }
    setShowAddModal(true);
  };

  const handleOpenEditModal = (record: SkillAssessment) => {
    const targetPlayer = players.find(p => p.id === record.playerId);
    setEditingRecord(record);
    setEntryTaskMode('all');
    setFormPlayerId(record.playerId);
    setFormDate(record.date);
    setFormSeasonLabel(record.seasonLabel);
    setFormGender(record.gender || targetPlayer?.gender || 'Female');
    setFormAgeGroup(record.ageGroup || targetPlayer?.ageGroup || 'U16');
    setFormPreferredFoot(record.preferredFoot);
    setFormKickDistance(record.kickDistanceMeters);
    setFormKickAccuracy(record.kickAccuracyRating);
    setFormOppositeFoot(record.oppositeFootRating);
    setFormTimeTrial(record.timeTrial2km || '');
    setFormYoyo(record.yoyoLevel || '');
    setFormSprint(record.sprint20m || '');
    setFormAgility(record.agilityTime || '8.90s');
    setFormVertical(record.standingVerticalCm || 48);
    setFormFitnessRating(record.fitnessRating);
    setFormHandball(record.handballRating);
    setFormMarking(record.markingRating);
    setFormTackling(record.tacklingRating);
    setFormGameSense(record.gameSenseRating);
    setFormSpoiling(record.spoilingRating || 7);
    setFormOverheadMarking(record.overheadMarkingRating || 7);
    setFormCrumbing(record.crumbingRating || 7);
    setFormPressureActs(record.pressureActsRating || 7);
    setFormRuckTap(record.ruckTapRating || 7);
    setFormLeadingTiming(record.leadingTimingRating || 7);
    setFormSnapGoal(record.snapGoalRating || 7);
    setFormDefensiveTransition(record.defensiveTransitionRating || 7);
    setFormGoals(record.developmentGoals || '');
    setFormNotes(record.coachNotes || '');
    setShowAddModal(true);
  };

  const handleSaveAssessment = () => {
    if (!formPlayerId) return;

    const grading = calculateInterchangeIQGrade({
      sprint20m: formSprint,
      agilityTime: formAgility,
      standingVerticalCm: formVertical,
      timeTrial2km: formTimeTrial,
      yoyoLevel: formYoyo,
      fitnessRating: formFitnessRating,
      kickAccuracyRating: formKickAccuracy,
      oppositeFootRating: formOppositeFoot,
      handballRating: formHandball,
      markingRating: formMarking,
      tacklingRating: formTackling,
      gameSenseRating: formGameSense,
      gender: formGender,
      ageGroup: formAgeGroup
    });

    const assessmentData: SkillAssessment = {
      id: editingRecord ? editingRecord.id : `growth-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      playerId: formPlayerId,
      date: formDate,
      seasonLabel: formSeasonLabel.trim() || 'Pre-Season Benchmark',
      gender: formGender,
      ageGroup: formAgeGroup,
      timeTrial2km: formTimeTrial.trim(),
      yoyoLevel: formYoyo.trim(),
      sprint20m: formSprint.trim(),
      agilityTime: formAgility.trim(),
      standingVerticalCm: Number(formVertical) || 45,
      fitnessRating: formFitnessRating,
      preferredFoot: formPreferredFoot,
      kickDistanceMeters: Number(formKickDistance) || 30,
      kickAccuracyRating: formKickAccuracy,
      oppositeFootRating: formOppositeFoot,
      handballRating: formHandball,
      markingRating: formMarking,
      tacklingRating: formTackling,
      gameSenseRating: formGameSense,
      spoilingRating: formSpoiling,
      overheadMarkingRating: formOverheadMarking,
      crumbingRating: formCrumbing,
      pressureActsRating: formPressureActs,
      ruckTapRating: formRuckTap,
      leadingTimingRating: formLeadingTiming,
      snapGoalRating: formSnapGoal,
      defensiveTransitionRating: formDefensiveTransition,
      overallInterchangeIqScore: grading.overallScore,
      overallRatingBadge: grading.overallTier.title as any,
      developmentGoals: formGoals.trim(),
      coachNotes: formNotes.trim(),
    };

    if (editingRecord) {
      onUpdateGrowthRecords(growthRecords.map(r => r.id === editingRecord.id ? assessmentData : r));
    } else {
      onUpdateGrowthRecords([...growthRecords, assessmentData]);
    }

    setShowAddModal(false);
  };

  const handleDeleteAssessment = (id: string) => {
    if (!window.confirm('Delete this assessment record?')) return;
    onUpdateGrowthRecords(growthRecords.filter(r => r.id !== id));
  };

  // Team-wide statistics
  const totalAssessments = growthRecords.length;
  const testedPlayerIds = new Set(growthRecords.map(r => r.playerId));
  const squadTestedCount = testedPlayerIds.size;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[var(--navy)] via-[#102A43] to-indigo-900 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-400/20 via-transparent to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>AFL Girls Year-on-Year Progression</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">
              Player Growth & Skill Testing
            </h2>
            <p className="text-xs md:text-sm text-blue-200/90 font-medium max-w-2xl leading-relaxed">
              Track individual player evolution across aerobic fitness, 2km time trials, dominant kicking distance, and non-preferred foot mastery.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <button
              onClick={() => setShowRubricModal(true)}
              className="px-3.5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              title="View Standardized AFL Skill Scoring Rubrics"
            >
              <BookOpen className="w-4 h-4 text-slate-950" />
              <span>📖 Skill Rubrics</span>
            </button>
            <button
              onClick={() => handleOpenAddModal(activePlayerId, 'fitness')}
              className="px-3.5 py-2.5 bg-indigo-500/30 hover:bg-indigo-500/40 border border-indigo-400/30 text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              title="Log 2km Time Trial & Fitness Test"
            >
              <span>🏃 Log 2km Fitness</span>
            </button>
            <button
              onClick={() => handleOpenAddModal(activePlayerId, 'kicking')}
              className="px-3.5 py-2.5 bg-amber-500/30 hover:bg-amber-500/40 border border-amber-400/30 text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              title="Log Kicking & Opposite Foot"
            >
              <span>🦵 Log Kicking</span>
            </button>
            <button
              onClick={() => handleOpenAddModal(activePlayerId, 'all')}
              className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" />
              <span>Full Benchmark</span>
            </button>
          </div>
        </div>

        {/* Squad Header Summary Line (Interactive Filter Tiles) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <button
            onClick={() => setTileFilter(tileFilter === 'tested' ? 'all' : 'tested')}
            className={`p-3 rounded-2xl text-left transition cursor-pointer border ${
              tileFilter === 'tested'
                ? 'bg-blue-500/25 border-blue-400 ring-2 ring-blue-400/80 shadow-md scale-[1.01]'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider block">Tested Roster</span>
              {tileFilter === 'tested' && <span className="text-[9px] bg-blue-400 text-slate-950 font-black px-1.5 py-0.5 rounded uppercase">Filtered</span>}
            </div>
            <span className="text-lg font-black text-white">{squadTestedCount} / {players.length} Players</span>
            <span className="text-[10px] text-blue-200/70 block mt-0.5">Click to filter tested list</span>
          </button>

          <button
            onClick={() => setTileFilter(tileFilter === 'assessments' ? 'all' : 'assessments')}
            className={`p-3 rounded-2xl text-left transition cursor-pointer border ${
              tileFilter === 'assessments'
                ? 'bg-indigo-500/25 border-indigo-400 ring-2 ring-indigo-400/80 shadow-md scale-[1.01]'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">Total Assessments</span>
              {tileFilter === 'assessments' && <span className="text-[9px] bg-indigo-400 text-slate-950 font-black px-1.5 py-0.5 rounded uppercase">Filtered</span>}
            </div>
            <span className="text-lg font-black text-white">{totalAssessments} Completed</span>
            <span className="text-[10px] text-indigo-200/70 block mt-0.5">Click to view roster with logs</span>
          </button>

          <button
            onClick={() => setTileFilter(tileFilter === 'tested' ? 'all' : 'tested')}
            className={`p-3 rounded-2xl text-left transition cursor-pointer border ${
              tileFilter === 'tested'
                ? 'bg-emerald-500/25 border-emerald-400 ring-2 ring-emerald-400/80 shadow-md scale-[1.01]'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">Squad Avg Rating</span>
              {tileFilter === 'tested' && <span className="text-[9px] bg-emerald-400 text-slate-950 font-black px-1.5 py-0.5 rounded uppercase">Filtered</span>}
            </div>
            <span className="text-lg font-black text-emerald-400">{teamAvgScore} / 5.0</span>
            <span className="text-[10px] text-emerald-200/70 block mt-0.5">Click to filter tested players</span>
          </button>

          <button
            onClick={() => setTileFilter(tileFilter === 'kick' ? 'all' : 'kick')}
            className={`p-3 rounded-2xl text-left transition cursor-pointer border ${
              tileFilter === 'kick'
                ? 'bg-amber-500/25 border-amber-400 ring-2 ring-amber-400/80 shadow-md scale-[1.01]'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">Avg Kick Penetration</span>
              {tileFilter === 'kick' && <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded uppercase">Filtered</span>}
            </div>
            <span className="text-lg font-black text-amber-300">{teamAvgKickDist}m ({teamAvgOppFoot}/10 Opp Foot)</span>
            <span className="text-[10px] text-amber-200/70 block mt-0.5">Click to filter kicking logs</span>
          </button>
        </div>
      </div>

      {/* COMBINE & TESTING SUMMARY DASHBOARD */}
      <div className="bg-white rounded-3xl border border-[var(--line)] p-6 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                <span>Combine & Skills Testing Summary Dashboard</span>
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-lg border border-emerald-200">
                  InterchangeIQ Grading
                </span>
              </h3>
              <p className="text-xs text-gray-500 font-semibold mt-0.5">
                Physical combine benchmarks, skill evaluations, and interchange tier analytics.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Scope Switcher: All Squad vs Selected Player Dropdown */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200">
              <button
                onClick={() => setDashboardViewScope('squad')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                  dashboardViewScope === 'squad'
                    ? 'bg-white text-indigo-900 shadow-sm border border-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>👥 Squad Overview</span>
              </button>

              <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
                dashboardViewScope === 'selected'
                  ? 'bg-white text-indigo-900 shadow-sm border border-gray-200'
                  : 'text-gray-600 hover:text-gray-900'
              }`}>
                <User className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <select
                  value={dashboardViewScope === 'selected' ? activePlayerId : ''}
                  onChange={(e) => {
                    const newId = e.target.value;
                    if (newId) {
                      onSelectPlayerId(newId);
                      setDashboardViewScope('selected');
                    }
                  }}
                  className="bg-transparent text-xs font-black text-gray-900 border-none outline-none cursor-pointer pr-1 py-0.5"
                >
                  <option value="" disabled={dashboardViewScope === 'selected'}>
                    Select Player...
                  </option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.number} {p.name} ({p.primaryZone})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 pointer-events-none -ml-1" />
              </div>
            </div>

            {/* Season Filter Dropdown */}
            {availableSeasons.length > 0 && (
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-bold text-gray-500">Event:</span>
                <select
                  value={dashboardSeasonFilter}
                  onChange={(e) => setDashboardSeasonFilter(e.target.value)}
                  className="bg-transparent text-xs font-black text-gray-800 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Testing Events ({growthRecords.length})</option>
                  {availableSeasons.map(season => (
                    <option key={season} value={season}>{season}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => setShowDashboardSummary(!showDashboardSummary)}
              className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition cursor-pointer"
              title={showDashboardSummary ? "Collapse Dashboard" : "Expand Dashboard"}
            >
              {showDashboardSummary ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {showDashboardSummary && (
          <div className="space-y-6">
            {dashboardViewScope === 'selected' ? (
              /* SELECTED PLAYER COMBINE DASHBOARD */
              <div className="space-y-5">
                {/* Selected Player Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-sm border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 font-black text-lg flex items-center justify-center shadow-md">
                      #{activePlayer?.number}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-white">{activePlayer?.name}</h4>
                        <span className="px-2 py-0.5 bg-white/10 text-amber-300 text-[10px] font-extrabold rounded-md uppercase">
                          {activePlayer?.primaryZone}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-medium mt-0.5">
                        {activePlayerLatestRecord
                          ? `Latest Assessment: ${activePlayerLatestRecord.date} (${activePlayerLatestRecord.seasonLabel})`
                          : 'No combine testing record logged yet.'}
                      </p>
                    </div>
                  </div>

                  {activePlayerGrade && (
                    <div className="flex items-center gap-3 self-start sm:self-center bg-white/10 px-4 py-2 rounded-xl border border-white/15">
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-300 uppercase block">InterchangeIQ Grade</span>
                        <span className="text-base font-black text-amber-300">
                          {activePlayerGrade.overallScore.toFixed(1)} / 5.0
                        </span>
                      </div>
                      <div className={`px-3 py-1 rounded-lg text-xs font-black ${activePlayerGrade.overallTier.badgeBg}`}>
                        {activePlayerGrade.overallTier.title}
                      </div>
                    </div>
                  )}
                </div>

                {activePlayerLatestRecord ? (
                  <div className="space-y-5">
                    {/* Selected Player Combine Test Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      {/* 20m Sprint */}
                      <div className="bg-gradient-to-br from-blue-50/90 to-indigo-50/70 border border-blue-200 p-3.5 rounded-2xl relative">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-blue-900">
                            ⚡ 20m Sprint
                          </span>
                          {activeSprintRank?.rank && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-blue-600 text-white rounded-md">
                              Rank #{activeSprintRank.rank} / {activeSprintRank.total}
                            </span>
                          )}
                        </div>
                        <span className="text-2xl font-black text-blue-900 block mt-1">
                          {activePlayerLatestRecord.sprint20m || 'N/A'}
                        </span>
                        <span className="text-[10px] font-semibold text-blue-700 block mt-1">
                          Squad Leader: <b className="font-extrabold text-blue-900">{fastestSprintItem?.strVal || 'N/A'}</b>
                        </span>
                      </div>

                      {/* Agility Shuttle */}
                      <div className="bg-gradient-to-br from-purple-50/90 to-indigo-50/70 border border-purple-200 p-3.5 rounded-2xl relative">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-purple-900">
                            🏃 Agility Shuttle
                          </span>
                          {activeAgilityRank?.rank && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-purple-600 text-white rounded-md">
                              Rank #{activeAgilityRank.rank} / {activeAgilityRank.total}
                            </span>
                          )}
                        </div>
                        <span className="text-2xl font-black text-purple-900 block mt-1">
                          {activePlayerLatestRecord.agilityTime || 'N/A'}
                        </span>
                        <span className="text-[10px] font-semibold text-purple-700 block mt-1">
                          Squad Leader: <b className="font-extrabold text-purple-900">{fastestAgilityItem?.strVal || 'N/A'}</b>
                        </span>
                      </div>

                      {/* Vertical Jump */}
                      <div className="bg-gradient-to-br from-amber-50/90 to-orange-50/70 border border-amber-200 p-3.5 rounded-2xl relative">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-900">
                            🦘 Standing Vertical
                          </span>
                          {activeVerticalRank?.rank && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-amber-600 text-white rounded-md">
                              Rank #{activeVerticalRank.rank} / {activeVerticalRank.total}
                            </span>
                          )}
                        </div>
                        <span className="text-2xl font-black text-amber-900 block mt-1">
                          {activePlayerLatestRecord.standingVerticalCm ? `${activePlayerLatestRecord.standingVerticalCm} cm` : 'N/A'}
                        </span>
                        <span className="text-[10px] font-semibold text-amber-700 block mt-1">
                          Squad Leader: <b className="font-extrabold text-amber-900">{highestVerticalItem?.cm ? `${highestVerticalItem.cm} cm` : 'N/A'}</b>
                        </span>
                      </div>

                      {/* 2km Time Trial */}
                      <div className="bg-gradient-to-br from-emerald-50/90 to-teal-50/70 border border-emerald-200 p-3.5 rounded-2xl relative">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900">
                            🫁 2km Aerobic Trial
                          </span>
                          {activeTimeTrialRank?.rank && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-emerald-600 text-white rounded-md">
                              Rank #{activeTimeTrialRank.rank} / {activeTimeTrialRank.total}
                            </span>
                          )}
                        </div>
                        <span className="text-2xl font-black text-emerald-900 block mt-1">
                          {activePlayerLatestRecord.timeTrial2km || 'N/A'}
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-700 block mt-1">
                          Yo-Yo Level: <b className="font-extrabold text-emerald-900">{activePlayerLatestRecord.yoyoLevel || 'N/A'}</b>
                        </span>
                      </div>

                      {/* Kick Penetration */}
                      <div className="bg-gradient-to-br from-rose-50/90 to-pink-50/70 border border-rose-200 p-3.5 rounded-2xl relative">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-rose-900">
                            🦵 Kicking Penetration
                          </span>
                          {activeKickRank?.rank && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-rose-600 text-white rounded-md">
                              Rank #{activeKickRank.rank} / {activeKickRank.total}
                            </span>
                          )}
                        </div>
                        <span className="text-2xl font-black text-rose-900 block mt-1">
                          {activePlayerLatestRecord.kickDistanceMeters ? `${activePlayerLatestRecord.kickDistanceMeters}m` : 'N/A'}
                        </span>
                        <span className="text-[10px] font-semibold text-rose-700 block mt-1">
                          Opp Foot: <b className="font-extrabold text-rose-900">{activePlayerLatestRecord.oppositeFootRating || 0}/10</b>
                        </span>
                      </div>
                    </div>

                    {/* Skill Breakdown Grid for Selected Player */}
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                        <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-amber-500" />
                          <span>{activePlayer.name}'s AFL Skill & Physical Benchmark Profile</span>
                        </h4>
                        <button
                          onClick={() => handleOpenAddModal(activePlayer.id, 'all')}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Log New Test</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                          <span className="text-[10px] font-bold text-gray-500 block uppercase">Dominant Kick</span>
                          <span className="text-sm font-black text-gray-900 block">{activePlayerLatestRecord.kickDistanceMeters} meters</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                          <span className="text-[10px] font-bold text-gray-500 block uppercase">Kick Accuracy</span>
                          <span className="text-sm font-black text-indigo-600 block">{activePlayerLatestRecord.kickAccuracyRating} / 10</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                          <span className="text-[10px] font-bold text-gray-500 block uppercase">Opposite Foot</span>
                          <span className="text-sm font-black text-amber-600 block">{activePlayerLatestRecord.oppositeFootRating} / 10</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                          <span className="text-[10px] font-bold text-gray-500 block uppercase">Handball Skills</span>
                          <span className="text-sm font-black text-blue-600 block">{activePlayerLatestRecord.handballRating} / 10</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                          <span className="text-[10px] font-bold text-gray-500 block uppercase">Marking Ability</span>
                          <span className="text-sm font-black text-emerald-600 block">{activePlayerLatestRecord.markingRating} / 10</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                          <span className="text-[10px] font-bold text-gray-500 block uppercase">Tackling & Defense</span>
                          <span className="text-sm font-black text-purple-600 block">{activePlayerLatestRecord.tacklingRating} / 10</span>
                        </div>
                      </div>

                      {/* Positional Skill Ratings Row */}
                      <div className="pt-2 border-t border-gray-200/80">
                        <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block mb-2">
                          Positional Rubric Attributes:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                          <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
                            <span className="text-[9px] font-bold text-gray-500 block">Spoiling</span>
                            <span className="text-xs font-black text-slate-800">{activePlayerLatestRecord.spoilingRating || 7}/10</span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
                            <span className="text-[9px] font-bold text-gray-500 block">Overhead Mark</span>
                            <span className="text-xs font-black text-slate-800">{activePlayerLatestRecord.overheadMarkingRating || 7}/10</span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
                            <span className="text-[9px] font-bold text-gray-500 block">Crumbing</span>
                            <span className="text-xs font-black text-slate-800">{activePlayerLatestRecord.crumbingRating || 7}/10</span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
                            <span className="text-[9px] font-bold text-gray-500 block">Pressure Acts</span>
                            <span className="text-xs font-black text-slate-800">{activePlayerLatestRecord.pressureActsRating || 7}/10</span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
                            <span className="text-[9px] font-bold text-gray-500 block">Ruck Tap</span>
                            <span className="text-xs font-black text-slate-800">{activePlayerLatestRecord.ruckTapRating || 7}/10</span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
                            <span className="text-[9px] font-bold text-gray-500 block">Leading Timing</span>
                            <span className="text-xs font-black text-slate-800">{activePlayerLatestRecord.leadingTimingRating || 7}/10</span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
                            <span className="text-[9px] font-bold text-gray-500 block">Snap Goal</span>
                            <span className="text-xs font-black text-slate-800">{activePlayerLatestRecord.snapGoalRating || 7}/10</span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
                            <span className="text-[9px] font-bold text-gray-500 block">Def Transition</span>
                            <span className="text-xs font-black text-slate-800">{activePlayerLatestRecord.defensiveTransitionRating || 7}/10</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AFL POSITIONAL RUBRIC & RECOMMENDATIONS CARD */}
                    {(() => {
                      const evaluations = evaluatePlayerPositionalRubric(activePlayer, activePlayerLatestRecord);
                      const topChoice = evaluations[0];
                      return (
                        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/60 rounded-2xl p-5 text-white space-y-4 shadow-md">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2.5">
                              <span className="text-2xl">🏉</span>
                              <div>
                                <h4 className="text-sm font-black text-white flex items-center gap-2">
                                  <span>{activePlayer.name}'s Positional Rubric & AI Recommendation</span>
                                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-extrabold uppercase">
                                    {activePlayerLatestRecord.gender || activePlayer.gender || 'Female'} {activePlayerLatestRecord.ageGroup || activePlayer.ageGroup || 'U16'}
                                  </span>
                                </h4>
                                <p className="text-xs text-indigo-200 font-medium">
                                  Mapped against official AFL Boys & Girls Positional Development Rubric
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => setShowRubricModal(true)}
                              className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                              <BookOpen className="w-3.5 h-3.5 text-slate-950" />
                              <span>View Full Rubric</span>
                            </button>
                          </div>

                          {/* Top Recommendations Row */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {evaluations.slice(0, 3).map((ev, idx) => {
                              const isTop = idx === 0;
                              return (
                                <div
                                  key={ev.group.code}
                                  className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2 ${
                                    isTop
                                      ? 'bg-amber-500/10 border-amber-400/80 ring-1 ring-amber-400/40'
                                      : 'bg-white/5 border-white/10'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-lg">{ev.group.iconEmoji}</span>
                                        <span className="font-extrabold text-xs text-white">{ev.group.title}</span>
                                      </div>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                        ev.tier === 'Strong Match' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' :
                                        ev.tier === 'Good Fit' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30' :
                                        'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                                      }`}>
                                        {ev.tier}
                                      </span>
                                    </div>

                                    {/* Score bar */}
                                    <div className="mt-2 space-y-1">
                                      <div className="flex items-center justify-between text-[10px] text-indigo-200 font-bold">
                                        <span>Suitability Score</span>
                                        <span>{ev.suitabilityScore} / 100</span>
                                      </div>
                                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full transition-all duration-500 ${
                                            ev.suitabilityScore >= 80 ? 'bg-emerald-400' : ev.suitabilityScore >= 65 ? 'bg-indigo-400' : 'bg-amber-400'
                                          }`}
                                          style={{ width: `${ev.suitabilityScore}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t border-white/10 text-[10px] text-slate-300 font-medium leading-relaxed">
                                    <strong className="text-white block font-bold mb-0.5">Stage Expectation:</strong>
                                    {ev.ageStageExpectation}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Top Choice Coaching Commentary */}
                          {topChoice && (
                            <div className="bg-indigo-950/80 p-4 rounded-xl border border-indigo-800/80 space-y-2">
                              <div className="flex items-center gap-2 text-amber-300 text-xs font-black uppercase tracking-wider">
                                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                                <span>Why {topChoice.group.title} is Recommended for {activePlayer.name}:</span>
                              </div>
                              <p className="text-xs text-indigo-100 font-medium leading-relaxed">
                                {topChoice.whyComment}
                              </p>
                              <div className="bg-white/5 p-2.5 rounded-lg border border-white/10 text-[11px] text-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <span>
                                  <strong>AFL Age Milestone ({activePlayerLatestRecord.gender || activePlayer.gender || 'Female'} {activePlayerLatestRecord.ageGroup || activePlayer.ageGroup || 'U16'}):</strong> {topChoice.ageStageExpectation}
                                </span>
                                <span className="text-[10px] bg-amber-400/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-300/30 shrink-0">
                                  Focus: {topChoice.growthFocus}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300 space-y-3">
                    <p className="text-sm font-bold text-gray-600">
                      No combine testing records logged for <b>{activePlayer?.name}</b> yet.
                    </p>
                    <button
                      onClick={() => handleOpenAddModal(activePlayer?.id, 'all')}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition cursor-pointer"
                    >
                      + Record First Combine Assessment for {activePlayer?.name}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* SQUAD OVERVIEW DASHBOARD */
              <div className="space-y-6">
                {/* Combine Leaderboards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* 20m Sprint Leader */}
                  <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/60 border border-blue-200/80 p-3.5 rounded-2xl relative overflow-hidden">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 block mb-1">
                      ⚡ 20m Sprint Leader
                    </span>
                    {fastestSprintItem ? (
                      <div>
                        <span className="font-black text-gray-900 text-sm block truncate">
                          {(fastestSprintItem as any).player?.name || 'Unknown'}
                        </span>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-xl font-black text-blue-700">
                            {(fastestSprintItem as any).strVal}
                          </span>
                          <span className="text-[10px] font-bold text-blue-600">
                            #{(fastestSprintItem as any).player?.number}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No sprint data</span>
                    )}
                  </div>

                  {/* Agility Leader */}
                  <div className="bg-gradient-to-br from-purple-50/80 to-indigo-50/60 border border-purple-200/80 p-3.5 rounded-2xl relative overflow-hidden">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-800 block mb-1">
                      🏃 Agility Shuttle Leader
                    </span>
                    {fastestAgilityItem ? (
                      <div>
                        <span className="font-black text-gray-900 text-sm block truncate">
                          {(fastestAgilityItem as any).player?.name || 'Unknown'}
                        </span>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-xl font-black text-purple-700">
                            {(fastestAgilityItem as any).strVal}
                          </span>
                          <span className="text-[10px] font-bold text-purple-600">
                            #{(fastestAgilityItem as any).player?.number}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No agility data</span>
                    )}
                  </div>

                  {/* Vertical Jump Leader */}
                  <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/60 border border-amber-200/80 p-3.5 rounded-2xl relative overflow-hidden">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block mb-1">
                      🦘 Standing Vertical Jump
                    </span>
                    {highestVerticalItem ? (
                      <div>
                        <span className="font-black text-gray-900 text-sm block truncate">
                          {(highestVerticalItem as any).player?.name || 'Unknown'}
                        </span>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-xl font-black text-amber-700">
                            {(highestVerticalItem as any).cm} cm
                          </span>
                          <span className="text-[10px] font-bold text-amber-600">
                            #{(highestVerticalItem as any).player?.number}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No jump data</span>
                    )}
                  </div>

                  {/* 2km Time Trial Leader */}
                  <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/60 border border-emerald-200/80 p-3.5 rounded-2xl relative overflow-hidden">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block mb-1">
                      🫁 2km Aerobic Trial
                    </span>
                    {bestTimeTrialItem ? (
                      <div>
                        <span className="font-black text-gray-900 text-sm block truncate">
                          {(bestTimeTrialItem as any).player?.name || 'Unknown'}
                        </span>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-xl font-black text-emerald-700">
                            {(bestTimeTrialItem as any).strVal}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600">
                            #{(bestTimeTrialItem as any).player?.number}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No time trial data</span>
                    )}
                  </div>

                  {/* Kick Power Leader */}
                  <div className="bg-gradient-to-br from-rose-50/80 to-pink-50/60 border border-rose-200/80 p-3.5 rounded-2xl relative overflow-hidden">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 block mb-1">
                      🦵 Kicking Penetration
                    </span>
                    {longestKickItem ? (
                      <div>
                        <span className="font-black text-gray-900 text-sm block truncate">
                          {(longestKickItem as any).player?.name || 'Unknown'}
                        </span>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-xl font-black text-rose-700">
                            {(longestKickItem as any).m} meters
                          </span>
                          <span className="text-[10px] font-bold text-rose-600">
                            #{(longestKickItem as any).player?.number}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No kicking data</span>
                    )}
                  </div>
                </div>

                {/* InterchangeIQ Squad Tier Breakdown Bar */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-black text-gray-900 uppercase tracking-wider">
                        Squad InterchangeIQ Rating Tier Distribution
                      </span>
                    </div>
                    <span className="text-xs font-bold text-gray-500">
                      Squad Average: <b className="text-indigo-600 font-black">{teamAvgScore} / 5.0</b> ({evaluatedAssessments.length} Evaluated)
                    </span>
                  </div>

                  {/* Visual Distribution Stack Bar */}
                  <div className="w-full h-3.5 bg-gray-200 rounded-full overflow-hidden flex shadow-inner">
                    {evaluatedAssessments.length > 0 ? (
                      <>
                        <div
                          style={{ width: `${(tierDistribution.elite / evaluatedAssessments.length) * 100}%` }}
                          className="h-full bg-emerald-500 hover:opacity-90 transition cursor-pointer"
                          onClick={() => setTileFilter(tileFilter === 'elite' ? 'all' : 'elite')}
                          title={`Click to filter Elite Tier (${tierDistribution.elite})`}
                        />
                        <div
                          style={{ width: `${(tierDistribution.advanced / evaluatedAssessments.length) * 100}%` }}
                          className="h-full bg-blue-500 hover:opacity-90 transition cursor-pointer"
                          onClick={() => setTileFilter(tileFilter === 'advanced' ? 'all' : 'advanced')}
                          title={`Click to filter Advanced Tier (${tierDistribution.advanced})`}
                        />
                        <div
                          style={{ width: `${(tierDistribution.developing / evaluatedAssessments.length) * 100}%` }}
                          className="h-full bg-amber-400 hover:opacity-90 transition cursor-pointer"
                          onClick={() => setTileFilter(tileFilter === 'developing' ? 'all' : 'developing')}
                          title={`Click to filter Developing Tier (${tierDistribution.developing})`}
                        />
                        <div
                          style={{ width: `${(tierDistribution.emerging / evaluatedAssessments.length) * 100}%` }}
                          className="h-full bg-orange-400 hover:opacity-90 transition cursor-pointer"
                          onClick={() => setTileFilter(tileFilter === 'emerging' ? 'all' : 'emerging')}
                          title={`Click to filter Emerging Tier (${tierDistribution.emerging})`}
                        />
                        <div
                          style={{ width: `${(tierDistribution.needsDev / evaluatedAssessments.length) * 100}%` }}
                          className="h-full bg-rose-500 hover:opacity-90 transition cursor-pointer"
                          onClick={() => setTileFilter(tileFilter === 'needsDev' ? 'all' : 'needsDev')}
                          title={`Click to filter Needs Dev (${tierDistribution.needsDev})`}
                        />
                      </>
                    ) : (
                      <div className="w-full h-full bg-gray-200" />
                    )}
                  </div>

                  {/* Tier Legend Pills (Active Filter Buttons) */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-bold">
                    <button
                      onClick={() => setTileFilter(tileFilter === 'elite' ? 'all' : 'elite')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                        tileFilter === 'elite'
                          ? 'bg-emerald-500 text-slate-950 border-emerald-600 ring-2 ring-emerald-400 font-black shadow-sm'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${tileFilter === 'elite' ? 'bg-slate-950' : 'bg-emerald-500'}`} />
                      <span>🟢 Elite Tier (4.5+):</span>
                      <span className={tileFilter === 'elite' ? 'text-slate-950 font-black' : 'text-emerald-700 font-black'}>
                        {tierDistribution.elite}
                      </span>
                    </button>

                    <button
                      onClick={() => setTileFilter(tileFilter === 'advanced' ? 'all' : 'advanced')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                        tileFilter === 'advanced'
                          ? 'bg-blue-500 text-white border-blue-600 ring-2 ring-blue-400 font-black shadow-sm'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${tileFilter === 'advanced' ? 'bg-white' : 'bg-blue-500'}`} />
                      <span>🔵 Advanced (3.5 - 4.4):</span>
                      <span className={tileFilter === 'advanced' ? 'text-white font-black' : 'text-blue-700 font-black'}>
                        {tierDistribution.advanced}
                      </span>
                    </button>

                    <button
                      onClick={() => setTileFilter(tileFilter === 'developing' ? 'all' : 'developing')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                        tileFilter === 'developing'
                          ? 'bg-amber-400 text-slate-950 border-amber-500 ring-2 ring-amber-300 font-black shadow-sm'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-amber-300'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${tileFilter === 'developing' ? 'bg-slate-950' : 'bg-amber-400'}`} />
                      <span>🟡 Developing (2.5 - 3.4):</span>
                      <span className={tileFilter === 'developing' ? 'text-slate-950 font-black' : 'text-amber-700 font-black'}>
                        {tierDistribution.developing}
                      </span>
                    </button>

                    <button
                      onClick={() => setTileFilter(tileFilter === 'emerging' ? 'all' : 'emerging')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                        tileFilter === 'emerging'
                          ? 'bg-orange-500 text-white border-orange-600 ring-2 ring-orange-400 font-black shadow-sm'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${tileFilter === 'emerging' ? 'bg-white' : 'bg-orange-400'}`} />
                      <span>🟠 Emerging (1.5 - 2.4):</span>
                      <span className={tileFilter === 'emerging' ? 'text-white font-black' : 'text-orange-700 font-black'}>
                        {tierDistribution.emerging}
                      </span>
                    </button>

                    <button
                      onClick={() => setTileFilter(tileFilter === 'needsDev' ? 'all' : 'needsDev')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                        tileFilter === 'needsDev'
                          ? 'bg-rose-500 text-white border-rose-600 ring-2 ring-rose-400 font-black shadow-sm'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-rose-300'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${tileFilter === 'needsDev' ? 'bg-white' : 'bg-rose-500'}`} />
                      <span>🔴 Needs Dev (&lt; 1.5):</span>
                      <span className={tileFilter === 'needsDev' ? 'text-white font-black' : 'text-rose-700 font-black'}>
                        {tierDistribution.needsDev}
                      </span>
                    </button>

                    {tileFilter !== 'all' && (
                      <button
                        onClick={() => setTileFilter('all')}
                        className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-[10px] font-black rounded-xl transition cursor-pointer ml-auto flex items-center gap-1"
                      >
                        <span>Clear Tile Filter ({filteredPlayers.length} matched)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Grid: Player Selector Sidebar & Detailed Progression View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Squad Player List & Filter */}
        <div className="bg-white rounded-2xl border border-[var(--line)] shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-[var(--navy)]">Squad Progression Roster</h3>
              <span className="text-[10px] font-bold text-[var(--muted)]">{filteredPlayers.length} Players</span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search player name or #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
              />
            </div>

            {/* Zone Filter */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              {['All', 'FWD', 'MID', 'DEF', 'RUCK'].map((zone) => (
                <button
                  key={zone}
                  onClick={() => setSelectedZone(zone)}
                  className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition shrink-0 ${
                    selectedZone === zone
                      ? 'bg-[var(--blue)] text-white'
                      : 'bg-gray-100 text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {zone}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[580px] overflow-y-auto divide-y divide-gray-100">
            {filteredPlayers.map((p) => {
              const isActive = activePlayerId === p.id;
              const pRecords = growthRecords.filter((r) => r.playerId === p.id);
              const recCount = pRecords.length;
              const latest = pRecords.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

              return (
                <div
                  key={p.id}
                  onClick={() => onSelectPlayerId(p.id)}
                  className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition ${
                    isActive ? 'bg-[#FFF8E6] border-l-4 border-[#F59E0B]' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0 ${
                      p.primaryZone === 'FWD' ? 'bg-[#E5484D]' :
                      p.primaryZone === 'DEF' ? 'bg-[#16a765]' :
                      p.primaryZone === 'RUCK' ? 'bg-[#8B5CF6]' : 'bg-[#4C6FFF]'
                    }`}>
                      #{p.number}
                    </div>
                    <div>
                      <b className="text-xs font-black text-[var(--ink)] block">
                        {p.name}
                      </b>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-extrabold text-[var(--muted)] uppercase">
                          {p.primaryZone}
                        </span>
                        {latest && (
                          <span className="text-[10px] font-mono text-emerald-600 font-bold">
                            🦵 {latest.kickDistanceMeters}m
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 text-[9px] font-black rounded-md ${
                      recCount > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {recCount} {recCount === 1 ? 'Test' : 'Tests'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Player Detailed Growth & YoY Card */}
        <div className="lg:col-span-2 space-y-6">
          {activePlayer ? (
            <div className="bg-white p-6 rounded-3xl border border-[var(--line)] shadow-sm space-y-6">
              
              {/* Player Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-[var(--navy)] to-[var(--blue)] text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-md">
                    #{activePlayer.number}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-gray-900 tracking-tight">
                        {activePlayer.name}
                      </h3>
                      <span className="px-2.5 py-0.5 bg-[#EEF0FF] text-[var(--blue)] font-black text-[10px] rounded-lg uppercase">
                        {activePlayer.primaryZone}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-semibold mt-1">
                      Year-on-Year Growth & InterchangeIQ Skill Grading
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenAddModal(activePlayer.id)}
                    className="px-3.5 py-2 bg-[var(--blue)] hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Log Test</span>
                  </button>
                </div>
              </div>

              {/* DEDICATED PLAYER YoY DETAIL CARD */}
              {playerRecords.length >= 2 && earliestRecord && latestRecord ? (() => {
                const earliestGrade = calculateInterchangeIQGrade({
                  sprint20m: earliestRecord.sprint20m,
                  agilityTime: earliestRecord.agilityTime,
                  standingVerticalCm: earliestRecord.standingVerticalCm,
                  timeTrial2km: earliestRecord.timeTrial2km,
                  yoyoLevel: earliestRecord.yoyoLevel,
                  fitnessRating: earliestRecord.fitnessRating,
                  kickAccuracyRating: earliestRecord.kickAccuracyRating,
                  oppositeFootRating: earliestRecord.oppositeFootRating,
                  handballRating: earliestRecord.handballRating,
                  markingRating: earliestRecord.markingRating,
                  tacklingRating: earliestRecord.tacklingRating,
                  gameSenseRating: earliestRecord.gameSenseRating,
                  gender: earliestRecord.gender || activePlayer?.gender || 'Female',
                  ageGroup: earliestRecord.ageGroup || activePlayer?.ageGroup || 'U16'
                });

                const latestGrade = calculateInterchangeIQGrade({
                  sprint20m: latestRecord.sprint20m,
                  agilityTime: latestRecord.agilityTime,
                  standingVerticalCm: latestRecord.standingVerticalCm,
                  timeTrial2km: latestRecord.timeTrial2km,
                  yoyoLevel: latestRecord.yoyoLevel,
                  fitnessRating: latestRecord.fitnessRating,
                  kickAccuracyRating: latestRecord.kickAccuracyRating,
                  oppositeFootRating: latestRecord.oppositeFootRating,
                  handballRating: latestRecord.handballRating,
                  markingRating: latestRecord.markingRating,
                  tacklingRating: latestRecord.tacklingRating,
                  gameSenseRating: latestRecord.gameSenseRating,
                  gender: latestRecord.gender || activePlayer?.gender || 'Female',
                  ageGroup: latestRecord.ageGroup || activePlayer?.ageGroup || 'U16'
                });

                const gradeDelta = (latestGrade.overallScore - earliestGrade.overallScore).toFixed(1);
                const isGradeUp = Number(gradeDelta) >= 0;

                const spEarly = parseSeconds(earliestRecord.sprint20m);
                const spLate = parseSeconds(latestRecord.sprint20m);
                const spDelta = (spEarly !== null && spLate !== null) ? (spLate - spEarly).toFixed(2) : null;

                const agEarly = parseSeconds(earliestRecord.agilityTime);
                const agLate = parseSeconds(latestRecord.agilityTime);
                const agDelta = (agEarly !== null && agLate !== null) ? (agLate - agEarly).toFixed(2) : null;

                const vertDelta = (latestRecord.standingVerticalCm && earliestRecord.standingVerticalCm)
                  ? latestRecord.standingVerticalCm - earliestRecord.standingVerticalCm
                  : null;

                return (
                  <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 shadow-lg border border-indigo-950 space-y-5">
                    {/* YoY Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-800/50 pb-4">
                      <div>
                        <span className="text-[10px] font-black uppercase text-indigo-300 tracking-wider block">
                          Year-on-Year (YoY) Growth Detail Card
                        </span>
                        <h4 className="text-base font-black text-white flex items-center gap-2 mt-0.5">
                          <span>{earliestRecord.seasonLabel}</span>
                          <span className="text-indigo-400">➔</span>
                          <span>{latestRecord.seasonLabel}</span>
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <div>
                          <span className="text-[9px] font-black uppercase text-indigo-200 block">Grade Progression</span>
                          <span className="font-black text-xs text-white">
                            {earliestGrade.overallTier.title} ({earliestGrade.overallScore}) ➔ {latestGrade.overallTier.title} ({latestGrade.overallScore})
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ml-1 ${
                          isGradeUp ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                        }`}>
                          {isGradeUp ? `+${gradeDelta} Pts` : `${gradeDelta} Pts`}
                        </span>
                      </div>
                    </div>

                    {/* YoY Side-by-Side Comparison Table */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-white/10 text-indigo-200 font-black text-[10px] uppercase border-b border-white/10">
                            <th className="p-3">Combine Metric</th>
                            <th className="p-3">{earliestRecord.seasonLabel}</th>
                            <th className="p-3">{latestRecord.seasonLabel}</th>
                            <th className="p-3 text-right">YoY Delta Gain</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-medium">
                          {/* 20m Sprint */}
                          <tr className="hover:bg-white/5 transition">
                            <td className="p-3 font-bold text-blue-200 flex items-center gap-1.5">
                              <span>⚡ 20m Sprint</span>
                            </td>
                            <td className="p-3 text-gray-300">{earliestRecord.sprint20m || 'N/A'}</td>
                            <td className="p-3 font-bold text-white">{latestRecord.sprint20m || 'N/A'}</td>
                            <td className="p-3 text-right">
                              {spDelta !== null ? (
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                  Number(spDelta) <= 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300'
                                }`}>
                                  {Number(spDelta) <= 0 ? `${spDelta}s (Faster)` : `+${spDelta}s`}
                                </span>
                              ) : '-'}
                            </td>
                          </tr>

                          {/* Agility Shuttle */}
                          <tr className="hover:bg-white/5 transition">
                            <td className="p-3 font-bold text-purple-200 flex items-center gap-1.5">
                              <span>🏃 Agility Shuttle</span>
                            </td>
                            <td className="p-3 text-gray-300">{earliestRecord.agilityTime || 'N/A'}</td>
                            <td className="p-3 font-bold text-white">{latestRecord.agilityTime || 'N/A'}</td>
                            <td className="p-3 text-right">
                              {agDelta !== null ? (
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                  Number(agDelta) <= 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300'
                                }`}>
                                  {Number(agDelta) <= 0 ? `${agDelta}s (Faster)` : `+${agDelta}s`}
                                </span>
                              ) : '-'}
                            </td>
                          </tr>

                          {/* Standing Vertical Jump */}
                          <tr className="hover:bg-white/5 transition">
                            <td className="p-3 font-bold text-amber-200 flex items-center gap-1.5">
                              <span>🦘 Standing Vertical</span>
                            </td>
                            <td className="p-3 text-gray-300">{earliestRecord.standingVerticalCm ? `${earliestRecord.standingVerticalCm} cm` : 'N/A'}</td>
                            <td className="p-3 font-bold text-white">{latestRecord.standingVerticalCm ? `${latestRecord.standingVerticalCm} cm` : 'N/A'}</td>
                            <td className="p-3 text-right">
                              {vertDelta !== null ? (
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                  vertDelta >= 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300'
                                }`}>
                                  {vertDelta >= 0 ? `+${vertDelta} cm` : `${vertDelta} cm`}
                                </span>
                              ) : '-'}
                            </td>
                          </tr>

                          {/* Kicking Distance */}
                          <tr className="hover:bg-white/5 transition">
                            <td className="p-3 font-bold text-emerald-200 flex items-center gap-1.5">
                              <span>🦵 Kick Distance</span>
                            </td>
                            <td className="p-3 text-gray-300">{earliestRecord.kickDistanceMeters} meters</td>
                            <td className="p-3 font-bold text-white">{latestRecord.kickDistanceMeters} meters</td>
                            <td className="p-3 text-right">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                kickDistDelta >= 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300'
                              }`}>
                                {kickDistDelta >= 0 ? `+${kickDistDelta} meters` : `${kickDistDelta} meters`}
                              </span>
                            </td>
                          </tr>

                          {/* Opposite Foot Rating */}
                          <tr className="hover:bg-white/5 transition">
                            <td className="p-3 font-bold text-amber-200 flex items-center gap-1.5">
                              <span>⭐ Opposite Foot</span>
                            </td>
                            <td className="p-3 text-gray-300">{earliestRecord.oppositeFootRating} / 10</td>
                            <td className="p-3 font-bold text-white">{latestRecord.oppositeFootRating} / 10</td>
                            <td className="p-3 text-right">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                oppFootDelta >= 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300'
                              }`}>
                                {oppFootDelta >= 0 ? `+${oppFootDelta.toFixed(1)} Pts` : `${oppFootDelta.toFixed(1)} Pts`}
                              </span>
                            </td>
                          </tr>

                          {/* 2km Time Trial */}
                          <tr className="hover:bg-white/5 transition">
                            <td className="p-3 font-bold text-indigo-200 flex items-center gap-1.5">
                              <span>🫁 2km Time Trial</span>
                            </td>
                            <td className="p-3 text-gray-300">{earliestRecord.timeTrial2km || 'N/A'}</td>
                            <td className="p-3 font-bold text-white">{latestRecord.timeTrial2km || 'N/A'}</td>
                            <td className="p-3 text-right">
                              <span className="text-[10px] font-bold text-indigo-300">
                                Level {latestRecord.yoyoLevel || 'N/A'} Yo-Yo
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })() : playerRecords.length === 1 ? (
                <div className="p-4 bg-blue-50/80 border border-blue-100 rounded-2xl text-xs font-semibold text-blue-900 flex items-center justify-between">
                  <span>1 baseline test recorded for {activePlayer.name}. Add a second assessment to generate full Year-on-Year (YoY) side-by-side growth deltas!</span>
                </div>
              ) : (
                <div className="p-6 bg-gray-50 border border-gray-200 rounded-2xl text-center space-y-2">
                  <p className="text-xs text-gray-500 font-semibold">No fitness or kicking testing records saved for {activePlayer.name} yet.</p>
                  <button
                    onClick={() => handleOpenAddModal(activePlayer.id)}
                    className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition cursor-pointer"
                  >
                    Log First Testing Session
                  </button>
                </div>
              )}

              {/* Historical Testing Timeline & Skill Metrics */}
              {playerRecords.length > 0 && (
                <div className="space-y-6 pt-2">
                  <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">
                    Testing History & Metrics Evolution
                  </h4>

                  <div className="space-y-4">
                    {playerRecords.map((rec, index) => {
                      const recGrade = calculateInterchangeIQGrade({
                        sprint20m: rec.sprint20m,
                        agilityTime: rec.agilityTime,
                        standingVerticalCm: rec.standingVerticalCm,
                        timeTrial2km: rec.timeTrial2km,
                        yoyoLevel: rec.yoyoLevel,
                        fitnessRating: rec.fitnessRating,
                        kickAccuracyRating: rec.kickAccuracyRating,
                        oppositeFootRating: rec.oppositeFootRating,
                        handballRating: rec.handballRating,
                        markingRating: rec.markingRating,
                        tacklingRating: rec.tacklingRating,
                        gameSenseRating: rec.gameSenseRating,
                        gender: rec.gender || activePlayer?.gender || 'Female',
                        ageGroup: rec.ageGroup || activePlayer?.ageGroup || 'U16'
                      });

                      return (
                        <div
                          key={rec.id}
                          className="bg-gray-50/80 border border-gray-200 rounded-2xl p-4 space-y-4 relative hover:border-gray-300 transition"
                        >
                          {/* Session Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200/60 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center">
                                #{index + 1}
                              </span>
                              <span className="font-black text-sm text-[var(--navy)]">
                                {rec.seasonLabel}
                              </span>
                              <span className="text-xs text-gray-400 font-medium">
                                ({rec.date})
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenEditModal(rec)}
                                className="p-1.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-600 rounded-lg transition"
                                title="Edit test record"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteAssessment(rec.id)}
                                className="p-1.5 bg-white border border-gray-200 hover:bg-red-50 text-red-600 rounded-lg transition"
                                title="Delete test record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* InterchangeIQ Athlete Rating Card */}
                          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-3.5 rounded-xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{recGrade.overallTier.emoji}</span>
                              <div>
                                <span className="text-[9px] font-black uppercase text-indigo-300 tracking-wider block">
                                  InterchangeIQ Overall Grade ({rec.gender || activePlayer?.gender || 'Female'} {rec.ageGroup || activePlayer?.ageGroup || 'U16'})
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-base text-white">
                                    {recGrade.overallTier.title} ({recGrade.overallScore} / 5.0)
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                              <span className="bg-white/10 px-2 py-0.5 rounded-md text-blue-200">
                                ⚡ Sprint: Grade {recGrade.sprintRating || '-'}
                              </span>
                              <span className="bg-white/10 px-2 py-0.5 rounded-md text-blue-200">
                                🏃 Agility: Grade {recGrade.agilityRating || '-'}
                              </span>
                              <span className="bg-white/10 px-2 py-0.5 rounded-md text-blue-200">
                                🦘 Vert: Grade {recGrade.jumpRating || '-'}
                              </span>
                              <span className="bg-white/10 px-2 py-0.5 rounded-md text-blue-200">
                                🫁 Endurance: Grade {recGrade.enduranceRating || '-'}
                              </span>
                            </div>
                          </div>

                          {/* Metric Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            {/* Combine Fitness metrics */}
                            <div className="bg-white p-3 rounded-xl border border-gray-100">
                              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">⚡ Combine Speed & Agility</span>
                              <span className="font-black text-gray-800 text-xs block">Sprint: {rec.sprint20m || 'N/A'}</span>
                              <span className="text-[10px] text-gray-500 font-semibold block">Agility: {rec.agilityTime || 'N/A'}</span>
                            </div>

                            {/* Vertical & Endurance */}
                            <div className="bg-white p-3 rounded-xl border border-gray-100">
                              <span className="text-[10px] font-bold text-indigo-600 uppercase block mb-1">🦘 Vertical & Aerobic</span>
                              <span className="font-black text-indigo-700 text-xs block">Vert: {rec.standingVerticalCm ? `${rec.standingVerticalCm} cm` : 'N/A'}</span>
                              <span className="text-[10px] text-gray-500 font-semibold block">2km: {rec.timeTrial2km || 'N/A'}</span>
                            </div>

                            {/* Kick Distance */}
                            <div className="bg-white p-3 rounded-xl border border-gray-100">
                              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">🦵 Kicking Distance</span>
                              <span className="font-black text-emerald-600 text-sm block">{rec.kickDistanceMeters} meters</span>
                              <span className="text-[10px] text-gray-500 font-semibold">Pref: {rec.preferredFoot} Foot</span>
                            </div>

                            {/* Opposite Foot Rating */}
                            <div className="bg-white p-3 rounded-xl border border-gray-100">
                              <span className="text-[10px] font-bold text-amber-600 uppercase block mb-1">⭐ Opposite Foot</span>
                              <div className="flex items-center gap-1">
                                <span className="font-black text-amber-700 text-sm">{rec.oppositeFootRating} / 10</span>
                              </div>
                              <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(rec.oppositeFootRating / 10) * 100}%` }} />
                              </div>
                            </div>
                          </div>

                        {/* Fundamentals breakdown */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-white p-3 rounded-xl border border-gray-100">
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 block">Handball</span>
                            <span className="font-black text-gray-800">{rec.handballRating} / 10</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 block">Marking</span>
                            <span className="font-black text-gray-800">{rec.markingRating} / 10</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 block">Tackling</span>
                            <span className="font-black text-gray-800">{rec.tacklingRating} / 10</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 block">Game Sense</span>
                            <span className="font-black text-gray-800">{rec.gameSenseRating} / 10</span>
                          </div>
                        </div>

                        {/* Goals & Coach Notes */}
                        {(rec.developmentGoals || rec.coachNotes) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            {rec.developmentGoals && (
                              <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 text-xs">
                                <b className="text-[10px] uppercase font-black text-blue-800 block mb-1">🎯 Development Goal</b>
                                <p className="text-blue-900 font-medium leading-relaxed">{rec.developmentGoals}</p>
                              </div>
                            )}
                            {rec.coachNotes && (
                              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 text-xs">
                                <b className="text-[10px] uppercase font-black text-emerald-800 block mb-1">📋 Coach Evaluation</b>
                                <p className="text-emerald-900 font-medium leading-relaxed">{rec.coachNotes}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-[var(--line)] text-center text-gray-400 font-semibold">
              Select a player from the squad roster to inspect or log testing milestones.
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Record / Edit Growth Assessment */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2000] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl border border-[var(--line)] shadow-2xl p-6 max-h-[92vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-black text-[var(--navy)] flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <span>{editingRecord ? 'Edit Growth Record' : 'Record Skill & Fitness Benchmark'}</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRubricModal(true)}
                  className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-black transition flex items-center gap-1 cursor-pointer border border-amber-300"
                  title="View 1-10 Rubric Criteria"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                  <span>Rubric Guide</span>
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-sm font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Task-Focused Selector Bar */}
            <div className="bg-gray-100/80 p-1.5 rounded-2xl flex flex-wrap items-center gap-1">
              <span className="text-[10px] font-black uppercase text-gray-500 px-2 flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-indigo-600" />
                Task Focus:
              </span>
              <button
                onClick={() => setEntryTaskMode('fitness')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  entryTaskMode === 'fitness'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>🏃 2km & Fitness</span>
              </button>
              <button
                onClick={() => setEntryTaskMode('kicking')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  entryTaskMode === 'kicking'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>🦵 Kicking & Opposite Foot</span>
              </button>
              <button
                onClick={() => setEntryTaskMode('skills')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  entryTaskMode === 'skills'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>⚙️ Skill Fundamentals</span>
              </button>
              <button
                onClick={() => setEntryTaskMode('goals')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  entryTaskMode === 'goals'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>📋 Goals & Notes</span>
              </button>
              <button
                onClick={() => setEntryTaskMode('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  entryTaskMode === 'all'
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>🔍 All Activities</span>
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold text-gray-700">
              
              {/* LIVE INTERCHANGE IQ ATHLETE GRADE BANNER IN MODAL */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 rounded-2xl text-white border border-indigo-500/30 shadow-md space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{liveInterchangeIqGrade.overallTier.emoji}</span>
                    <div>
                      <span className="text-[10px] font-black uppercase text-indigo-300 block tracking-wider">
                        InterchangeIQ Calculated Rating
                      </span>
                      <span className="font-black text-base text-white">
                        Score: {liveInterchangeIqGrade.overallScore} / 5.0 — {liveInterchangeIqGrade.overallTier.title}
                      </span>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${liveInterchangeIqGrade.overallTier.badgeBg}`}>
                    {liveInterchangeIqGrade.overallTier.title} ({liveInterchangeIqGrade.overallScore})
                  </span>
                </div>

                {/* Sub-Grade Badges Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[10px] font-bold">
                  <div className="bg-white/10 px-2 py-1 rounded-lg flex flex-col items-center">
                    <span className="text-blue-300">⚡ 20m Sprint</span>
                    <span className="text-white font-black">{liveInterchangeIqGrade.sprintRating ? `Rating ${liveInterchangeIqGrade.sprintRating}` : 'N/A'}</span>
                  </div>
                  <div className="bg-white/10 px-2 py-1 rounded-lg flex flex-col items-center">
                    <span className="text-blue-300">🏃 Agility</span>
                    <span className="text-white font-black">{liveInterchangeIqGrade.agilityRating ? `Rating ${liveInterchangeIqGrade.agilityRating}` : 'N/A'}</span>
                  </div>
                  <div className="bg-white/10 px-2 py-1 rounded-lg flex flex-col items-center">
                    <span className="text-blue-300">🦘 Vertical</span>
                    <span className="text-white font-black">{liveInterchangeIqGrade.jumpRating ? `Rating ${liveInterchangeIqGrade.jumpRating}` : 'N/A'}</span>
                  </div>
                  <div className="bg-white/10 px-2 py-1 rounded-lg flex flex-col items-center">
                    <span className="text-blue-300">🫁 Endurance</span>
                    <span className="text-white font-black">{liveInterchangeIqGrade.enduranceRating ? `Rating ${liveInterchangeIqGrade.enduranceRating}` : 'N/A'}</span>
                  </div>
                  <div className="bg-white/10 px-2 py-1 rounded-lg flex flex-col items-center col-span-2 sm:col-span-1">
                    <span className="text-blue-300">⚽ Skill Avg</span>
                    <span className="text-white font-black">{liveInterchangeIqGrade.skillRating} / 5.0</span>
                  </div>
                </div>
              </div>

              {/* Player and Season Selection + InterchangeIQ Cohort Demographics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
                <div>
                  <label className="block mb-1 text-[10px] font-black uppercase text-gray-500">
                    Player *
                  </label>
                  <select
                    value={formPlayerId}
                    onChange={(e) => setFormPlayerId(e.target.value)}
                    className="w-full p-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-800 focus:outline-none"
                  >
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.number} {p.name} ({p.primaryZone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-[10px] font-black uppercase text-gray-500">
                    Cohort Gender *
                  </label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as Gender)}
                    className="w-full p-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-800 focus:outline-none"
                  >
                    <option value="Male">Male Benchmark</option>
                    <option value="Female">Female Benchmark</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-[10px] font-black uppercase text-gray-500">
                    Age Group *
                  </label>
                  <select
                    value={formAgeGroup}
                    onChange={(e) => setFormAgeGroup(e.target.value as AgeGroup)}
                    className="w-full p-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-800 focus:outline-none"
                  >
                    <option value="U12">U12 Cohort</option>
                    <option value="U14">U14 Cohort</option>
                    <option value="U16">U16 Cohort</option>
                    <option value="U18">U18 Cohort</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-[10px] font-black uppercase text-gray-500">
                    Testing Label / Season *
                  </label>
                  <select
                    value={formSeasonLabel}
                    onChange={(e) => setFormSeasonLabel(e.target.value)}
                    className="w-full p-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-800 focus:outline-none"
                  >
                    <option value="2025 Start of Season">2025 Start of Season</option>
                    <option value="2025 Mid-Season">2025 Mid-Season</option>
                    <option value="2025 End of Season">2025 End of Season</option>
                    <option value="2026 Pre-Season">2026 Pre-Season</option>
                    <option value="2026 In-Season">2026 In-Season</option>
                    <option value="2027 Pre-Season">2027 Pre-Season</option>
                  </select>
                </div>
              </div>

              {/* FITNESS & COMBINE SECTION */}
              {(entryTaskMode === 'fitness' || entryTaskMode === 'all') && (
                <div className={`p-4 rounded-2xl border transition-all ${
                  entryTaskMode === 'fitness'
                    ? 'bg-indigo-50 border-indigo-300 shadow-xs ring-2 ring-indigo-500/20'
                    : 'bg-indigo-50/40 border-indigo-100'
                } space-y-3`}>
                  <div className="flex items-center justify-between">
                    <b className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🏃 InterchangeIQ Combine & Fitness Testing</span>
                      {entryTaskMode === 'fitness' && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[9px] font-extrabold uppercase">
                          Active Focus Task
                        </span>
                      )}
                    </b>
                    <span className="text-[10px] text-indigo-700 font-bold">
                      Cohort: {formGender} {formAgeGroup}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    <div>
                      <label className="block mb-1 text-[10px] font-extrabold text-indigo-900">
                        ⚡ 20m Sprint (s)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 3.42s"
                        value={formSprint}
                        onChange={(e) => setFormSprint(e.target.value)}
                        className="w-full p-2 bg-white border border-indigo-200 rounded-xl font-bold text-gray-800 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block mb-1 text-[10px] font-extrabold text-indigo-900">
                        🏃 Agility (s)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 8.90s"
                        value={formAgility}
                        onChange={(e) => setFormAgility(e.target.value)}
                        className="w-full p-2 bg-white border border-indigo-200 rounded-xl font-bold text-gray-800 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block mb-1 text-[10px] font-extrabold text-indigo-900">
                        🦘 Vertical (cm)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 52"
                        value={formVertical}
                        onChange={(e) => setFormVertical(parseInt(e.target.value) || 0)}
                        className="w-full p-2 bg-white border border-indigo-200 rounded-xl font-bold text-gray-800 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block mb-1 text-[10px] font-extrabold text-indigo-900">
                        2km Trial (mm:ss)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 08:30"
                        value={formTimeTrial}
                        onChange={(e) => setFormTimeTrial(e.target.value)}
                        className="w-full p-2 bg-white border border-indigo-200 rounded-xl font-bold text-gray-800 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block mb-1 text-[10px] font-extrabold text-indigo-900">
                        Yo-Yo Level
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 15.4"
                        value={formYoyo}
                        onChange={(e) => setFormYoyo(e.target.value)}
                        className="w-full p-2 bg-white border border-indigo-200 rounded-xl font-bold text-gray-800 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block mb-1 text-[10px] font-extrabold text-indigo-900">
                        Aerobic ({formFitnessRating}/10)
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={formFitnessRating}
                        onChange={(e) => setFormFitnessRating(parseInt(e.target.value))}
                        className="w-full h-1 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* KICKING & DUAL FOOT SECTION */}
              {(entryTaskMode === 'kicking' || entryTaskMode === 'all') && (
                <div className={`p-4 rounded-2xl border transition-all ${
                  entryTaskMode === 'kicking'
                    ? 'bg-emerald-50 border-emerald-300 shadow-xs ring-2 ring-emerald-500/20'
                    : 'bg-emerald-50/40 border-emerald-100'
                } space-y-3`}>
                  <div className="flex items-center justify-between">
                    <b className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🦵 Kicking & Opposite Foot Mastery (AFL Girls Focus)</span>
                      {entryTaskMode === 'kicking' && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-extrabold uppercase">
                          Active Focus Task
                        </span>
                      )}
                    </b>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block mb-1 text-[10px] font-extrabold text-emerald-800">
                        Preferred Foot
                      </label>
                      <select
                        value={formPreferredFoot}
                        onChange={(e) => setFormPreferredFoot(e.target.value as any)}
                        className="w-full p-2 bg-white border border-emerald-200 rounded-xl font-bold text-gray-800 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Right">Right Foot</option>
                        <option value="Left">Left Foot</option>
                      </select>
                    </div>

                    <div>
                      <label className="block mb-1 text-[10px] font-extrabold text-emerald-800">
                        Kick Distance (Meters)
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="60"
                        value={formKickDistance}
                        onChange={(e) => setFormKickDistance(parseInt(e.target.value) || 30)}
                        className="w-full p-2 bg-white border border-emerald-200 rounded-xl font-bold text-gray-800 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block mb-1 text-[10px] font-extrabold text-emerald-800">
                        Kick Accuracy ({formKickAccuracy}/10)
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={formKickAccuracy}
                        onChange={(e) => setFormKickAccuracy(parseInt(e.target.value))}
                        className="w-full h-1 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 mt-2"
                      />
                    </div>

                    <div className="bg-amber-100/60 p-2 rounded-xl border border-amber-200">
                      <label className="block mb-1 text-[10px] font-black text-amber-900">
                        Opposite Foot Proficiency ({formOppositeFoot}/10)
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={formOppositeFoot}
                        onChange={(e) => setFormOppositeFoot(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600 mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* FUNDAMENTAL SKILLS (1-10) */}
              {(entryTaskMode === 'skills' || entryTaskMode === 'all') && (
                <div className={`p-4 rounded-2xl border transition-all ${
                  entryTaskMode === 'skills'
                    ? 'bg-blue-50 border-blue-300 shadow-xs ring-2 ring-blue-500/20'
                    : 'bg-gray-50 border-gray-200'
                } space-y-3`}>
                  <div className="flex items-center justify-between">
                    <b className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span>⚙️ Fundamentals & Game Sense</span>
                      {entryTaskMode === 'skills' && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[9px] font-extrabold uppercase">
                          Active Focus Task
                        </span>
                      )}
                    </b>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-1">
                        Handballing ({formHandball}/10)
                      </label>
                      <input
                        type="range" min="1" max="10" value={formHandball}
                        onChange={(e) => setFormHandball(parseInt(e.target.value))}
                        className="w-full h-1 bg-gray-200 rounded-lg accent-blue-600 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-1">
                        Marking ({formMarking}/10)
                      </label>
                      <input
                        type="range" min="1" max="10" value={formMarking}
                        onChange={(e) => setFormMarking(parseInt(e.target.value))}
                        className="w-full h-1 bg-gray-200 rounded-lg accent-blue-600 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-1">
                        Tackling ({formTackling}/10)
                      </label>
                      <input
                        type="range" min="1" max="10" value={formTackling}
                        onChange={(e) => setFormTackling(parseInt(e.target.value))}
                        className="w-full h-1 bg-gray-200 rounded-lg accent-blue-600 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-1">
                        Game Sense ({formGameSense}/10)
                      </label>
                      <input
                        type="range" min="1" max="10" value={formGameSense}
                        onChange={(e) => setFormGameSense(parseInt(e.target.value))}
                        className="w-full h-1 bg-gray-200 rounded-lg accent-blue-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* POSITIONAL RUBRIC SPECIFIC ATTRIBUTES */}
                  <div className="pt-3 border-t border-gray-200/80 space-y-2">
                    <b className="text-[11px] font-black text-indigo-900 uppercase tracking-wider block">
                      🏉 Positional Rubric Skills (1-10)
                    </b>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">
                          Spoiling ({formSpoiling}/10)
                        </label>
                        <input
                          type="range" min="1" max="10" value={formSpoiling}
                          onChange={(e) => setFormSpoiling(parseInt(e.target.value))}
                          className="w-full h-1 bg-gray-200 rounded-lg accent-indigo-600 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">
                          Overhead Marking ({formOverheadMarking}/10)
                        </label>
                        <input
                          type="range" min="1" max="10" value={formOverheadMarking}
                          onChange={(e) => setFormOverheadMarking(parseInt(e.target.value))}
                          className="w-full h-1 bg-gray-200 rounded-lg accent-indigo-600 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">
                          Crumbing / Ground Gets ({formCrumbing}/10)
                        </label>
                        <input
                          type="range" min="1" max="10" value={formCrumbing}
                          onChange={(e) => setFormCrumbing(parseInt(e.target.value))}
                          className="w-full h-1 bg-gray-200 rounded-lg accent-indigo-600 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">
                          Pressure Acts ({formPressureActs}/10)
                        </label>
                        <input
                          type="range" min="1" max="10" value={formPressureActs}
                          onChange={(e) => setFormPressureActs(parseInt(e.target.value))}
                          className="w-full h-1 bg-gray-200 rounded-lg accent-indigo-600 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">
                          Ruck Tap Placement ({formRuckTap}/10)
                        </label>
                        <input
                          type="range" min="1" max="10" value={formRuckTap}
                          onChange={(e) => setFormRuckTap(parseInt(e.target.value))}
                          className="w-full h-1 bg-gray-200 rounded-lg accent-indigo-600 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">
                          Leading Timing ({formLeadingTiming}/10)
                        </label>
                        <input
                          type="range" min="1" max="10" value={formLeadingTiming}
                          onChange={(e) => setFormLeadingTiming(parseInt(e.target.value))}
                          className="w-full h-1 bg-gray-200 rounded-lg accent-indigo-600 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">
                          Snap Goal Kicking ({formSnapGoal}/10)
                        </label>
                        <input
                          type="range" min="1" max="10" value={formSnapGoal}
                          onChange={(e) => setFormSnapGoal(parseInt(e.target.value))}
                          className="w-full h-1 bg-gray-200 rounded-lg accent-indigo-600 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">
                          Defensive Transition ({formDefensiveTransition}/10)
                        </label>
                        <input
                          type="range" min="1" max="10" value={formDefensiveTransition}
                          onChange={(e) => setFormDefensiveTransition(parseInt(e.target.value))}
                          className="w-full h-1 bg-gray-200 rounded-lg accent-indigo-600 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* GOALS & NOTES */}
              {(entryTaskMode === 'goals' || entryTaskMode === 'all') && (
                <div className={`p-4 rounded-2xl border transition-all ${
                  entryTaskMode === 'goals'
                    ? 'bg-purple-50 border-purple-300 shadow-xs ring-2 ring-purple-500/20'
                    : 'bg-gray-50 border-gray-200'
                } space-y-3`}>
                  <div className="flex items-center justify-between">
                    <b className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>📋 Goals & Coach Notes</span>
                      {entryTaskMode === 'goals' && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white text-[9px] font-extrabold uppercase">
                          Active Focus Task
                        </span>
                      )}
                    </b>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block mb-1 text-[10px] font-black uppercase text-gray-500">
                        Player Development Goal
                      </label>
                      <textarea
                        rows={2}
                        value={formGoals}
                        onChange={(e) => setFormGoals(e.target.value)}
                        placeholder="e.g. Build confidence on non-preferred foot kicking under pressure..."
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block mb-1 text-[10px] font-black uppercase text-gray-500">
                        Coach Evaluation Notes
                      </label>
                      <textarea
                        rows={2}
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        placeholder="e.g. Tremendous improvement in aerobic 2km time trial and kicking power..."
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3 mt-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAssessment}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
              >
                Save Assessment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skill Scoring Rubric Modal */}
      {showRubricModal && (
        <SkillRubricModal
          onClose={() => setShowRubricModal(false)}
          onSelectScore={handleRubricScoreSelect}
        />
      )}
    </div>
  );
}
