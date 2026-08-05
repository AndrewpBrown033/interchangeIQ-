import React, { useState } from 'react';
import { Player, AuditLogEntry, TeamProfile } from '../types';
import { Palette, Download, Upload, ClipboardList, RefreshCw, User, Volume2, VolumeX, Smartphone, Bell, FileSpreadsheet, Landmark, CheckCircle2, Cloud, Play, Loader2 } from 'lucide-react';
import CsvImportGuide from './CsvImportGuide';

interface SettingsScreenProps {
  currentTheme: string;
  onChangeTheme: (themeId: string) => void;
  userName: string;
  onChangeUserName: (name: string) => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  auditLogs: AuditLogEntry[];
  onClearLogs: () => void;
  onLockSystem: () => void;
  onSimulateTimeout: () => void;
  soundEnabled: boolean;
  onChangeSoundEnabled: (enabled: boolean) => void;
  soundVolume: number;
  onChangeSoundVolume: (volume: number) => void;
  soundTone: string;
  onChangeSoundTone: (tone: string) => void;
  hapticEnabled: boolean;
  onChangeHapticEnabled: (enabled: boolean) => void;
  hapticPattern: string;
  onChangeHapticPattern: (pattern: string) => void;
  players?: Player[];
  onUpdatePlayers?: (players: Player[]) => void;
  onUpdateLineup?: (lineup: Record<string, string>) => void;
  teams?: TeamProfile[];
  activeTeamId?: string | null;
  onSelectTeam?: (teamId: string) => void;
  onNavigateTab?: (tab: string) => void;
  currentUserRole?: string;
  userTeamIds?: string[];
  onUpdateTeams?: (teams: TeamProfile[]) => void;
  onPerformLoginSync?: (source?: string) => Promise<{ success: boolean; teamCount: number; message: string }>;
}

