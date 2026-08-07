import React, { useState, useRef } from 'react';
import { Player, ApiKeySettings } from '../types';
import { POSITIONS } from '../constants';
import { Camera, X, CheckCircle2, AlertTriangle, Loader2, UserPlus, ImagePlus } from 'lucide-react';

interface DetectedEntry {
  name: string;
  number: string;
}

interface DetectedOnField extends DetectedEntry {
  position: string;
}

interface LineupImportResult {
  onField: DetectedOnField[];
  interchange: DetectedEntry[];
  unplaced: DetectedEntry[];
}

interface MatchRow {
  key: string;
  section: 'onField' | 'interchange' | 'unplaced';
  position: string; // '' for interchange/unplaced
  detectedName: string;
  detectedNumber: string;
  matchedPlayerId: string | null;
}

interface LineupPhotoImportProps {
  players: Player[];
  onUpdatePlayers: (players: Player[]) => void;
  onUpdateLineup: (lineup: Record<string, string>) => void;
  apiKeys?: ApiKeySettings;
  isDebugEnabled?: boolean;
  onClose: () => void;
}

const ON_FIELD_POSITION_CODES = POSITIONS.map(([code]) => code);

function findMatch(players: Player[], name: string, number: string): Player | null {
  const num = number.trim();
  if (num) {
    const byNumber = players.find((p) => p.number.trim() === num);
    if (byNumber) return byNumber;
  }
  const n = name.trim().toLowerCase();
  if (!n) return null;
  const byNick = players.find((p) => p.nick.trim().toLowerCase() === n);
  if (byNick) return byNick;
  const byFirstName = players.find((p) => p.name.trim().toLowerCase().split(/\s+/)[0] === n);
  if (byFirstName) return byFirstName;
  const byContains = players.find((p) => p.name.trim().toLowerCase().includes(n));
  return byContains || null;
}

