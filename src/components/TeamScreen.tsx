import React, { useState } from 'react';
import { Player } from '../types';
import { POSITION_GROUPS } from '../constants';
import { Plus, Edit3, Trash, ShieldCheck, UserMinus, UserCheck, AlertTriangle, FileSpreadsheet, Check, X } from 'lucide-react';

interface TeamScreenProps {
  players: Player[];
  onUpdatePlayers: (players: Player[]) => void;
  selectedPlayerId: string | null;
  onSelectPlayerId: (id: string | null) => void;
  lineup: Record<string, string>;
  onUpdateLineup: (lineup: Record<string, string>) => void;
}

export default function TeamScreen({
  players,
  onUpdatePlayers,
  selectedPlayerId,
  onSelectPlayerId,
  lineup,
  onUpdateLineup,
}: TeamScreenProps) {
  const [filterZone, setFilterZone] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'number' | 'name'>('number');
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  // CSV Import state
  const [csvStatus, setCsvStatus] = useState<{ type: 'ok' | 'warn' | 'err'; text: string } | null>(null);
  const [csvMode, setCsvStatusMode] = useState<'replace' | 'append'>('replace');

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
    setFormPositions(p.positions || []);
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

    const data: Partial<Player> = {
      name: formName.trim(),
      nick: formNick.trim(),
      number: formNumber.trim(),
      primaryZone: formPrimaryZone,
      positions: formPositions,
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
        primaryZone: formPrimaryZone,
        positions: formPositions,
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

  // CSV parsing logic for Excel imports
  const splitCSVRow = (row: string) => {
    const out = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < row.length; i++) {
      const c = row[i];
      const n = row[i + 1];
      if (c === '"' && q && n === '"') {
        cur += '"';
        i++;
        continue;
      }
      if (c === '"') {
        q = !q;
        continue;
      }
      if (c === ',' && !q) {
        out.push(cur.trim());
        cur = '';
        continue;
      }
      cur += c;
    }
    out.push(cur.trim());
    return out;
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = String(event.target?.result || '');
        const rows = text
          .replace(/^\uFEFF/, '')
          .split(/\r?\n/)
          .map((x) => x.trim())
          .filter(Boolean)
          .map(splitCSVRow);

        if (!rows.length) {
          setCsvStatus({ type: 'err', text: 'No rows found in the CSV.' });
          return;
        }

        const validHeaders = ['name', 'player', 'playername', 'number', 'no', '#', 'positions', 'position', 'status', 'nick', 'nickname', 'note', 'reason'];
        const normaliseHeader = (h: string) => String(h || '').toLowerCase().replace(/[^a-z0-9#]/g, '');

        const hasHeader = rows[0].some((c) => validHeaders.includes(normaliseHeader(c)));
        const startIdx = hasHeader ? 1 : 0;
        const headerMap: Record<string, number> = {};

        if (hasHeader) {
          rows[0].forEach((h, i) => {
            headerMap[normaliseHeader(h)] = i;
          });
        }

        const val = (cols: string[], names: string[], defaultIdx: number) => {
          for (const n of names) {
            const k = normaliseHeader(n);
            if (headerMap[k] !== undefined) return cols[headerMap[k]] || '';
          }
          return cols[defaultIdx] || '';
        };

        const imported: Player[] = [];
        const errors: string[] = [];

        for (let r = startIdx; r < rows.length; r++) {
          const cols = rows[r];
          const rowNo = r + 1;
          const name = val(cols, ['name', 'player', 'player name'], 0).trim();
          const number = val(cols, ['number', 'no', '#'], 1).trim();
          const posRaw = val(cols, ['positions', 'position'], 2).trim();
          const statusRaw = (val(cols, ['status'], 3).trim() || 'available').toLowerCase() as any;
          const nick = val(cols, ['nick', 'nickname'], 4).trim();
          const note = val(cols, ['note', 'reason'], 5).trim();

          if (!name) {
            errors.push(`Row ${rowNo}: missing player name`);
            continue;
          }
          if (!number) {
            errors.push(`Row ${rowNo}: missing jumper number for ${name}`);
            continue;
          }

          const positions = posRaw
            .split(/[;|]/)
            .map((x) => x.trim().toUpperCase())
            .filter(Boolean);

          const status = ['available', 'away', 'injured'].includes(statusRaw) ? statusRaw : 'available';

          imported.push({
            id: `p-${Date.now()}-${Math.random()}`,
            name,
            number,
            positions: positions.length ? positions : ['MID'],
            primaryZone: positions[0] || 'MID',
            status,
            nick,
            note,
            active: 0,
            bench: 0,
          });
        }

        if (!imported.length) {
          setCsvStatus({ type: 'err', text: 'No players imported. Check your file format.' });
          return;
        }

        if (csvMode === 'replace') {
          onUpdatePlayers(imported);
          onUpdateLineup({});
        } else {
          // Append unique only
          const existingNames = new Set(players.map((p) => p.name.toLowerCase()));
          const uniqueNew = imported.filter((p) => !existingNames.has(p.name.toLowerCase()));
          onUpdatePlayers([...players, ...uniqueNew]);
        }

        setCsvStatus({
          type: errors.length ? 'warn' : 'ok',
          text: `Successfully loaded ${imported.length} players! ${
            errors.length ? `(Skipped ${errors.length} erroneous rows)` : ''
          }`,
        });
      } catch (err: any) {
        setCsvStatus({ type: 'err', text: `Import failed: ${err.message}` });
      }
    };

    reader.readAsText(file);
  };

  const toggleFormPosition = (pos: string) => {
    if (formPositions.includes(pos)) {
      setFormPositions(formPositions.filter((p) => p !== pos));
    } else {
      setFormPositions([...formPositions, pos]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[var(--line)] shadow-sm">
        <div>
          <h2 className="text-xl font-black text-[var(--navy)] tracking-tight">Team Squad</h2>
          <p className="text-xs text-[var(--muted)] font-semibold mt-1">
            Manage player profiles, positional zones, bulk upload rosters
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleOpenAddPlayer}
            className="px-3.5 py-2 text-xs font-bold bg-[var(--green)] text-white rounded-xl hover:opacity-95 transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Player</span>
          </button>
        </div>
      </div>

      {/* CSV Import card */}
      <div className="bg-white p-4 rounded-2xl border border-[var(--line)] shadow-sm space-y-4">
        <h3 className="font-black text-sm text-[var(--navy)] tracking-tight flex items-center gap-1.5">
          <FileSpreadsheet className="w-4 h-4 text-[var(--blue)]" />
          <span>Bulk Load from Excel / CSV</span>
        </h3>
        <p className="text-xs text-[var(--muted)] font-semibold leading-relaxed">
          Upload a standard comma-separated file (.csv) containing columns for <b>Name</b>, <b>Number</b>, <b>Positions</b>, <b>Nickname</b>, and <b>Note</b>.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={csvMode}
            onChange={(e) => setCsvStatusMode(e.target.value as any)}
            className="px-3 py-1.5 border border-gray-200 bg-white rounded-xl text-xs font-bold text-[var(--ink)] focus:outline-none"
          >
            <option value="replace">Replace full squad with this file</option>
            <option value="append">Append unique players to current squad</option>
          </select>

          <label className="px-3.5 py-1.5 bg-[#EEF2FF] hover:bg-blue-50 text-[var(--blue)] font-bold text-xs rounded-xl transition border border-blue-100 cursor-pointer text-center">
            Upload CSV File
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="hidden"
            />
          </label>
        </div>

        {csvStatus && (
          <div className={`p-3 text-xs font-bold rounded-xl border ${
            csvStatus.type === 'ok' ? 'bg-green-50 border-green-200 text-[#0E7A48]' :
            csvStatus.type === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-800' :
            'bg-red-50 border-red-200 text-red-700'
          }`}>
            {csvStatus.text}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Players List */}
        <div className="bg-white rounded-2xl border border-[var(--line)] shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <h3 className="font-black text-sm text-[var(--navy)]">Roster list</h3>
            <button
              onClick={() => setSortBy(sortBy === 'number' ? 'name' : 'number')}
              className="px-2 py-1 text-[10px] font-black text-gray-500 bg-gray-50 border border-gray-100 rounded-md hover:bg-gray-100"
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
                className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition ${
                  filterZone === zone
                    ? 'bg-[var(--blue)] text-white'
                    : 'bg-gray-100 text-gray-500 hover:text-gray-800'
                }`}
              >
                {zone}
              </button>
            ))}
          </div>

          <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-100">
            {filtered.map((p) => {
              const isActive = activeId === p.id;
              const fldPos = Object.keys(lineup).find((k) => lineup[k] === p.id);

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
                      <span className="text-[10px] font-extrabold text-[var(--muted)] uppercase">
                        {p.primaryZone} {fldPos ? `• ${fldPos}` : ''}
                      </span>
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
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1">
                      Preferred Positions
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {activePlayer.positions && activePlayer.positions.length > 0 ? (
                        activePlayer.positions.map((pos) => (
                          <span
                            key={pos}
                            className="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-600 rounded-md text-[10px] font-bold"
                          >
                            {pos}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400 font-semibold italic">None configured</span>
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
            </>
          ) : (
            <div className="text-center py-12 text-gray-400 font-semibold">
              Add players to view detailed profiles.
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
              <div>
                <label className="block mb-2 text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Select Preferred Positions
                </label>
                <div className="space-y-2 max-h-36 overflow-y-auto border border-gray-100 p-2 rounded-xl bg-gray-50/50">
                  {Object.keys(POSITION_GROUPS).map((groupName) => (
                    <div key={groupName} className="space-y-1">
                      <b className="text-[10px] font-black uppercase text-gray-400 block mt-1">{groupName}</b>
                      <div className="flex flex-wrap gap-1.5">
                        {POSITION_GROUPS[groupName].map((pos) => {
                          const isSel = formPositions.includes(pos);
                          return (
                            <button
                              key={pos}
                              type="button"
                              onClick={() => toggleFormPosition(pos)}
                              className={`px-2 py-1 text-[10px] font-black rounded-lg border transition ${
                                isSel
                                  ? 'bg-[#EEF0FF] text-[var(--blue)] border-blue-200'
                                  : 'bg-white text-gray-500 border-gray-200 hover:text-gray-700'
                              }`}
                            >
                              {pos}
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
