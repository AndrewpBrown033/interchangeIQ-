import React, { useState } from 'react';
import { Player, LineupTemplate, GameHistory } from '../types';
import { POSITION_GROUPS, POSITIONS, DEFAULT_PLAYERS, normalizePosition, getZoneForPosition, POSITION_FULL_NAMES } from '../constants';
import { 
  Plus, Edit3, Trash, ShieldCheck, UserMinus, UserCheck, AlertTriangle, 
  Check, X, Flame, Sparkles, Clock, Activity, RotateCcw, Landmark, 
  Users, Trophy, Shield, Layers, Play, ArrowRight, FileSpreadsheet, Download, ArrowUp
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
  teamName,
  isInactive,
  onNavigateTab,
}: TeamScreenProps) {
  const [filterZone, setFilterZone] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'number' | 'name'>('number');
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  // Player Form states
  const [formName, setFormName] = useState('');
  const [formNick, setFormNick] = useState('');
  const [formNumber, setFormNumber] = useState('');
  const [formPrimaryZone, setFormPrimaryZone] = useState('MID');
  const [formPositions, setFormPositions] = useState<string[]>([]);
  const [formStatus, setFormStatus] = useState<'available' | 'away' | 'injured'>('available');
  const [formNote, setFormNote] = useState('');
  const [formError, setFormError] = useState('');

  const activeId = selectedPlayerId || players[0]?.id || null;
  const activePlayer = players.find((p) => p.id === activeId) || null;

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

  // Sorting and filtering list
  const filtered = players
    .filter((p) => filterZone === 'All' || p.primaryZone === filterZone)
    .sort((a, b) => {
      if (sortBy === 'number') {
        return (parseInt(a.number, 10) || 999) - (parseInt(b.number, 10) || 999);
      }
      return a.name.localeCompare(b.name);
    });

  const handleOpenAddPlayer = () => {
    setEditingPlayer(null);
    setFormName('');
    setFormNick('');
    setFormNumber('');
    setFormPrimaryZone('MID');
    setFormPositions([]);
    setFormStatus('available');
    setFormNote('');
    setFormError('');
    setShowAddEditModal(true);
  };

  const handleOpenEditPlayer = (p: Player) => {
    setEditingPlayer(p);
    setFormName(p.name);
    setFormNick(p.nick);
    setFormNumber(p.number);
    setFormPrimaryZone(p.primaryZone);
    setFormPositions((p.positions || []).map(normalizePosition));
    setFormStatus(p.status);
    setFormNote(p.note);
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

  const handleSetStatus = (id: string, stat: 'available' | 'away' | 'injured') => {
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

      {/* Top action header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[var(--line)] shadow-sm">
        <div>
          <h2 className="text-xl font-black text-[var(--navy)] tracking-tight">Team Squad ({players.length})</h2>
          <p className="text-xs text-[var(--muted)] font-semibold mt-1">
            Manage player profiles, positional zones, and status
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Players List */}
        <div className="bg-white rounded-2xl border border-[var(--line)] shadow-sm overflow-hidden flex flex-col h-fit">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <h3 className="font-black text-sm text-[var(--navy)]">Roster list</h3>
            <button
              onClick={() => setSortBy(sortBy === 'number' ? 'name' : 'number')}
              className="px-2 py-1 text-[10px] font-black text-gray-500 bg-gray-50 border border-gray-100 rounded-md hover:bg-gray-100 cursor-pointer"
            >
              Sort: {sortBy === 'number' ? 'Jumper #' : 'Name'}
            </button>
          </div>

          {/* Positional filters */}
          <div className="px-4 py-2 border-b border-gray-100 flex flex-wrap gap-1">
            {['All', 'FWD', 'MID', 'DEF', 'RUCK'].map((zone) => (
              <button
                key={zone}
                onClick={() => setFilterZone(zone)}
                className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition cursor-pointer ${
                  filterZone === zone
                    ? 'bg-[var(--blue)] text-white'
                    : 'bg-gray-100 text-gray-500 hover:text-gray-800'
                }`}
              >
                {zone}
              </button>
            ))}
          </div>

          <div className="max-h-[720px] overflow-y-auto divide-y divide-gray-100">
            {filtered.map((p) => {
              const isActive = activeId === p.id;
              const rawFldPos = Object.keys(lineup).find((k) => lineup[k] === p.id);
              const fldPos = rawFldPos ? normalizePosition(rawFldPos) : undefined;

              return (
                <div
                  key={p.id}
                  onClick={() => onSelectPlayerId(p.id)}
                  className={`p-3 flex items-center justify-between gap-4 cursor-pointer transition ${
                    isActive ? 'bg-[#FFF8E6]' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs text-white ${
                      p.primaryZone === 'FWD' ? 'bg-[#E5484D]' :
                      p.primaryZone === 'DEF' ? 'bg-[#16a765]' :
                      p.primaryZone === 'RUCK' ? 'bg-[#8B5CF6]' : 'bg-[#4C6FFF]'
                    }`}>
                      {p.number}
                    </div>
                    <div>
                      <b className="text-sm text-[var(--ink)] block">
                        {p.nick ? `${p.nick} (${p.name})` : p.name}
                      </b>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className={`px-1.5 py-0.2 text-[9px] font-black rounded uppercase ${
                          p.primaryZone === 'FWD' ? 'bg-red-50 text-red-700 border border-red-200' :
                          p.primaryZone === 'DEF' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          p.primaryZone === 'RUCK' ? 'bg-purple-50 text-purple-800 border border-purple-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}>
                          {p.primaryZone}
                        </span>
                        {p.positions && p.positions.length > 0 ? (
                          <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                            Pref: {p.positions.map(normalizePosition).join(', ')}
                          </span>
                        ) : (
                          <span className="text-[9px] text-gray-400 font-semibold italic">No pref pos</span>
                        )}
                        {fldPos && (
                          <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-200">
                            Field: {fldPos}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 text-[9px] font-black rounded-md uppercase ${
                    p.status === 'available' ? 'bg-green-50 text-[#0E7A48]' :
                    p.status === 'injured' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'
                  }`}>
                    {p.status}
                  </span>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="p-8 text-center space-y-4 bg-slate-50/70">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-[var(--navy)]">Roster is Empty</h4>
                  <p className="text-xs text-gray-500 font-semibold mt-1 max-w-sm mx-auto">
                    This squad currently has no players. Add players manually, import a CSV roster file, or load sample AFL data.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
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
        </div>

        {/* Selected Player Detailed card */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[var(--line)] shadow-sm space-y-4">
          {activePlayer ? (
            <>
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[var(--navy)] to-[var(--blue)] text-white rounded-xl flex items-center justify-center font-black text-lg">
                    #{activePlayer.number}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 leading-tight">
                      {activePlayer.name}
                    </h3>
                    {activePlayer.nick && (
                      <p className="text-xs text-[var(--blue)] font-extrabold mt-0.5">
                        Nickname: {activePlayer.nick}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleOpenEditPlayer(activePlayer)}
                    className="p-2 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-xl transition text-gray-500"
                    title="Edit player profile"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePlayer(activePlayer.id)}
                    className="p-2 bg-red-50 hover:bg-red-100 rounded-xl transition text-red-600"
                    title="Delete player permanently"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3">
                <div className="space-y-4">
                  {/* Status update buttons */}
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1.5">
                      Change Status
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSetStatus(activePlayer.id, 'available')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition ${
                          activePlayer.status === 'available'
                            ? 'bg-green-50 text-[#0E7A48] border-green-200 font-extrabold'
                            : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
                        }`}
                      >
                        Available
                      </button>
                      <button
                        onClick={() => handleSetStatus(activePlayer.id, 'away')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition ${
                          activePlayer.status === 'away'
                            ? 'bg-amber-50 text-amber-800 border-amber-200 font-extrabold'
                            : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
                        }`}
                      >
                        Away
                      </button>
                      <button
                        onClick={() => handleSetStatus(activePlayer.id, 'injured')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition ${
                          activePlayer.status === 'injured'
                            ? 'bg-red-50 text-red-700 border-red-200 font-extrabold'
                            : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
                        }`}
                      >
                        Injured
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1">
                      Primary Zone
                    </span>
                    <span className="px-3 py-1 font-black text-xs uppercase bg-[#EEF0FF] text-[var(--blue)] rounded-lg">
                      {activePlayer.primaryZone}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        Preferred Positions
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenEditPlayer(activePlayer)}
                        className="text-[10px] font-extrabold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit Profile</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {activePlayer.positions && activePlayer.positions.length > 0 ? (
                        activePlayer.positions.map((pos) => {
                          const normPos = normalizePosition(pos);
                          const fullName = POSITION_FULL_NAMES[normPos] || normPos;
                          return (
                            <span
                              key={pos}
                              title={fullName}
                              className="px-2.5 py-1 bg-white border border-blue-200 text-blue-900 rounded-lg text-xs font-black shadow-2xs flex items-center gap-1"
                            >
                              <span>{normPos}</span>
                              {fullName !== normPos && (
                                <span className="text-[9px] font-medium text-blue-500">({fullName})</span>
                              )}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-xs text-gray-400 font-semibold italic">No preferred positions selected. Click Edit Profile to set positions.</span>
                      )}
                    </div>
                  </div>

                  {activePlayer.note && (
                    <div>
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1">
                        Coaching Note / Reason
                      </span>
                      <p className="text-xs text-gray-600 font-medium bg-[#FAFBFF] p-3 rounded-xl border border-gray-100 italic leading-relaxed">
                        {activePlayer.note}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* HEATMAP SECTOR */}
              <div className="border-t border-gray-100 pt-6 mt-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
                      Live Match Heatmap
                    </h4>
                    <p className="text-xs text-gray-400 font-medium">
                      Visually displays player's occupancy intensity across slots during the match.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSimulatePlaytime(activePlayer.id)}
                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      Simulate Match Playtime
                    </button>
                    {activePlayer.slotTimes && Object.keys(activePlayer.slotTimes).length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleClearPlaytime(activePlayer.id)}
                        className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-[10px] font-black rounded-lg transition cursor-pointer"
                      >
                        Reset Data
                      </button>
                    )}
                  </div>
                </div>

                {/* Heatmap visualization and Stats side-by-side or stacked */}
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
                  {/* Mini-Field Heatmap Container - Replicating Game Day AFL Oval */}
                  <div className="xl:col-span-3 bg-gray-50 border border-gray-100 p-4 rounded-2xl flex flex-col items-center justify-center overflow-x-auto">
                    <div className="w-full max-w-[490px] field relative select-none mx-auto shadow-md shrink-0" style={{ height: '740px' }}>
                      <div className="centre-square"></div>
                      <div className="centre-circle-inner"></div>
                      <div className="fifty-arc-top"></div>
                      <div className="fifty-arc-bottom"></div>

                      {/* AFL Goal Posts & Markings - Top End (Forwards) */}
                      <div className="goal-line-top"></div>
                      <div className="goal-square-top"></div>
                      <div className="goal-post behind top-left-behind"></div>
                      <div className="goal-post main top-left-main"></div>
                      <div className="goal-post main top-right-main"></div>
                      <div className="goal-post behind top-right-behind"></div>

                      {/* AFL Goal Posts & Markings - Bottom End (Defenders) */}
                      <div className="goal-line-bottom"></div>
                      <div className="goal-square-bottom"></div>
                      <div className="goal-post behind bottom-left-behind"></div>
                      <div className="goal-post main bottom-left-main"></div>
                      <div className="goal-post main bottom-right-main"></div>
                      <div className="goal-post behind bottom-right-behind"></div>

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

                      {/* Map slots & Heatmap Overlay */}
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
                            {/* Heat Glow Ring */}
                            {hasHeat && (
                              <div
                                className="absolute rounded-full blur-[8px] sm:blur-[12px] opacity-85 animate-pulse transition-all duration-500"
                                style={{
                                  width: `${28 + heatRatio * 40}px`,
                                  height: `${28 + heatRatio * 40}px`,
                                  backgroundColor: `rgba(${235 + heatRatio * 20}, ${110 - heatRatio * 75}, 25, ${0.45 + heatRatio * 0.45})`,
                                  boxShadow: `0 0 ${14 + heatRatio * 18}px rgba(${245 + heatRatio * 10}, 110, 0, ${0.35 + heatRatio * 0.45})`
                                }}
                              />
                            )}

                            {/* Label box */}
                            {hasHeat ? (
                              <div className="relative z-10 flex flex-col items-center bg-black/75 backdrop-blur-xs px-2 py-0.5 rounded-md border border-white/30 shadow-md">
                                <span className="text-[8px] sm:text-[10px] font-black text-white leading-none tracking-tight">{slotName}</span>
                                <span className="text-[7px] sm:text-[9px] font-black text-amber-300 leading-none mt-0.5">
                                  {Math.round(secondsSpent / 60)}m
                                </span>
                              </div>
                            ) : (
                              <div className="relative z-10 flex flex-col items-center bg-black/30 border border-white/20 px-1.5 py-0.5 rounded-sm backdrop-blur-2xs">
                                <span className="text-[7px] sm:text-[8px] font-bold text-white/50 leading-none">{slotName}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Heatmap Stats Cards */}
                  <div className="xl:col-span-2 space-y-3.5">
                    <div className="bg-gradient-to-br from-[#FAFBFF] to-[#F4F6FF] border border-blue-50/50 p-4 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[var(--blue)]" />
                        <span className="text-[11px] font-extrabold uppercase text-[var(--blue)] tracking-wider">
                          Active Game Duration
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-1">
                        <div>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">On Field</p>
                          <p className="text-lg font-black text-gray-800">
                            {activePlayer.active ? `${Math.floor(activePlayer.active / 60)} mins` : '0 mins'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">On Bench</p>
                          <p className="text-lg font-black text-gray-800">
                            {activePlayer.bench ? `${Math.floor(activePlayer.bench / 60)} mins` : '0 mins'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50/65 border border-gray-200/50 p-4 rounded-2xl space-y-2">
                      <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider block">
                        Position Heat Analysis
                      </span>
                      {activePlayer.slotTimes && Object.keys(activePlayer.slotTimes).length > 0 ? (
                        <div className="space-y-2 pt-1">
                          {Object.entries(activePlayer.slotTimes)
                            .sort((a, b) => b[1] - a[1])
                            .map(([slot, secs], index) => {
                              const pct = Math.round((secs / (activePlayer.active || 1)) * 100);
                              return (
                                <div key={slot} className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-extrabold text-gray-700 flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                      {slot} ({POSITIONS.find(([sn]) => sn === slot)?.[1] || slot})
                                    </span>
                                    <span className="font-black text-gray-900">{Math.round(secs / 60)} mins ({pct}%)</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        index === 0 ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-orange-400'
                                      }`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 font-medium italic py-2">
                          No slot occupancy times captured yet. Simulate match minutes or start the match timer.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl">
                <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <h4 className="font-black text-sm text-[var(--navy)]">No Player Selected</h4>
                <p className="text-xs text-gray-500 font-semibold mt-1">
                  Select a player from the roster list on the left to view their profile, edit details, or track playtime heatmaps.
                </p>
              </div>
              <CsvImportGuide
                players={players}
                onUpdatePlayers={onUpdatePlayers}
                onUpdateLineup={onUpdateLineup}
                title="CSV Roster Bulk Import & File Format Guide"
              />
            </div>
          )}
        </div>
      </div>

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

              {/* Notes */}
              <div>
                <label className="block mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Note / Comments
                </label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="e.g. recovering from a minor quad strain"
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
    </div>
  );
}