export default function LineupPhotoImport({ players, onUpdatePlayers, onUpdateLineup, apiKeys, isDebugEnabled, onClose }: LineupPhotoImportProps) {
  const [step, setStep] = useState<'upload' | 'processing' | 'review'>('upload');
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const logTrace = (msg: string) => {
    const ts = new Date().toISOString().slice(11, 23);
    setDebugLogs((prev) => [...prev, `[${ts}] [CLIENT] ${msg}`]);
  };

  const handleFileSelected = async (file: File) => {
    setError(null);
    setDebugLogs([]);
    setStep('processing');
    logTrace(`File selected: "${file.name}" | ${file.type || 'unknown type'} | ${(file.size / 1024).toFixed(1)} KB`);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = String(reader.result || '');
        logTrace(`Image read into memory as base64 (${dataUrl.length} chars total).`);
        logTrace(`Sending to /api/import-lineup | provider: gemini | using ${apiKeys?.geminiApiKey ? 'admin-configured key override' : 'server GEMINI_API_KEY env var'}.`);

        const requestStartedAt = Date.now();
        const res = await fetch('/api/import-lineup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: dataUrl,
            mimeType: file.type || 'image/jpeg',
            provider: 'gemini',
            apiKeyOverride: apiKeys?.geminiApiKey,
          }),
        });
        logTrace(`Response received in ${Date.now() - requestStartedAt}ms | HTTP status: ${res.status} ${res.statusText}`);

        const rawText = await res.text();
        let data: any = {};
        try {
          data = JSON.parse(rawText);
        } catch (parseErr) {
          logTrace(`ERROR: response body is not valid JSON — this usually means the request never reached the API (e.g. a stale deploy, or /api/* routing isn't set up). First 300 chars of raw response: ${rawText.slice(0, 300)}`);
        }

        if (Array.isArray(data.debugLogs)) {
          setDebugLogs((prev) => [...prev, ...data.debugLogs.map((l: string) => `[SERVER] ${l}`)]);
        }

        if (!res.ok || !data.lineup) {
          logTrace(`Request did not return a usable lineup. error="${data.error || '(none)'}" details="${data.details || '(none)'}"`);
          setError(data.error ? `${data.error}${data.details ? ` — ${data.details}` : ''}` : 'Could not read the team sheet from that photo.');
          setStep('upload');
          return;
        }

        const result: LineupImportResult = data.lineup || { onField: [], interchange: [], unplaced: [] };
        const onFieldList = Array.isArray(result.onField) ? result.onField : [];
        const interchangeList = Array.isArray(result.interchange) ? result.interchange : [];
        const unplacedList = Array.isArray(result.unplaced) ? result.unplaced : [];

        logTrace(`Parsed result: ${onFieldList.length} on-field, ${interchangeList.length} interchange, ${unplacedList.length} unplaced.`);
        const newRows: MatchRow[] = [];

        onFieldList.forEach((entry, i) => {
          const match = findMatch(players, entry.name, entry.number);
          logTrace(`Match "${entry.name}" #${entry.number} (${entry.position}) -> ${match ? `${match.name} (roster id ${match.id})` : 'NO MATCH'}`);
          newRows.push({
            key: `onfield-${i}`,
            section: 'onField',
            position: entry.position,
            detectedName: entry.name,
            detectedNumber: entry.number,
            matchedPlayerId: match?.id || null,
          });
        });
        interchangeList.forEach((entry, i) => {
          const match = findMatch(players, entry.name, entry.number);
          logTrace(`Match "${entry.name}" #${entry.number} (interchange) -> ${match ? `${match.name} (roster id ${match.id})` : 'NO MATCH'}`);
          newRows.push({
            key: `interchange-${i}`,
            section: 'interchange',
            position: '',
            detectedName: entry.name,
            detectedNumber: entry.number,
            matchedPlayerId: match?.id || null,
          });
        });
        unplacedList.forEach((entry, i) => {
          const match = findMatch(players, entry.name, entry.number);
          logTrace(`Match "${entry.name}" #${entry.number} (unplaced) -> ${match ? `${match.name} (roster id ${match.id})` : 'NO MATCH'}`);
          newRows.push({
            key: `unplaced-${i}`,
            section: 'unplaced',
            position: '',
            detectedName: entry.name,
            detectedNumber: entry.number,
            matchedPlayerId: match?.id || null,
          });
        });

        setRows(newRows);
        setStep('review');
      } catch (err: any) {
        logTrace(`FATAL CLIENT ERROR: ${err.message || String(err)}`);
        setError(err.message || 'Something went wrong reading that photo.');
        setStep('upload');
      }
    };
    reader.onerror = () => {
      logTrace('FileReader error — could not read the selected file.');
      setError('Could not read that image file.');
      setStep('upload');
    };
    reader.readAsDataURL(file);
  };

  const handleAddAsNewPlayer = (rowKey: string) => {
    const row = rows.find((r) => r.key === rowKey);
    if (!row) return;
    const newPlayer: Player = {
      id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: row.detectedName,
      nick: row.detectedName,
      number: row.detectedNumber,
      positions: row.position ? [row.position] : [],
      primaryZone: row.position || '',
      status: 'available',
      active: 0,
      bench: 0,
      note: 'Added from team-sheet photo scan',
    };
    onUpdatePlayers([...players, newPlayer]);
    setRows((prev) => prev.map((r) => (r.key === rowKey ? { ...r, matchedPlayerId: newPlayer.id } : r)));
  };

  const handleChangeMatch = (rowKey: string, playerId: string) => {
    setRows((prev) => prev.map((r) => (r.key === rowKey ? { ...r, matchedPlayerId: playerId || null } : r)));
  };

  const handleChangePosition = (rowKey: string, position: string) => {
    setRows((prev) => prev.map((r) => (r.key === rowKey ? { ...r, position } : r)));
  };

  const handleApply = () => {
    const slots: Record<string, string> = {};
    const skipped: string[] = [];

    rows
      .filter((r) => r.section === 'onField')
      .forEach((r) => {
        if (r.matchedPlayerId && r.position) {
          slots[r.position] = r.matchedPlayerId;
        } else {
          skipped.push(`${r.detectedName} ${r.detectedNumber ? `#${r.detectedNumber}` : ''}`.trim());
        }
      });

    onUpdateLineup(slots);

    if (skipped.length > 0) {
      alert(`Lineup applied. ${skipped.length} player(s) couldn't be placed and were skipped: ${skipped.join(', ')}. You can assign them manually on the ground.`);
    }
    onClose();
  };

  const onFieldRows = rows.filter((r) => r.section === 'onField');
  const interchangeRows = rows.filter((r) => r.section === 'interchange');
  const unplacedRows = rows.filter((r) => r.section === 'unplaced');
  const unmatchedCount = rows.filter((r) => !r.matchedPlayerId).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[var(--blue)]" />
            <h3 className="font-black text-sm text-[var(--navy)]">Scan Team Sheet</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {step === 'upload' && (
            <div className="space-y-4">
              <p className="text-xs text-[var(--muted)] font-semibold leading-relaxed">
                Take or upload a photo of your interchange whiteboard / team sheet. We'll read the player names, numbers,
                and positions, and match them against your current roster.
              </p>
              {error && (
                <div className="rounded-xl p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              {isDebugEnabled && debugLogs.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Debug Trace:</span>
                  <div className="p-3 bg-black/80 rounded-xl border border-slate-800 space-y-1 text-[11px] leading-relaxed overflow-x-auto max-h-56 overflow-y-auto">
                    {debugLogs.map((log, lIdx) => (
                      <div key={lIdx} className="whitespace-pre-wrap break-all text-emerald-400">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelected(file);
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-blue-200 rounded-2xl bg-blue-50/40 hover:bg-blue-50 transition flex flex-col items-center gap-2 cursor-pointer"
              >
                <ImagePlus className="w-8 h-8 text-[var(--blue)]" />
                <span className="text-sm font-extrabold text-[var(--navy)]">Take or Choose Photo</span>
                <span className="text-[11px] text-gray-400 font-semibold">Clear, well-lit shot works best</span>
              </button>
            </div>
          )}

          {step === 'processing' && (
            <div className="py-8 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-[var(--blue)] animate-spin" />
              <p className="text-xs font-bold text-gray-500">Reading the team sheet...</p>
              {isDebugEnabled && debugLogs.length > 0 && (
                <div className="w-full space-y-1 pt-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Debug Trace:</span>
                  <div className="p-3 bg-black/80 rounded-xl border border-slate-800 space-y-1 text-[11px] leading-relaxed overflow-x-auto max-h-56 overflow-y-auto">
                    {debugLogs.map((log, lIdx) => (
                      <div key={lIdx} className="whitespace-pre-wrap break-all text-emerald-400">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-5">
              <p className="text-xs text-[var(--muted)] font-semibold leading-relaxed">
                Check the matches below before applying — tap a name to fix a mismatch, or add a player who isn't on your roster yet.
                {unmatchedCount > 0 && (
                  <span className="text-amber-600 font-bold"> {unmatchedCount} player(s) need a match.</span>
                )}
              </p>

              <RowSection title="On Field" rows={onFieldRows} players={players} onChangeMatch={handleChangeMatch} onChangePosition={handleChangePosition} onAddNew={handleAddAsNewPlayer} showPosition />
              {interchangeRows.length > 0 && (
                <RowSection title="Interchange" rows={interchangeRows} players={players} onChangeMatch={handleChangeMatch} onChangePosition={handleChangePosition} onAddNew={handleAddAsNewPlayer} />
              )}
              {unplacedRows.length > 0 && (
                <RowSection title="Unplaced / Emergencies" rows={unplacedRows} players={players} onChangeMatch={handleChangeMatch} onChangePosition={handleChangePosition} onAddNew={handleAddAsNewPlayer} />
              )}

              {isDebugEnabled && debugLogs.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Debug Trace:</span>
                  <div className="p-3 bg-black/80 rounded-xl border border-slate-800 space-y-1 text-[11px] leading-relaxed overflow-x-auto max-h-56 overflow-y-auto">
                    {debugLogs.map((log, lIdx) => (
                      <div key={lIdx} className="whitespace-pre-wrap break-all text-emerald-400">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {step === 'review' && (
          <div className="px-5 py-4 border-t border-gray-100 shrink-0 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 text-xs font-black text-white bg-[var(--blue)] hover:opacity-90 rounded-xl cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Apply Lineup</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function RowSection({
  title,
  rows,
  players,
  onChangeMatch,
  onChangePosition,
  onAddNew,
  showPosition,
}: {
  title: string;
  rows: MatchRow[];
  players: Player[];
  onChangeMatch: (rowKey: string, playerId: string) => void;
  onChangePosition: (rowKey: string, position: string) => void;
  onAddNew: (rowKey: string) => void;
  showPosition?: boolean;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">{title} ({rows.length})</h4>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div
            key={row.key}
            className={`flex items-center gap-2 p-2.5 rounded-xl border ${
              row.matchedPlayerId ? 'border-gray-150 bg-gray-50/50' : 'border-amber-200 bg-amber-50/50'
            }`}
          >
            {showPosition && (
              <select
                value={row.position}
                onChange={(e) => onChangePosition(row.key, e.target.value)}
                className="text-[11px] font-black bg-white border border-gray-200 rounded-lg px-1.5 py-1 w-16 shrink-0 cursor-pointer"
              >
                {ON_FIELD_POSITION_CODES.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            )}
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-gray-800">{row.detectedName}</span>
              {row.detectedNumber && <span className="text-[10px] text-gray-400 font-semibold ml-1">#{row.detectedNumber}</span>}
            </div>
            <select
              value={row.matchedPlayerId || ''}
              onChange={(e) => onChangeMatch(row.key, e.target.value)}
              className="text-[11px] font-bold bg-white border border-gray-200 rounded-lg px-2 py-1 flex-1 min-w-0 max-w-[160px] cursor-pointer"
            >
              <option value="">— No match —</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.name} {p.number ? `#${p.number}` : ''}</option>
              ))}
            </select>
            {!row.matchedPlayerId && (
              <button
                onClick={() => onAddNew(row.key)}
                title="Add as a new roster player"
                className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
