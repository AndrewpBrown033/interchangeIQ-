import React, { useState } from 'react';
import { Player } from '../types';
import { FileSpreadsheet, Download, Info, CheckCircle2, AlertCircle, Upload, ChevronDown, ChevronUp } from 'lucide-react';

interface CsvImportGuideProps {
  players: Player[];
  onUpdatePlayers: (players: Player[]) => void;
  onUpdateLineup?: (lineup: Record<string, string>) => void;
  title?: string;
  onSuccess?: () => void;
}

export default function CsvImportGuide({
  players,
  onUpdatePlayers,
  onUpdateLineup,
  title = "Bulk Import Roster from CSV / Excel",
  onSuccess,
}: CsvImportGuideProps) {
  const [csvStatus, setCsvStatus] = useState<{ type: 'ok' | 'warn' | 'err'; text: string } | null>(null);
  const [csvMode, setCsvMode] = useState<'replace' | 'append'>('replace');
  const [showDetails, setShowDetails] = useState(true);

  const handleDownloadCSVTemplate = () => {
    const headers = "Name,Number,Positions,Status,Nickname,Note";
    const rows = [
      "Dustin Martin,4,MID; RHF,available,Dusty,Key midfielder",
      "Marcus Bontempelli,7,MID; CHF,available,Bont,Captain & Onballer",
      "Harris Andrews,31,FB; CHB,available,Harris,Key defender",
      "Nick Daicos,35,RHB; MID,available,Daicos,Playmaker",
      "Max Gawn,11,RUCK,available,Maxi,Ruckman",
    ];
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "squad_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPlayersCSV = () => {
    if (!players || players.length === 0) {
      setCsvStatus({ type: 'err', text: 'No players in active squad roster to export.' });
      return;
    }
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
    link.setAttribute("download", `roster_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setCsvStatus({ type: 'ok', text: `Successfully exported ${players.length} players to CSV!` });
  };

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
          const statusRaw = (val(cols, ['status'], 3).trim() || 'available').toLowerCase();
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

          const status = ['available', 'away', 'injured'].includes(statusRaw) ? (statusRaw as 'available' | 'away' | 'injured') : 'available';

          imported.push({
            id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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
          setCsvStatus({ type: 'err', text: 'No players imported. Please check your CSV column structure.' });
          return;
        }

        if (csvMode === 'replace') {
          onUpdatePlayers(imported);
          if (onUpdateLineup) onUpdateLineup({});
        } else {
          const existingNames = new Set(players.map((p) => p.name.toLowerCase()));
          const uniqueNew = imported.filter((p) => !existingNames.has(p.name.toLowerCase()));
          onUpdatePlayers([...players, ...uniqueNew]);
        }

        setCsvStatus({
          type: errors.length ? 'warn' : 'ok',
          text: `Successfully imported ${imported.length} players! ${
            errors.length ? `(${errors.length} rows skipped due to missing names/numbers)` : ''
          }`,
        });

        if (onSuccess) onSuccess();
      } catch (err: any) {
        setCsvStatus({ type: 'err', text: `Import failed: ${err.message}` });
      }
    };

    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-black text-sm text-[var(--navy)] flex items-center gap-1.5">
          <FileSpreadsheet className="w-4 h-4 text-blue-600" />
          <span>{title}</span>
        </h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
        >
          <span>{showDetails ? 'Hide Format Guide' : 'Show Column Guide'}</span>
          {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      <p className="text-xs text-gray-600 leading-relaxed font-semibold">
        Import your player roster in bulk from an Excel file saved as <b>.CSV</b>. The importer auto-detects column headers or relies on standard column position ordering.
      </p>

      {/* Upload & Controls Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-700">Mode:</span>
          <select
            value={csvMode}
            onChange={(e) => setCsvMode(e.target.value as any)}
            className="px-3 py-1.5 border border-gray-200 bg-white rounded-lg text-xs font-bold text-[var(--ink)] focus:outline-none cursor-pointer"
          >
            <option value="replace">Replace current squad</option>
            <option value="append">Append unique players</option>
          </select>
        </div>

        <label className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer text-center flex items-center gap-1.5">
          <Upload className="w-3.5 h-3.5" />
          <span>Upload .CSV File</span>
          <input
            type="file"
            accept=".csv"
            onChange={handleCSVImport}
            className="hidden"
          />
        </label>

        <button
          onClick={handleExportPlayersCSV}
          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Roster (.CSV)</span>
        </button>

        <button
          onClick={handleDownloadCSVTemplate}
          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-blue-700 font-bold text-xs rounded-lg transition border border-blue-200 cursor-pointer flex items-center gap-1.5 shadow-2xs"
        >
          <Download className="w-3.5 h-3.5 text-blue-600" />
          <span>Download Sample CSV Template</span>
        </button>
      </div>

      {/* Feedback Status Alert */}
      {csvStatus && (
        <div className={`p-3 text-xs font-bold rounded-xl border flex items-center gap-2 ${
          csvStatus.type === 'ok' ? 'bg-green-50 border-green-200 text-emerald-800' :
          csvStatus.type === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-900' :
          'bg-red-50 border-red-200 text-red-800'
        }`}>
          {csvStatus.type === 'ok' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
          {csvStatus.type === 'warn' && <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
          {csvStatus.type === 'err' && <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
          <span>{csvStatus.text}</span>
        </div>
      )}

      {/* File Specification & Column Format Guide */}
      {showDetails && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-black text-[var(--navy)] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              Column Order & File Format Specifications
            </span>
          </div>

          <p className="text-gray-600 leading-relaxed font-medium">
            Your file can include an optional header row (e.g. <code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono text-[10.5px]">Name, Number, Positions, Status, Nickname, Note</code>). If no header is present, columns must strictly follow the order listed below:
          </p>

          <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white shadow-2xs">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold">
                  <th className="p-2 border-r border-slate-200">Col #</th>
                  <th className="p-2 border-r border-slate-200">Column Header</th>
                  <th className="p-2 border-r border-slate-200">Required?</th>
                  <th className="p-2 border-r border-slate-200">Accepted Format & Rules</th>
                  <th className="p-2">Sample Entry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                <tr>
                  <td className="p-2 font-bold text-slate-900 border-r border-slate-100 bg-slate-50/50">1</td>
                  <td className="p-2 font-bold text-blue-700 border-r border-slate-100">Name</td>
                  <td className="p-2 border-r border-slate-100"><span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Required</span></td>
                  <td className="p-2 border-r border-slate-100">Full player first & last name</td>
                  <td className="p-2 font-mono text-[10.5px] text-slate-900">Dustin Martin</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-slate-900 border-r border-slate-100 bg-slate-50/50">2</td>
                  <td className="p-2 font-bold text-blue-700 border-r border-slate-100">Number</td>
                  <td className="p-2 border-r border-slate-100"><span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Required</span></td>
                  <td className="p-2 border-r border-slate-100">Jumper/jersey number</td>
                  <td className="p-2 font-mono text-[10.5px] text-slate-900">4</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-slate-900 border-r border-slate-100 bg-slate-50/50">3</td>
                  <td className="p-2 font-bold text-blue-700 border-r border-slate-100">Positions</td>
                  <td className="p-2 border-r border-slate-100"><span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Optional</span></td>
                  <td className="p-2 border-r border-slate-100">Position abbreviations separated by semicolon <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px] font-bold">;</code> or pipe <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px] font-bold">|</code></td>
                  <td className="p-2 font-mono text-[10.5px] text-slate-900">MID; RHF</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-slate-900 border-r border-slate-100 bg-slate-50/50">4</td>
                  <td className="p-2 font-bold text-blue-700 border-r border-slate-100">Status</td>
                  <td className="p-2 border-r border-slate-100"><span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Optional</span></td>
                  <td className="p-2 border-r border-slate-100"><code className="font-mono text-slate-800 bg-slate-100 px-1 py-0.5 rounded">available</code>, <code className="font-mono text-slate-800 bg-slate-100 px-1 py-0.5 rounded">injured</code>, or <code className="font-mono text-slate-800 bg-slate-100 px-1 py-0.5 rounded">away</code> (Defaults to available)</td>
                  <td className="p-2 font-mono text-[10.5px] text-slate-900">available</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-slate-900 border-r border-slate-100 bg-slate-50/50">5</td>
                  <td className="p-2 font-bold text-blue-700 border-r border-slate-100">Nickname</td>
                  <td className="p-2 border-r border-slate-100"><span className="text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Optional</span></td>
                  <td className="p-2 border-r border-slate-100">Short nickname or alias</td>
                  <td className="p-2 font-mono text-[10.5px] text-slate-900">Dusty</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-slate-900 border-r border-slate-100 bg-slate-50/50">6</td>
                  <td className="p-2 font-bold text-blue-700 border-r border-slate-100">Note</td>
                  <td className="p-2 border-r border-slate-100"><span className="text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Optional</span></td>
                  <td className="p-2 border-r border-slate-100">Fitness, load management, or medical notes</td>
                  <td className="p-2 font-mono text-[10.5px] text-slate-900">Key midfielder</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-3 text-blue-950 space-y-1">
            <div className="font-extrabold flex items-center gap-1.5 text-blue-900">
              <Info className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <span>Supported Position Codes Reference:</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              • <b>Defenders:</b> <code className="bg-white px-1 rounded border border-blue-200 font-mono text-[10px]">FB</code>, <code className="bg-white px-1 rounded border border-blue-200 font-mono text-[10px]">RBP</code>, <code className="bg-white px-1 rounded border border-blue-200 font-mono text-[10px]">LBP</code>, <code className="bg-white px-1 rounded border border-blue-200 font-mono text-[10px]">CHB</code>, <code className="bg-white px-1 rounded border border-blue-200 font-mono text-[10px]">RHB</code>, <code className="bg-white px-1 rounded border border-blue-200 font-mono text-[10px]">LHB</code>, <code className="bg-white px-1 rounded border border-blue-200 font-mono text-[10px]">DEF</code><br/>
              • <b>Midfielders:</b> <code className="bg-white px-1 rounded border border-blue-200 font-mono text-[10px]">C</code>, <code className="bg-white px-1 rounded border border-blue-200 font-mono text-[10px]">M1</code>, <code className="bg-white px-1 rounded border border-blue-200 font-mono text-[10px]">M2</code>, <code className="bg-white px-1 rounded border border-blue-200 font-mono text-[10px]">M3</code>, <code className="bg-white px-1 rounded border border-blue-200 font-mono text-[10px]">RW</code>, <code className="bg-white px-1 rounded border border-blue-200 font-mono text-[10px]">LW</code>, <code className="bg-white px-1 rounded border border-blue-200 font-mono text-[10px]">RUCK</code>, <code className="bg-white px-1 rounded border border-blue-200 font-mono text-[10px]">FOL</code>, <code className="bg-white px-1 rounded border border-blue-200 font-mono text-[10px]">MID</code><br/>
              • <b>Forwards:</b> <code className="bg-white px-1 rounded border border-blue-200 font-mono text-[10px]">FF</code>, <code className="bg-white px-1 rounded border border-blue-200 font-mono text-[10px]">RFP</code>, <code className="bg-white px-1 rounded border border-blue-200 font-mono text-[10px]">LFP</code>, <code className="bg-white px-1 rounded border border-blue-200 font-mono text-[10px]">CHF</code>, <code className="bg-white px-1 rounded border border-blue-200 font-mono text-[10px]">RHF</code>, <code className="bg-white px-1 rounded border border-blue-200 font-mono text-[10px]">LHF</code>, <code className="bg-white px-1 rounded border border-blue-200 font-mono text-[10px]">FWD</code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
