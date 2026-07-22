import React, { useState } from 'react';
import { Player, SkillAssessment } from '../types';
import {
  TrendingUp, Award, Zap, Target, Plus, Calendar, Activity,
  ChevronRight, ArrowUpRight, Sparkles, CheckCircle2, Search, Filter,
  FileSpreadsheet, Edit3, Trash2, Flame
} from 'lucide-react';

interface PlayerGrowthScreenProps {
  players: Player[];
  growthRecords: SkillAssessment[];
  onUpdateGrowthRecords: (records: SkillAssessment[]) => void;
  selectedPlayerId: string | null;
  onSelectPlayerId: (id: string | null) => void;
}

export default function PlayerGrowthScreen({
  players,
  growthRecords,
  onUpdateGrowthRecords,
  selectedPlayerId,
  onSelectPlayerId,
}: PlayerGrowthScreenProps) {
  const [selectedZone, setSelectedZone] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SkillAssessment | null>(null);

  // Active Player Selection
  const activePlayerId = selectedPlayerId || players[0]?.id || '';
  const activePlayer = players.find((p) => p.id === activePlayerId) || players[0];

  // Assessment Form state
  const [formPlayerId, setFormPlayerId] = useState(activePlayerId);
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formSeasonLabel, setFormSeasonLabel] = useState('2026 Pre-Season');
  
  // Fitness states
  const [formTimeTrial, setFormTimeTrial] = useState('08:45');
  const [formYoyo, setFormYoyo] = useState('15.0');
  const [formSprint, setFormSprint] = useState('3.45s');
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

  // Notes
  const [formGoals, setFormGoals] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Task-focused modal entry state ('fitness' | 'kicking' | 'skills' | 'goals' | 'all')
  const [entryTaskMode, setEntryTaskMode] = useState<'fitness' | 'kicking' | 'skills' | 'goals' | 'all'>('fitness');

  // Filtered Players
  const filteredPlayers = players.filter((p) => {
    const matchesZone = selectedZone === 'All' || p.primaryZone === selectedZone;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.number.includes(searchQuery);
    return matchesZone && matchesSearch;
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

  // Open Add Assessment Modal with task mode focus
  const handleOpenAddModal = (
    playerId?: string,
    initialTaskMode: 'fitness' | 'kicking' | 'skills' | 'goals' | 'all' = 'fitness'
  ) => {
    const targetId = playerId || activePlayerId;
    setEditingRecord(null);
    setEntryTaskMode(initialTaskMode);
    setFormPlayerId(targetId);
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormSeasonLabel('2026 Pre-Season');
    
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
      setFormFitnessRating(last.fitnessRating || 7);
      setFormHandball(last.handballRating || 7);
      setFormMarking(last.markingRating || 7);
      setFormTackling(last.tacklingRating || 7);
      setFormGameSense(last.gameSenseRating || 7);
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
      setFormFitnessRating(7);
      setFormHandball(7);
      setFormMarking(7);
      setFormTackling(7);
      setFormGameSense(7);
      setFormGoals('');
      setFormNotes('');
    }
    setShowAddModal(true);
  };

  const handleOpenEditModal = (record: SkillAssessment) => {
    setEditingRecord(record);
    setEntryTaskMode('all');
    setFormPlayerId(record.playerId);
    setFormDate(record.date);
    setFormSeasonLabel(record.seasonLabel);
    setFormPreferredFoot(record.preferredFoot);
    setFormKickDistance(record.kickDistanceMeters);
    setFormKickAccuracy(record.kickAccuracyRating);
    setFormOppositeFoot(record.oppositeFootRating);
    setFormTimeTrial(record.timeTrial2km || '');
    setFormYoyo(record.yoyoLevel || '');
    setFormSprint(record.sprint20m || '');
    setFormFitnessRating(record.fitnessRating);
    setFormHandball(record.handballRating);
    setFormMarking(record.markingRating);
    setFormTackling(record.tacklingRating);
    setFormGameSense(record.gameSenseRating);
    setFormGoals(record.developmentGoals || '');
    setFormNotes(record.coachNotes || '');
    setShowAddModal(true);
  };

  const handleSaveAssessment = () => {
    if (!formPlayerId) return;

    const assessmentData: SkillAssessment = {
      id: editingRecord ? editingRecord.id : `growth-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      playerId: formPlayerId,
      date: formDate,
      seasonLabel: formSeasonLabel.trim() || 'Pre-Season Benchmark',
      timeTrial2km: formTimeTrial.trim(),
      yoyoLevel: formYoyo.trim(),
      sprint20m: formSprint.trim(),
      fitnessRating: formFitnessRating,
      preferredFoot: formPreferredFoot,
      kickDistanceMeters: Number(formKickDistance) || 30,
      kickAccuracyRating: formKickAccuracy,
      oppositeFootRating: formOppositeFoot,
      handballRating: formHandball,
      markingRating: formMarking,
      tacklingRating: formTackling,
      gameSenseRating: formGameSense,
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

        {/* Squad Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
            <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider block">Tested Players</span>
            <span className="text-lg font-black text-white">{squadTestedCount} / {players.length} Squad</span>
          </div>
          <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
            <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider block">Total Assessments</span>
            <span className="text-lg font-black text-white">{totalAssessments} Recorded</span>
          </div>
          <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
            <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">Avg Kick Gain (YoY)</span>
            <span className="text-lg font-black text-emerald-400">+6.8 meters</span>
          </div>
          <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">Opposite Foot Growth</span>
            <span className="text-lg font-black text-amber-300">+2.4 Rating Pts</span>
          </div>
        </div>
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

        {/* Selected Player Detailed Growth View */}
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
                      AFL Girls Growth & Skill Milestones
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

              {/* Progress Summary Badges (Delta comparison) */}
              {playerRecords.length >= 2 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">
                        Kick Distance Growth
                      </span>
                      <span className="text-lg font-black text-emerald-700">
                        {kickDistDelta >= 0 ? `+${kickDistDelta}m` : `${kickDistDelta}m`}
                      </span>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider block">
                        Opposite Foot Growth
                      </span>
                      <span className="text-lg font-black text-amber-700">
                        {oppFootDelta >= 0 ? `+${oppFootDelta.toFixed(1)} pts` : `${oppFootDelta.toFixed(1)} pts`}
                      </span>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black">
                      <Sparkles className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-indigo-50/70 border border-indigo-200 p-3.5 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-indigo-800 tracking-wider block">
                        Overall Fitness
                      </span>
                      <span className="text-lg font-black text-indigo-700">
                        {fitnessRatingDelta >= 0 ? `+${fitnessRatingDelta} / 10` : `${fitnessRatingDelta} / 10`}
                      </span>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-black">
                      <Activity className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              ) : playerRecords.length === 1 ? (
                <div className="p-3.5 bg-blue-50/80 border border-blue-100 rounded-2xl text-xs font-semibold text-blue-900 flex items-center justify-between">
                  <span>1 baseline test recorded for {activePlayer.name}. Add a second assessment to track year-on-year growth deltas!</span>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl text-center space-y-2">
                  <p className="text-xs text-gray-500 font-semibold">No fitness or kicking testing records saved for {activePlayer.name} yet.</p>
                  <button
                    onClick={() => handleOpenAddModal(activePlayer.id)}
                    className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition"
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
                    {playerRecords.map((rec, index) => (
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

                        {/* Metric Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          {/* Fitness metrics */}
                          <div className="bg-white p-3 rounded-xl border border-gray-100">
                            <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">🏃 2km Time Trial</span>
                            <span className="font-black text-gray-800 text-sm block">{rec.timeTrial2km || 'N/A'}</span>
                            <span className="text-[10px] text-gray-400 font-medium">Yo-Yo: {rec.yoyoLevel || 'N/A'}</span>
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

                          {/* Fitness Rating */}
                          <div className="bg-white p-3 rounded-xl border border-gray-100">
                            <span className="text-[10px] font-bold text-indigo-600 uppercase block mb-1">⚡ Aerobic Rating</span>
                            <span className="font-black text-indigo-700 text-sm block">{rec.fitnessRating} / 10</span>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(rec.fitnessRating / 10) * 100}%` }} />
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
                    ))}
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
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
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
              
              {/* Player and Season Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 text-[10px] font-black uppercase text-gray-400">
                    Player *
                  </label>
                  <select
                    value={formPlayerId}
                    onChange={(e) => setFormPlayerId(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 focus:outline-none"
                  >
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.number} {p.name} ({p.primaryZone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-[10px] font-black uppercase text-gray-400">
                    Testing Label / Season *
                  </label>
                  <select
                    value={formSeasonLabel}
                    onChange={(e) => setFormSeasonLabel(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 focus:outline-none"
                  >
                    <option value="2025 Start of Season">2025 Start of Season</option>
                    <option value="2025 Mid-Season">2025 Mid-Season</option>
                    <option value="2025 End of Season">2025 End of Season</option>
                    <option value="2026 Pre-Season">2026 Pre-Season</option>
                    <option value="2026 In-Season">2026 In-Season</option>
                    <option value="2027 Pre-Season">2027 Pre-Season</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-[10px] font-black uppercase text-gray-400">
                    Test Date
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* FITNESS SECTION */}
              {(entryTaskMode === 'fitness' || entryTaskMode === 'all') && (
                <div className={`p-4 rounded-2xl border transition-all ${
                  entryTaskMode === 'fitness'
                    ? 'bg-indigo-50 border-indigo-300 shadow-xs ring-2 ring-indigo-500/20'
                    : 'bg-indigo-50/40 border-indigo-100'
                } space-y-3`}>
                  <div className="flex items-center justify-between">
                    <b className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🏃 Aerobic & Fitness Metrics</span>
                      {entryTaskMode === 'fitness' && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[9px] font-extrabold uppercase">
                          Active Focus Task
                        </span>
                      )}
                    </b>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block mb-1 text-[10px] font-extrabold text-indigo-800">
                        2km Time Trial (mm:ss)
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
                      <label className="block mb-1 text-[10px] font-extrabold text-indigo-800">
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
                      <label className="block mb-1 text-[10px] font-extrabold text-indigo-800">
                        20m Sprint (s)
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
                      <label className="block mb-1 text-[10px] font-extrabold text-indigo-800">
                        Aerobic Rating ({formFitnessRating}/10)
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
    </div>
  );
}