export default function SettingsScreen({
  currentTheme,
  onChangeTheme,
  userName,
  onChangeUserName,
  onExportData,
  onImportData,
  auditLogs,
  onClearLogs,
  onLockSystem,
  onSimulateTimeout,
  soundEnabled,
  onChangeSoundEnabled,
  soundVolume,
  onChangeSoundVolume,
  soundTone,
  onChangeSoundTone,
  hapticEnabled,
  onChangeHapticEnabled,
  hapticPattern,
  onChangeHapticPattern,
  players = [],
  onUpdatePlayers,
  onUpdateLineup,
  teams = [],
  activeTeamId,
  onSelectTeam,
  onNavigateTab,
  currentUserRole = 'Coach',
  userTeamIds = [],
  onUpdateTeams,
  onPerformLoginSync,
}: SettingsScreenProps) {
  // Login Sync Rule testing state
  const [isTestingLoginSync, setIsTestingLoginSync] = useState(false);
  const [loginSyncNotice, setLoginSyncNotice] = useState<string | null>(null);

  const handleRunLoginSyncTest = async () => {
    if (!onPerformLoginSync) return;
    setIsTestingLoginSync(true);
    setLoginSyncNotice(null);
    try {
      const result = await onPerformLoginSync('Manual Settings Test');
      if (result.success) {
        setLoginSyncNotice(`✅ Sync Rule Executed: ${result.teamCount} team(s) synchronized with Firestore.`);
      } else {
        setLoginSyncNotice(`⚠️ Sync Notice: ${result.message}`);
      }
    } catch (e: any) {
      setLoginSyncNotice(`⚠️ Sync Test Error: ${e.message}`);
    } finally {
      setIsTestingLoginSync(false);
    }
  };
  // Filter teams to only show those this coach actually belongs to. No role-based
  // bypass and no "fall back to everything if the filter comes up empty" — a coach
  // with no assigned teams should see an empty state, not every club in the system.
  const accessibleTeams = React.useMemo(() => {
    if (!teams || teams.length === 0) return [];
    if (!userTeamIds || userTeamIds.length === 0) return [];
    return teams.filter((t) => userTeamIds.includes(t.id));
  }, [teams, userTeamIds]);

  const handleRenameTeamInSettings = (teamId: string) => {
    if (!onUpdateTeams || !teams) return;
    const currentTeam = teams.find((t) => t.id === teamId);
    const newName = prompt('Enter new team / club name:', currentTeam?.name || '');
    if (!newName || !newName.trim()) return;
    onUpdateTeams(teams.map((t) => (t.id === teamId ? { ...t, name: newName.trim() } : t)));
  };
  // CSV Import state
  const [csvStatus, setCsvStatus] = useState<{ type: 'ok' | 'warn' | 'err'; text: string } | null>(null);
  const [csvMode, setCsvMode] = useState<'replace' | 'append'>('replace');

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

        if (onUpdatePlayers) {
          if (csvMode === 'replace') {
            onUpdatePlayers(imported);
            if (onUpdateLineup) onUpdateLineup({});
          } else {
            // Append unique only
            const existingNames = new Set(players.map((p) => p.name.toLowerCase()));
            const uniqueNew = imported.filter((p) => !existingNames.has(p.name.toLowerCase()));
            onUpdatePlayers([...players, ...uniqueNew]);
          }
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
  const THEMES = [
    { id: 'classic', name: 'Classic Navy', colors: ['#0B1238', '#1F36C7', '#00C8E6'] },
    { id: 'forest', name: 'Forest Green', colors: ['#0B2818', '#127A42', '#5FE3A0'] },
    { id: 'sunset', name: 'Sunset Amber', colors: ['#3A1D0B', '#C2410C', '#FDBA74'] },
    { id: 'royal', name: 'Royal Purple', colors: ['#1E1240', '#7C3AED', '#C4B5FD'] },
    { id: 'bright', name: 'Bright Light', colors: ['#181B24', '#F0502A', '#6EC6FF'] },
  ];

  // Audio Context for settings test alerts
  const audioCtxRef = React.useRef<AudioContext | null>(null);

  // Global listener to unlock iOS Safari Web Audio restrictions on any user gesture
  React.useEffect(() => {
    const unlockAudio = () => {
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioCtxRef.current;
        if (ctx && ctx.state === 'suspended') {
          ctx.resume();
        }
        // Play a short silent buffer to satisfy iOS auto-play gesture requirements
        if (ctx) {
          const buffer = ctx.createBuffer(1, 1, 22050);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(0);
        }
      } catch (e) {
        console.warn('Silent audio unlock failed', e);
      }
    };

    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // Settings screen test chime and vibration player
  const playSatisfactionChime = (triggerType: 'timer-end' | 'rotation-due' | 'test') => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const mainVolume = soundVolume;
      const now = ctx.currentTime;

      const playTone = (freq: number, startDelay: number, duration: number, type: OscillatorType = 'sine', decayMult = 1.0) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        const startTime = now + startDelay;
        gainNode.gain.setValueAtTime(0.0001, startTime);
        
        // Attack
        gainNode.gain.linearRampToValueAtTime(mainVolume * 0.35, startTime + 0.015);
        // Decay
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * decayMult);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.05);
      };

      if (triggerType === 'rotation-due') {
        if (soundTone === 'acoustic') {
          playTone(587.33, 0.0, 0.45, 'sine');
          playTone(587.33 * 1.5, 0.0, 0.3, 'sine');
          playTone(880.00, 0.12, 0.55, 'sine');
          playTone(880.00 * 1.5, 0.12, 0.4, 'sine');
        } else if (soundTone === 'marimba') {
          playTone(440.00, 0.0, 0.18, 'triangle');
          playTone(554.37, 0.08, 0.22, 'triangle');
        } else if (soundTone === 'digital') {
          playTone(1046.50, 0.0, 0.08, 'square');
          playTone(1567.98, 0.08, 0.12, 'square');
        } else {
          playTone(880, 0.0, 0.15, 'sine');
          playTone(880, 0.2, 0.15, 'sine');
        }
      } else if (triggerType === 'timer-end') {
        if (soundTone === 'acoustic') {
          const notes = [523.25, 659.25, 783.99, 1046.50];
          notes.forEach((freq, idx) => {
            playTone(freq, idx * 0.1, 0.8, 'sine');
            playTone(freq * 1.5, idx * 0.1, 0.6, 'sine');
          });
          notes.forEach((freq, idx) => {
            playTone(freq, 0.7 + idx * 0.08, 0.8, 'sine');
            playTone(freq * 1.5, 0.7 + idx * 0.08, 0.6, 'sine');
          });
        } else if (soundTone === 'marimba') {
          const notes = [329.63, 392.00, 523.25, 659.25];
          notes.forEach((freq, idx) => {
            playTone(freq, idx * 0.08, 0.3, 'triangle');
            playTone(freq, 0.35 + idx * 0.08, 0.3, 'triangle');
            playTone(freq, 0.7 + idx * 0.08, 0.5, 'triangle');
          });
        } else if (soundTone === 'digital') {
          for (let i = 0; i < 4; i++) {
            playTone(1320, i * 0.18, 0.12, 'square');
            playTone(1760, i * 0.18 + 0.06, 0.12, 'sawtooth');
          }
        } else {
          playTone(880, 0.0, 0.25, 'sine');
          playTone(880, 0.3, 0.25, 'sine');
          playTone(880, 0.6, 0.25, 'sine');
        }
      } else if (triggerType === 'test') {
        if (soundTone === 'acoustic') {
          playTone(523.25, 0.0, 0.7, 'sine');
          playTone(523.25 * 1.5, 0.0, 0.5, 'sine');
        } else if (soundTone === 'marimba') {
          playTone(523.25, 0.0, 0.25, 'triangle');
        } else if (soundTone === 'digital') {
          playTone(1200, 0.0, 0.08, 'square');
        } else {
          playTone(880, 0.0, 0.18, 'sine');
        }
      }
    } catch (e) {
      console.warn('Audio feedback failed', e);
    }
  };

  const playSatisfactionVibration = (triggerType: 'timer-end' | 'rotation-due' | 'test') => {
    if (!hapticEnabled) return;
    try {
      if (!navigator.vibrate) return;
      let pattern: number[] = [];

      if (hapticPattern === 'pulse') {
        if (triggerType === 'rotation-due') {
          pattern = [100, 50, 100];
        } else if (triggerType === 'timer-end') {
          pattern = [200, 100, 200, 100, 200];
        } else {
          pattern = [100];
        }
      } else if (hapticPattern === 'double-tap') {
        if (triggerType === 'rotation-due') {
          pattern = [50, 40, 50];
        } else if (triggerType === 'timer-end') {
          pattern = [70, 50, 70, 100, 70, 50, 70];
        } else {
          pattern = [60, 40, 60];
        }
      } else if (hapticPattern === 'heartbeat') {
        if (triggerType === 'rotation-due') {
          pattern = [80, 100, 150];
        } else if (triggerType === 'timer-end') {
          pattern = [120, 120, 250, 120, 120, 250];
        } else {
          pattern = [90, 90, 120];
        }
      } else if (hapticPattern === 'intense') {
        if (triggerType === 'rotation-due') {
          pattern = [250, 80, 250];
        } else if (triggerType === 'timer-end') {
          pattern = [400, 80, 400, 80, 400];
        } else {
          pattern = [300];
        }
      }

      if (pattern.length > 0) {
        navigator.vibrate(pattern);
      }
    } catch (e) {}
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-2xl border border-[var(--line)] shadow-sm">
        <h2 className="text-xl font-black text-[var(--navy)] tracking-tight">System Settings</h2>
        <p className="text-xs text-[var(--muted)] font-semibold mt-1">
          Customise look &amp; feel, run local diagnostics and export safety backups
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card & Look */}
        <div className="space-y-6">
          {/* Profile Name setting */}
          <div className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-sm space-y-4">
            <h3 className="font-black text-sm text-[var(--navy)] flex items-center gap-1.5">
              <User className="w-4 h-4 text-[var(--blue)]" />
              <span>Coach Profile Details</span>
            </h3>
            <div>
              <label className="text-xs font-bold text-[var(--muted)] tracking-wider uppercase block mb-1">
                Your Professional Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => onChangeUserName(e.target.value)}
                placeholder="e.g. Coach Sarah"
                className="w-full px-3 py-2 border border-[var(--line)] rounded-xl text-sm bg-white text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
              />
              <span className="text-[10px] font-semibold text-[var(--muted)] block mt-1">
                All changes on this device will be attributed to this name in the log.
              </span>
            </div>
          </div>

          {/* Teams & Clubs Access section */}
          <div className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-black text-sm text-[var(--navy)] flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-[var(--blue)]" />
                <span>Teams &amp; Clubs ({accessibleTeams.length})</span>
              </h3>
              {currentUserRole && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                  {currentUserRole} Access
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--muted)] font-semibold leading-relaxed">
              {currentUserRole === 'Admin'
                ? 'As System Administrator, you have full access to all registered clubs and teams.'
                : 'Clubs and teams assigned to your manager profile. Select a squad to make it your active view.'}
            </p>

            <div className="space-y-2 pt-1">
              {accessibleTeams.map((t, index) => {
                const isActive = activeTeamId === t.id;
                const isInactive = !!t.isInactive;
                return (
                  <div
                    key={`setting-team-${t.id || index}`}
                    className={`p-3.5 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                      isInactive
                        ? 'border-amber-200 bg-amber-50/30'
                        : isActive
                        ? 'border-[var(--green)] bg-green-50/50'
                        : 'border-gray-100 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <b className={`text-xs font-extrabold truncate ${isInactive ? 'text-gray-500 line-through' : 'text-[var(--ink)]'}`}>
                          {t.name}
                        </b>
                        {isActive && (
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 rounded-md border border-emerald-200">
                            Active Selection
                          </span>
                        )}
                        {isInactive && (
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-amber-100 text-amber-800 rounded-md border border-amber-200">
                            Inactive
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold block truncate">
                        Squad ID: {t.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {onSelectTeam && (
                        <button
                          onClick={() => {
                            onSelectTeam(t.id);
                            if (onNavigateTab) onNavigateTab('team');
                          }}
                          className={`px-3 py-1.5 text-[11px] font-extrabold rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                            isActive
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs hover:bg-emerald-700'
                              : 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700 shadow-2xs'
                          }`}
                          title="Select squad and open Team View"
                        >
                          <span>{isActive ? 'View Team View →' : 'Switch Team →'}</span>
                        </button>
                      )}
                      {onUpdateTeams && (
                        <button
                          onClick={() => handleRenameTeamInSettings(t.id)}
                          className="px-2.5 py-1.5 text-xs font-bold bg-[#F0F1F5] text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200"
                        >
                          Rename
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {accessibleTeams.length === 0 && (
                <div className="p-4 border border-dashed border-gray-200 rounded-xl text-center">
                  <p className="text-xs text-gray-400 font-semibold">
                    No clubs or teams currently assigned to your manager profile.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Theme card selection */}
          <div className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-sm space-y-4">
            <h3 className="font-black text-sm text-[var(--navy)] flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-[var(--blue)]" />
              <span>App Color Styling</span>
            </h3>
            <p className="text-xs text-[var(--muted)] font-semibold leading-relaxed">
              Choose your dashboard colour style. Changes will apply immediately across all screens.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {THEMES.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onChangeTheme(t.id)}
                  className={`p-3 border rounded-xl cursor-pointer hover:bg-gray-50 transition flex items-center justify-between gap-3 ${
                    currentTheme === t.id ? 'border-[var(--blue)] bg-blue-50/20 shadow-xs' : 'border-gray-100'
                  }`}
                >
                  <b className="text-xs font-bold text-[var(--ink)]">{t.name}</b>
                  <div className="flex h-5 w-12 rounded overflow-hidden border border-gray-100">
                    {t.colors.map((c, idx) => (
                      <span key={idx} className="flex-1" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Default Sync on Login Rule Card */}
          <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/70 p-5 rounded-2xl border border-indigo-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-600/10 text-indigo-600 rounded-lg">
                  <Cloud className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-indigo-950 flex items-center gap-1.5">
                    <span>Default Sync on Login Rule</span>
                    <span className="px-2 py-0.5 bg-indigo-600 text-white font-mono text-[9px] rounded-full uppercase tracking-wider">
                      Active
                    </span>
                  </h3>
                  <p className="text-[11px] text-indigo-800 font-medium">
                    Automatic cloud synchronization triggered upon every successful coach login
                  </p>
                </div>
              </div>
              {onPerformLoginSync && (
                <button
                  type="button"
                  onClick={handleRunLoginSyncTest}
                  disabled={isTestingLoginSync}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isTestingLoginSync ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Test Sync Rule</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <p className="text-xs text-indigo-900/90 leading-relaxed font-sans">
              <strong>Rule Policy:</strong> Whenever a coach logs in or restores an authenticated passkey session, the app automatically executes a background sync rule. This synchronizes all team rosters, active match lineups, rotation logs, and drill templates directly with Cloud Firestore.
            </p>

            {loginSyncNotice && (
              <div className="p-2.5 bg-white/90 rounded-xl border border-indigo-200 text-xs font-mono font-semibold text-indigo-900">
                {loginSyncNotice}
              </div>
            )}
          </div>

          {/* Data Export & Backup Restore — moved here to balance the two columns
              now that the Session Security card has been removed. */}
          <div className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-sm space-y-4">
            <h3 className="font-black text-sm text-[var(--navy)] flex items-center gap-1.5">
              <Download className="w-4 h-4 text-[var(--blue)]" />
              <span>Data Export & Backup Restore</span>
            </h3>
            <p className="text-xs text-[var(--muted)] font-semibold leading-relaxed">
              Safeguard your data. Download a complete snapshot (.json file) of your players, lineup slots, match scoreboards, and plan templates.
            </p>

            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={onExportData}
                className="px-4 py-2 text-xs font-bold bg-[#FAFBFF] border border-blue-100 hover:bg-blue-50 text-[var(--blue)] rounded-xl transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON Backup</span>
              </button>

              <label className="px-4 py-2 text-xs font-bold bg-[#F0F1F5] hover:bg-gray-200 text-gray-700 rounded-xl border border-[var(--line)] transition flex items-center gap-1.5 cursor-pointer text-center">
                <Upload className="w-3.5 h-3.5" />
                <span>Import Backup</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={onImportData}
                  className="hidden"
                />
              </label>
            </div>
          </div>

        </div>

        {/* Backups & Activity Audit logs */}
        <div className="space-y-6">
          {/* Sound & Vibration Preferences */}
          <div className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-sm space-y-4">
            <h3 className="font-black text-sm text-[var(--navy)] flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <Volume2 className="w-4 h-4 text-[var(--blue)]" />
              <span>Vibration & Chime Alerts</span>
            </h3>
            
            <p className="text-xs text-[var(--muted)] font-semibold leading-relaxed">
              Configure your game-day audio and tactile alerts. Any user interaction unlocks Web Audio on your device.
            </p>

            <div className="space-y-4">
              {/* Sound Settings */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4 text-emerald-600 animate-pulse" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-gray-400" />
                    )}
                    <span>Audio Chime Alerts</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => onChangeSoundEnabled(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                {soundEnabled && (
                  <div className="space-y-3 animate-in fade-in duration-150">
                    <div>
                      <label className="text-[11px] font-semibold text-gray-500 block mb-1">Chime Sound Style</label>
                      <select
                        value={soundTone}
                        onChange={(e) => onChangeSoundTone(e.target.value)}
                        className="w-full text-xs bg-white border border-gray-200 rounded-lg p-2 font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="acoustic">🔔 Acoustic Chime (Rich Harmonics)</option>
                        <option value="marimba">🪵 Warm Marimba (Soft Wood Tap)</option>
                        <option value="digital">⚡ Digital Alert (Tech Blip)</option>
                        <option value="classic">🔊 Classic Beep (Standard Sine)</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-semibold text-gray-500">Volume</label>
                        <span className="text-[10px] font-mono font-bold text-indigo-600">{Math.round(soundVolume * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={soundVolume}
                        onChange={(e) => onChangeSoundVolume(parseFloat(e.target.value))}
                        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Haptic Settings */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-indigo-600" />
                    <span>Haptic Vibration</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={hapticEnabled}
                    onChange={(e) => onChangeHapticEnabled(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                {hapticEnabled && (
                  <div className="space-y-2 animate-in fade-in duration-150">
                    <div>
                      <label className="text-[11px] font-semibold text-gray-500 block mb-1">Vibration Pattern</label>
                      <select
                        value={hapticPattern}
                        onChange={(e) => onChangeHapticPattern(e.target.value)}
                        className="w-full text-xs bg-white border border-gray-200 rounded-lg p-2 font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="pulse">📳 Standard Pulse (Alerts)</option>
                        <option value="double-tap">💓 Heartbeat Rhythm</option>
                        <option value="intense">⚡ High Intensity (Timer Ends)</option>
                      </select>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                      <p className="text-[10px] text-amber-800 leading-relaxed font-semibold">
                        ⚠️ iPhone Vibration Tip:
                      </p>
                      <p className="text-[9px] text-amber-700 leading-relaxed mt-0.5 font-medium">
                        Apple iOS restricts the <code className="font-mono text-[10px]">navigator.vibrate</code> API inside Safari/Chrome. Vibration is unavailable on iPhones, but high-quality sound alerts play beautifully!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Test Console */}
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/60 space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-indigo-600 animate-bounce" />
                  <span className="text-xs font-black text-gray-700 uppercase tracking-wider">Sideline Test Console</span>
                </div>
                <p className="text-[10px] text-gray-500 leading-relaxed font-semibold">
                  Test your active configurations below. Note: if your iPhone is on silent, iOS completely blocks audio chimes.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      playSatisfactionChime('test');
                      playSatisfactionVibration('test');
                    }}
                    className="py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition uppercase cursor-pointer text-center"
                  >
                    ⚡ Test Tap
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playSatisfactionChime('rotation-due');
                      playSatisfactionVibration('rotation-due');
                    }}
                    className="py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition uppercase cursor-pointer text-center"
                  >
                    🔁 Rotation Alert
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playSatisfactionChime('timer-end');
                      playSatisfactionVibration('timer-end');
                    }}
                    className="py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold transition uppercase cursor-pointer text-center"
                  >
                    🚨 Timer Alarm
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Load Roster from Excel / CSV */}
          <CsvImportGuide
            players={players || []}
            onUpdatePlayers={onUpdatePlayers}
            onUpdateLineup={onUpdateLineup}
          />


          {/* Activity Logs */}
          <div className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="font-black text-sm text-[var(--navy)] flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-[var(--blue)]" />
                <span>Activity Audit Logs</span>
              </h3>
              <button
                onClick={onClearLogs}
                className="px-2 py-0.5 rounded text-[10px] font-black text-red-600 bg-red-50 hover:bg-red-100"
              >
                Clear Log
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto pr-1 divide-y divide-gray-100 space-y-2">
              {auditLogs.map((e, idx) => (
                <div key={idx} className="text-[11px] font-semibold text-gray-600 py-1.5 flex justify-between gap-4">
                  <span>
                    {e.action} • <span className="text-[var(--muted)] font-bold">{e.user}</span>
                  </span>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <p className="text-xs text-gray-400 font-semibold text-center py-4 italic">
                  No activity logged yet on this device.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
