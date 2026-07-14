import React from 'react';
import { AuditLogEntry } from '../types';
import { Palette, Download, Upload, ClipboardList, RefreshCw, User, KeyRound, Fingerprint } from 'lucide-react';

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
}: SettingsScreenProps) {
  const THEMES = [
    { id: 'classic', name: 'Classic Navy', colors: ['#0B1238', '#1F36C7', '#00C8E6'] },
    { id: 'forest', name: 'Forest Green', colors: ['#0B2818', '#127A42', '#5FE3A0'] },
    { id: 'sunset', name: 'Sunset Amber', colors: ['#3A1D0B', '#C2410C', '#FDBA74'] },
    { id: 'royal', name: 'Royal Purple', colors: ['#1E1240', '#7C3AED', '#C4B5FD'] },
    { id: 'bright', name: 'Bright Light', colors: ['#181B24', '#F0502A', '#6EC6FF'] },
  ];

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

          {/* Biometrics & Passkey Security */}
          <div className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-sm space-y-4">
            <h3 className="font-black text-sm text-[var(--navy)] flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-[var(--blue)]" />
              <span>Biometric Security (Passkey / Touch ID / Face ID)</span>
            </h3>
            <p className="text-xs text-[var(--muted)] font-semibold leading-relaxed">
              Secure your InterchangeIQ tablet or phone dashboard using secure iOS/macOS passkeys. Once enabled, you will be prompted for Face ID or Touch ID upon opening.
            </p>

            <button
              onClick={onLockSystem}
              className="px-4 py-2.5 text-xs font-black bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition flex items-center gap-2 cursor-pointer"
            >
              <Fingerprint className="w-4 h-4 text-emerald-400" />
              <span>Lock Screen & Test Passkey Gate</span>
            </button>
          </div>
        </div>

        {/* Backups & Activity Audit logs */}
        <div className="space-y-6">
          {/* Backup Restore Card */}
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
