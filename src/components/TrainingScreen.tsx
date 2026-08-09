import React, { useState } from 'react';
import { Drill, TrainingState, DiagramSpec, ApiKeySettings } from '../types';
import { Play, Pause, Library, FolderHeart, Plus, Trash, ArrowLeft, ArrowRight, Eye, Edit3, Check, X, FileEdit, Bot, Sparkles, Loader2, Cpu } from 'lucide-react';

interface TrainingScreenProps {
  drills: Drill[];
  onUpdateDrills: (updated: Drill[]) => void;
  trainingState: TrainingState;
  onUpdateTrainingState: (state: TrainingState) => void;
  onNavigateToJarvis?: () => void;
  apiKeys?: ApiKeySettings;
}

export default function TrainingScreen({
  drills,
  onUpdateDrills,
  trainingState,
  onUpdateTrainingState,
  onNavigateToJarvis,
  apiKeys,
}: TrainingScreenProps) {
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingDrill, setEditingDrill] = useState<Drill | null>(null);

  // Edit/Add Form states
  const [formTitle, setFormTitle] = useState('');
  const [formCat, setFormCat] = useState('');
  const [formMins, setFormMins] = useState(10);
  const [formPlayers, setFormPlayers] = useState('Custom');
  const [formOverview, setFormOverview] = useState('');
  const [formSteps, setFormSteps] = useState<[string, string][]>([['', '']]);
  const [formError, setFormError] = useState('');

  // AI-powered "paste drill notes" extraction state (used inside the Add/Edit modal)
  const [importRawText, setImportRawText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');

  // AI provider selection - shared with Jarvis via the same localStorage key
  const [aiProvider, setAiProvider] = useState<'claude' | 'gemini'>(() => {
    try {
      const saved = localStorage.getItem('iiq_ai_provider');
      return saved === 'gemini' ? 'gemini' : 'claude';
    } catch (_e) {
      return 'claude';
    }
  });

  const handleSetAiProvider = (p: 'claude' | 'gemini') => {
    setAiProvider(p);
    try {
      localStorage.setItem('iiq_ai_provider', p);
    } catch (_e) {}
  };

  const activeDrill = drills.find((d) => d.id === trainingState.activeId) || drills[0] || null;

  const categories = ['All', ...Array.from(new Set(drills.map((d) => d.cat || 'General')))];

  const filteredDrills = drills.filter(
    (d) => trainingState.filter === 'All' || d.cat === trainingState.filter
  );

  const activePlan = trainingState.plans.find((p) => p.id === trainingState.activePlanId) || null;

  // Render SVG Diagrams from each drill's own diagram spec (see types.ts DiagramSpec).
  // Falls back to a generic layout only for drills that don't have a spec authored yet
  // (e.g. custom drills created via Add Drill in the UI).
  const renderDiagram = (drill: Drill, stepIndex: number) => {
    const isPausedClass = trainingState.motionPaused ? 'motion-paused' : '';

    const fieldDefs = (
      <defs>
        <filter id="iiqTrShadow">
          <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#10200b" floodOpacity="0.42" />
        </filter>
        <filter id="iiqTrSoft">
          <feDropShadow dx="0" dy="2" stdDeviation="1.4" floodColor="#10200b" floodOpacity="0.34" />
        </filter>
        <marker id="iiqTrBlue" markerWidth="14" markerHeight="14" refX="12" refY="7" orient="auto">
          <path d="M1,1 L1,13 L13,7 z" fill="#38BDF8" />
        </marker>
        <marker id="iiqTrLime" markerWidth="14" markerHeight="14" refX="12" refY="7" orient="auto">
          <path d="M1,1 L1,13 L13,7 z" fill="#C6FF32" />
        </marker>
        <marker id="iiqTrRed" markerWidth="14" markerHeight="14" refX="12" refY="7" orient="auto">
          <path d="M1,1 L1,13 L13,7 z" fill="#FF6B5F" />
        </marker>
      </defs>
    );

    // Aussie Rules stylized field
    const renderAussieField = () => {
      const stripes = [];
      for (let i = -7; i < 16; i++) {
        stripes.push(
          <path
            key={i}
            d={`M${i * 150} 0 L${i * 150 + 90} 0 L${i * 150 - 170} 520 L${i * 150 - 260} 520 Z`}
            fill={i % 2 === 0 ? 'rgba(141,205,71,0.10)' : 'rgba(7,53,17,0.15)'}
          />
        );
      }
      return (
        <>
          <rect width="900" height="520" fill="#4B8929" />
          {stripes}
          <rect x="12" y="12" width="876" height="496" rx="8" fill="none" stroke="rgba(226,255,210,0.42)" strokeWidth="2" />
          <path d="M-70 30 C220 112 455 55 720 85" fill="none" stroke="#E8F7D9" strokeWidth="4" opacity="0.58" />
          <path d="M-20 475 C255 510 585 425 720 285" fill="none" stroke="#E8F7D9" strokeWidth="4" opacity="0.58" />
          <path d="M0 140 H210 V370 H0" fill="none" stroke="#E8F7D9" strokeWidth="3" opacity="0.48" />
          <g stroke="#E8F7D9" strokeWidth="6" opacity="0.58">
            <line x1="740" y1="78" x2="740" y2="250" />
            <line x1="785" y1="98" x2="785" y2="230" />
            <line x1="830" y1="120" x2="830" y2="210" />
            <line x1="875" y1="146" x2="875" y2="188" />
          </g>
          <rect x="650" y="218" width="120" height="80" fill="none" stroke="#E8F7D9" strokeWidth="3" opacity="0.58" />
        </>
      );
    };

    // Soccer-style pitch (used for Handball Soccer, which is played on a marked rectangular field)
    const renderSoccerField = () => {
      const fieldStripes = [];
      for (let i = 0; i < 12; i++) {
        fieldStripes.push(
          <rect
            key={i}
            x={i * 75}
            y="0"
            width="75"
            height="520"
            fill={i % 2 !== 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}
          />
        );
      }
      return (
        <>
          <rect width="900" height="520" fill="#477D28" />
          {fieldStripes}
          <rect x="80" y="85" width="740" height="350" rx="18" fill="none" stroke="#DDEAF8" strokeWidth="5" />
          <line x1="80" y1="215" x2="80" y2="305" stroke="#FBBF24" strokeWidth="12" />
          <line x1="820" y1="215" x2="820" y2="305" stroke="#FBBF24" strokeWidth="12" />
        </>
      );
    };

    const renderPlayer = (label: string, x: number, y: number, kind?: 'opp' | 'coach') => {
      const shirt = kind === 'opp' ? '#263422' : kind === 'coach' ? '#F7F7F2' : '#151B16';
      const accent = kind === 'opp' ? '#F97316' : kind === 'coach' ? '#2563EB' : '#F5D94C';
      const labelFill = kind === 'opp' ? '#151B16' : kind === 'coach' ? '#2563EB' : '#151B16';
      return (
        <g key={`${label}-${x}-${y}`} filter="url(#iiqTrShadow)">
          <circle cx={x} cy={y - 16} r="5" fill="#E8B68C" stroke="#3B271C" strokeWidth="1" />
          <path d={`M${x - 7} ${y - 10} L${x + 7} ${y - 10} L${x + 8} ${y + 7} L${x - 8} ${y + 7} Z`} fill={shirt} stroke="#101510" strokeWidth="1.4" />
          <path d={`M${x - 7} ${y - 8} H${x + 7}`} stroke={accent} strokeWidth="3" />
          <line x1={x - 4} y1={y + 7} x2={x - 8} y2={y + 18} stroke="#171B16" strokeWidth="2.4" />
          <line x1={x + 4} y1={y + 7} x2={x + 8} y2={y + 18} stroke="#171B16" strokeWidth="2.4" />
          <circle cx={x + 12} cy={y - 14} r="10" fill={labelFill} stroke="#fff" strokeWidth="1.5" />
          <text x={x + 12} y={y - 10.5} textAnchor="middle" fontSize="11" fontWeight="950" fill="#fff">{label}</text>
        </g>
      );
    };

    const renderCone = (x: number, y: number, id: string) => (
      <path key={id} d={`M${x} ${y - 9} L${x - 8} ${y + 9} L${x + 8} ${y + 9} Z`} fill="#F97316" stroke="#7C2D12" strokeWidth="2" filter="url(#iiqTrShadow)" />
    );

    const renderFooty = (x: number, y: number) => (
      <g transform={`translate(${x} ${y}) rotate(-22)`} filter="url(#iiqTrShadow)">
        <g className="iiq-footy">
          <ellipse cx="0" cy="0" rx="10" ry="5.5" fill="#8B4513" stroke="#3A2414" strokeWidth="2" />
          <path d="M-5 0 H5 M0 -3 V3" stroke="#fff" strokeWidth="1.2" />
        </g>
      </g>
    );

    const renderArrow = (path: string, color: string, dash?: string) => (
      <path
        className="iiq-route"
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dash || '9 7'}
        markerEnd="url(#iiqTrLime)"
        filter="url(#iiqTrSoft)"
      />
    );

    const renderZone = (zone: { x: number; y: number; width: number; height: number; label?: string }) => (
      <React.Fragment key={`${zone.x}-${zone.y}`}>
        <rect x={zone.x} y={zone.y} width={zone.width} height={zone.height} rx="8" fill="rgba(255,255,255,0.07)" stroke="#E8F7D9" strokeWidth="4" strokeDasharray="10 8" />
        {zone.label && (
          <text x={zone.x + zone.width / 2} y={zone.y - 15} textAnchor="middle" fill="#fff" fontSize="18" fontWeight="950">{zone.label}</text>
        )}
      </React.Fragment>
    );

    const renderContestCircle = (c: { x: number; y: number; r: number; color?: string; label?: string }) => (
      <>
        <circle cx={c.x} cy={c.y} r={c.r} fill="none" stroke={c.color || '#F97316'} strokeWidth="5" strokeDasharray="8 8" />
        {c.label && (
          <text x={c.x} y={c.y - c.r - 12} textAnchor="middle" fill="#fff" fontSize="16" fontWeight="950">{c.label}</text>
        )}
      </>
    );

    // Fallback used only when a drill has no authored diagram spec (e.g. brand-new custom drills).
    const defaultSpec: DiagramSpec = {
      cones: [],
      players: [
        { label: 'A', x: 355, y: 75 },
        { label: 'B', x: 300, y: 115 },
        { label: 'C', x: 295, y: 250 },
        { label: 'D', x: 400, y: 410 },
        { label: 'E', x: 695, y: 255, kind: 'opp' },
        { label: 'F', x: 455, y: 115 },
      ],
      arrows: [
        { path: 'M385 72 C455 75,525 90,575 115', color: '#DC2626', dash: '8 6' },
        { path: 'M300 115 C390 105,455 105,525 110', color: '#A3E635', dash: '8 8' },
        { path: 'M292 250 C390 240,460 245,525 245', color: '#A3E635', dash: '8 8' },
        { path: 'M397 410 C430 340,470 300,520 280', color: '#A3E635', dash: '8 8' },
      ],
      ballPositions: [
        { x: 385, y: 72 },
        { x: 520, y: 105 },
        { x: 610, y: 230 },
        { x: 700, y: 255 },
      ],
    };

    const spec: DiagramSpec = drill.diagram || defaultSpec;
    const ballPositions = spec.ballPositions || [];
    const ball = ballPositions.length > 0
      ? ballPositions[stepIndex % ballPositions.length]
      : { x: 450, y: 260 };

    const content = (
      <>
        {spec.surface === 'soccer' ? renderSoccerField() : renderAussieField()}
        {(spec.zones || []).map((z) => renderZone(z))}
        {spec.contestCircle && renderContestCircle(spec.contestCircle)}
        {(spec.cones || []).map((c, i) => renderCone(c.x, c.y, `cone-${i}`))}
        {(spec.players || []).map((p) => renderPlayer(p.label, p.x, p.y, p.kind === 'own' ? undefined : p.kind))}
        {(spec.arrows || []).map((a, i) => (
          <React.Fragment key={i}>{renderArrow(a.path, a.color, a.dash)}</React.Fragment>
        ))}
        {renderFooty(ball.x, ball.y)}
      </>
    );

    return (
      <svg
        viewBox="0 0 900 520"
        preserveAspectRatio="xMidYMid slice"
        className={`w-full h-full rounded-2xl md:rounded-3xl ${isPausedClass}`}
      >
        {fieldDefs}
        {content}
      </svg>
    );
  };

  const handleOpenAddDrill = () => {
    setEditingDrill(null);
    setFormTitle('');
    setFormCat('Kicking');
    setFormMins(10);
    setFormPlayers('Custom');
    setFormOverview('');
    setFormSteps([
      ['Setup', 'Set up the drill area and explain the objective.'],
      ['Run', 'Run the activity and provide coaching cues.'],
      ['Reset', 'Rotate players and repeat.'],
    ]);
    setFormError('');
    handleOpenImportModal();
    setShowAddEditModal(true);
  };

  const handleOpenEditDrill = (drill: Drill) => {
    setEditingDrill(drill);
    setFormTitle(drill.title);
    setFormCat(drill.cat || 'General');
    setFormMins(drill.mins || 10);
    setFormPlayers(drill.players || 'Custom');
    setFormOverview(drill.overview || '');
    setFormSteps(drill.steps && drill.steps.length > 0 ? [...drill.steps] : [['Step 1', '']]);
    setFormError('');
    handleOpenImportModal();
    setShowAddEditModal(true);
  };

  const handleStepChange = (index: number, fieldIndex: 0 | 1, value: string) => {
    const updated = [...formSteps];
    updated[index][fieldIndex] = value;
    setFormSteps(updated);
  };

  const handleOpenImportModal = () => {
    setImportRawText('');
    setImportError('');
  };

  const handleAiExtractDrill = async () => {
    if (!importRawText.trim()) {
      setImportError('Paste the drill notes you want to import first.');
      return;
    }
    setIsImporting(true);
    setImportError('');

    try {
      const res = await fetch('/api/import-drill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: importRawText,
          provider: aiProvider,
          apiKeyOverride: aiProvider === 'gemini' ? apiKeys?.geminiApiKey : apiKeys?.anthropicApiKey,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.drill) {
        setImportError(data.details || data.error || 'Could not extract a drill from that text.');
        setIsImporting(false);
        return;
      }

      const extracted = data.drill;

      // Fill the form fields below with the AI's extraction so the coach can
      // review and tweak everything before actually saving the drill.
      setFormTitle(extracted.title || '');
      setFormCat(extracted.cat || 'General');
      setFormMins(Number(extracted.mins) > 0 ? Number(extracted.mins) : 10);
      setFormPlayers(extracted.players || 'Custom');
      setFormOverview(extracted.overview || '');
      setFormSteps(
        Array.isArray(extracted.steps) && extracted.steps.length > 0
          ? extracted.steps.map((s: any) => [String(s[0] || 'Step'), String(s[1] || '')])
          : [['Setup', '']]
      );
      setFormError('');
    } catch (err: any) {
      setImportError(err.message || 'Import request failed. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleAddStepRow = () => {
    setFormSteps([...formSteps, ['', '']]);
  };

  const handleRemoveStepRow = (index: number) => {
    if (formSteps.length <= 1) return;
    setFormSteps(formSteps.filter((_, i) => i !== index));
  };

  const handleSaveDrill = () => {
    if (!formTitle.trim()) {
      setFormError('Please enter a drill title.');
      return;
    }
    const cleanSteps = formSteps.map(([title, content]) => [
      title.trim() || 'Step',
      content.trim() || 'Describe this step.',
    ]) as [string, string][];

    let updatedList: Drill[];
    let drillId = '';

    if (editingDrill) {
      drillId = editingDrill.id;
      updatedList = drills.map((d) =>
        d.id === editingDrill.id
          ? {
              ...d,
              title: formTitle.trim(),
              cat: formCat.trim() || 'General',
              mins: Math.max(1, formMins),
              players: formPlayers.trim() || 'Custom',
              overview: formOverview.trim() || 'Overview',
              steps: cleanSteps,
            }
          : d
      );
    } else {
      drillId = `custom-${Date.now()}`;
      const newDrill: Drill = {
        id: drillId,
        title: formTitle.trim(),
        cat: formCat.trim() || 'General',
        mins: Math.max(1, formMins),
        players: formPlayers.trim() || 'Custom',
        overview: formOverview.trim() || 'Overview',
        steps: cleanSteps,
      };
      updatedList = [...drills, newDrill];
    }

    onUpdateDrills(updatedList);
    setShowAddEditModal(false);

    // Set to view this drill
    onUpdateTrainingState({
      ...trainingState,
      view: 'viewer',
      activeId: drillId,
      step: 0,
    });
  };

  const handleDeleteDrill = (drillId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this drill?')) return;
    const updated = drills.filter((d) => d.id !== drillId);
    onUpdateDrills(updated);

    // Also remove from plans
    const updatedPlans = trainingState.plans.map((p) => ({
      ...p,
      drills: p.drills.filter((id) => id !== drillId),
    }));

    let nextActiveId = trainingState.activeId;
    let nextView = trainingState.view;
    if (trainingState.activeId === drillId) {
      const remaining = updated[0];
      nextActiveId = remaining ? remaining.id : '';
      nextView = 'library';
    }

    onUpdateTrainingState({
      ...trainingState,
      view: nextView,
      activeId: nextActiveId,
      plans: updatedPlans,
    });
  };

  const handleAddToPlan = (drillId: string) => {
    if (!trainingState.activePlanId) {
      // Create default plan if none exists
      const newPlanId = `tp-${Date.now()}`;
      const newPlans = [
        ...trainingState.plans,
        { id: newPlanId, name: 'Training Plan 1', drills: [drillId] },
      ];
      onUpdateTrainingState({
        ...trainingState,
        plans: newPlans,
        activePlanId: newPlanId,
        view: 'plans',
      });
      return;
    }

    const updatedPlans = trainingState.plans.map((p) => {
      if (p.id === trainingState.activePlanId) {
        if (p.drills.includes(drillId)) return p;
        return { ...p, drills: [...p.drills, drillId] };
      }
      return p;
    });

    onUpdateTrainingState({
      ...trainingState,
      plans: updatedPlans,
      view: 'plans',
    });
  };

  const handleRemoveFromPlan = (index: number) => {
    const updatedPlans = trainingState.plans.map((p) => {
      if (p.id === trainingState.activePlanId) {
        const d = [...p.drills];
        d.splice(index, 1);
        return { ...p, drills: d };
      }
      return p;
    });
    onUpdateTrainingState({
      ...trainingState,
      plans: updatedPlans,
    });
  };

  const handleCreatePlan = () => {
    const name = prompt('Enter plan name:', `Session ${trainingState.plans.length + 1}`);
    if (!name || !name.trim()) return;
    const newPlanId = `tp-${Date.now()}`;
    const newPlans = [
      ...trainingState.plans,
      { id: newPlanId, name: name.trim(), drills: [] },
    ];
    onUpdateTrainingState({
      ...trainingState,
      plans: newPlans,
      activePlanId: newPlanId,
      view: 'plans',
    });
  };

  const handleRenamePlan = (planId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const plan = trainingState.plans.find((p) => p.id === planId);
    if (!plan) return;
    const name = prompt('Rename plan:', plan.name);
    if (!name || !name.trim()) return;
    const updated = trainingState.plans.map((p) =>
      p.id === planId ? { ...p, name: name.trim() } : p
    );
    onUpdateTrainingState({
      ...trainingState,
      plans: updated,
    });
  };

  const handleDeletePlan = (planId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this plan?')) return;
    const updated = trainingState.plans.filter((p) => p.id !== planId);
    const nextActivePlanId = trainingState.activePlanId === planId
      ? (updated[0] ? updated[0].id : null)
      : trainingState.activePlanId;

    onUpdateTrainingState({
      ...trainingState,
      plans: updated,
      activePlanId: nextActivePlanId,
    });
  };

  const activeDrillSteps = activeDrill?.steps || [];
  const currentStep = activeDrillSteps[trainingState.step] || activeDrillSteps[0] || ['Step', ''];

  return (
    <div id="training" className="space-y-4">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 p-4 rounded-2xl border border-indigo-800 shadow-md">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {trainingState.view === 'plans' ? 'Training Plans' : trainingState.view === 'viewer' ? activeDrill?.title : 'Training Library'}
          </h2>
          <p className="text-xs text-indigo-300 font-semibold mt-1">
            {trainingState.view === 'plans'
              ? 'Organise and schedule your training sessions'
              : trainingState.view === 'viewer'
              ? 'Step-by-step interactive routes and details'
              : 'Animated drill routes make the flow easy to follow'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {trainingState.view === 'viewer' && (
            <button
              onClick={() =>
                onUpdateTrainingState({
                  ...trainingState,
                  motionPaused: !trainingState.motionPaused,
                })
              }
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold bg-white/10 text-white border border-white/15 rounded-xl hover:bg-white/15 transition cursor-pointer"
            >
              {trainingState.motionPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-300" />}
              <span>{trainingState.motionPaused ? 'Play routes' : 'Pause routes'}</span>
            </button>
          )}

          {onNavigateToJarvis && (
            <button
              onClick={onNavigateToJarvis}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-black bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl transition shadow-xs cursor-pointer"
            >
              <Bot className="w-4 h-4 text-slate-950" />
              <span>Ask Jarvis AI</span>
            </button>
          )}

          {trainingState.view !== 'library' && (
            <button
              onClick={() => onUpdateTrainingState({ ...trainingState, view: 'library' })}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold bg-white/10 text-white border border-white/15 rounded-xl hover:bg-white/15 transition cursor-pointer"
            >
              <Library className="w-3.5 h-3.5 text-blue-300" />
              <span>Library</span>
            </button>
          )}

          {trainingState.view !== 'plans' && (
            <button
              onClick={() => onUpdateTrainingState({ ...trainingState, view: 'plans' })}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold bg-white/10 text-white border border-white/15 rounded-xl hover:bg-white/15 transition cursor-pointer"
            >
              <FolderHeart className="w-3.5 h-3.5 text-blue-300" />
              <span>Plans</span>
            </button>
          )}

          <button
            onClick={handleOpenAddDrill}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold bg-white/10 text-indigo-100 border border-white/15 rounded-xl hover:bg-white/15 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Import with AI</span>
          </button>

          <button
            onClick={handleOpenAddDrill}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold bg-emerald-500 text-white rounded-xl hover:bg-emerald-400 transition shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Drill</span>
          </button>
        </div>
      </div>

      {/* VIEW: Library */}
      {trainingState.view === 'library' && (
        <div className="space-y-4">
          {/* Categories Filters */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-gray-100/80 rounded-xl max-w-fit border border-gray-200">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => onUpdateTrainingState({ ...trainingState, filter: cat })}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all ${
                  trainingState.filter === cat
                    ? 'bg-white text-[var(--blue)] shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Drill Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDrills.map((drill) => (
              <div
                key={drill.id}
                className="group relative bg-white rounded-2xl border border-[var(--line)] shadow-xs overflow-hidden flex flex-col hover:shadow-md transition"
              >
                {/* Delete/Edit Buttons overlay for custom drills, or edit only for built-ins! */}
                <div className="absolute top-3 right-3 z-10 flex gap-1">
                  <button
                    onClick={() => handleOpenEditDrill(drill)}
                    title="Edit drill"
                    className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition shadow-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  {drill.id.startsWith('custom-') && (
                    <button
                      onClick={(e) => handleDeleteDrill(drill.id, e)}
                      title="Delete drill"
                      className="p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-full transition shadow-xs"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Simulated SVG diagram in card header */}
                <div className="h-44 bg-[#3F7723] relative">
                  {renderDiagram(drill, 0)}
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-[var(--ink)] leading-tight mb-1 group-hover:text-[var(--blue)] transition">
                      {drill.title}
                    </h3>
                    <p className="text-xs text-[var(--muted)] line-clamp-2 font-medium mb-3">
                      {drill.overview}
                    </p>
                    <div className="flex flex-wrap gap-1 mb-4">
                      <span className="px-2 py-0.5 text-[10px] font-black bg-[#EEF2FF] text-[var(--blue)] rounded-full uppercase">
                        {drill.cat}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-black bg-gray-100 text-gray-600 rounded-full">
                        {drill.mins} mins
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-black bg-gray-100 text-gray-600 rounded-full">
                        {drill.players}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-auto pt-2 border-t border-gray-100">
                    <button
                      onClick={() =>
                        onUpdateTrainingState({
                          ...trainingState,
                          view: 'viewer',
                          activeId: drill.id,
                          step: 0,
                        })
                      }
                      className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-white bg-[var(--blue)] rounded-lg hover:opacity-90 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Open</span>
                    </button>
                    <button
                      onClick={() => handleAddToPlan(drill.id)}
                      className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-[var(--ink)] bg-[#F0F1F5] border border-[var(--line)] rounded-lg hover:bg-gray-100 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Plan</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: Viewer */}
      {trainingState.view === 'viewer' && activeDrill && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white p-4 md:p-6 rounded-3xl border border-[var(--line)] shadow-sm min-h-[520px]">
          {/* Main SVG Diagram Stage (Left 2 cols) */}
          <div className="lg:col-span-2 bg-[#15230f] rounded-2xl overflow-hidden flex items-center justify-center relative min-h-[360px] md:min-h-[500px]">
            {renderDiagram(activeDrill, trainingState.step)}

            {/* Quick Edit Button on the Viewer screen itself to let coaches modify it instantly */}
            <button
              onClick={() => handleOpenEditDrill(activeDrill)}
              className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold bg-white/90 hover:bg-white text-[var(--ink)] rounded-lg transition border border-gray-200 shadow-sm"
            >
              <FileEdit className="w-3.5 h-3.5 text-[var(--blue)]" />
              <span>Edit Drill Details</span>
            </button>
          </div>

          {/* Drill Step & Overview Sidebar (Right col) */}
          <div className="flex flex-col justify-between text-[var(--ink)] p-2">
            <div>
              <div className="flex items-center justify-between gap-2 border-b border-gray-150 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-black tracking-widest uppercase text-[var(--blue)]">
                    {activeDrill.cat}
                  </span>
                  <h3 className="text-lg font-black text-[var(--navy)] leading-tight mt-0.5">
                    {activeDrill.title}
                  </h3>
                </div>
                <span className="text-xs font-black bg-gray-100 text-[var(--ink)] px-2 py-1 rounded-md shrink-0">
                  {activeDrill.mins} mins
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-black tracking-wider text-gray-500 uppercase mb-1">
                    Overview
                  </h4>
                  <p className="text-sm text-gray-700 font-medium leading-relaxed">
                    {activeDrill.overview}
                  </p>
                </div>

                {/* Legends */}
                <div>
                  <h4 className="text-xs font-black tracking-wider text-gray-500 uppercase mb-2">
                    Key Legend
                  </h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                      <span className="w-5 h-1 bg-[#4B8929] rounded-full inline-block"></span>
                      <span>Action Route</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                      <span className="w-3 h-3 bg-[#8B4513] border border-gray-300 rounded-full inline-block"></span>
                      <span>Ball Position</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                      <span className="w-3 h-3 bg-[#F97316] rotate-45 inline-block"></span>
                      <span>Cones / Setup</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Step Player Controls */}
            <div className="border-t border-gray-150 pt-4 mt-6">
              <div className="mb-3">
                <span className="text-[10px] font-black text-[var(--blue)] tracking-wider uppercase block mb-1">
                  Step {trainingState.step + 1} of {activeDrillSteps.length || 1}
                </span>
                <b className="text-sm font-black text-[var(--navy)] block mb-1">
                  {currentStep[0]}
                </b>
                <p className="text-xs text-gray-500 leading-relaxed font-medium">
                  {currentStep[1]}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  onClick={() => {
                    const stepCount = activeDrillSteps.length || 1;
                    onUpdateTrainingState({
                      ...trainingState,
                      step: (trainingState.step - 1 + stepCount) % stepCount,
                    });
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-extrabold bg-gray-100 hover:bg-gray-150 text-[var(--ink)] border border-[var(--line)] rounded-lg transition flex-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  onClick={() => {
                    const stepCount = activeDrillSteps.length || 1;
                    onUpdateTrainingState({
                      ...trainingState,
                      step: (trainingState.step + 1) % stepCount,
                    });
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-extrabold bg-[var(--blue)] hover:opacity-90 text-white rounded-lg transition flex-1"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: Plans */}
      {trainingState.view === 'plans' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Plans Sidebar */}
          <div className="bg-white p-4 rounded-2xl border border-[var(--line)] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-[var(--navy)]">Plans</h3>
              <button
                onClick={handleCreatePlan}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold bg-[var(--green)] text-white rounded-xl hover:opacity-95 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Plan</span>
              </button>
            </div>
            <p className="text-xs text-[var(--muted)] font-medium">
              Create training sessions and add drills. Click a plan to view and manage its drills.
            </p>

            <div className="space-y-3">
              {trainingState.plans.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onUpdateTrainingState({ ...trainingState, activePlanId: p.id })}
                  className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-2 ${
                    p.id === trainingState.activePlanId
                      ? 'border-[var(--amber)] bg-[#FFF8E6] shadow-xs'
                      : 'border-[var(--line)] bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <b className="text-sm font-extrabold text-[var(--ink)]">{p.name}</b>
                    <span className="px-2 py-0.5 text-[10px] font-black bg-[#EEF0FF] text-[var(--blue)] rounded-full">
                      {p.drills.length} drills
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1 border-t border-dashed border-gray-200 mt-2">
                    <button
                      onClick={(e) => handleRenamePlan(p.id, e)}
                      className="px-2 py-1 text-[10px] font-bold bg-[#F0F1F5] text-gray-700 hover:bg-gray-200 rounded-md transition"
                    >
                      Rename
                    </button>
                    <button
                      onClick={(e) => handleDeletePlan(p.id, e)}
                      className="px-2 py-1 text-[10px] font-bold bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition ml-auto"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {trainingState.plans.length === 0 && (
                <p className="text-xs text-[var(--muted)] font-semibold text-center py-4 bg-gray-50 rounded-xl">
                  No plans created yet.
                </p>
              )}
            </div>
          </div>

          {/* Drills in Plan */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[var(--line)] shadow-sm space-y-4">
            {activePlan ? (
              <>
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="text-lg font-black text-[var(--navy)]">{activePlan.name}</h3>
                    <p className="text-xs text-[var(--muted)] font-semibold mt-1">
                      {activePlan.drills.length} drills • {
                        activePlan.drills.reduce((acc, drillId) => {
                          const d = drills.find((x) => x.id === drillId);
                          return acc + (d ? d.mins : 0);
                        }, 0)
                      } mins total duration
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-black tracking-wider text-[var(--muted)] uppercase">
                    Drills in this plan
                  </h4>
                  {activePlan.drills.map((drillId, idx) => {
                    const drill = drills.find((d) => d.id === drillId);
                    if (!drill) return null;
                    return (
                      <div
                        key={`${drillId}-${idx}`}
                        className="flex items-center justify-between p-3 border border-[var(--line)] bg-[#FAFBFF] rounded-xl"
                      >
                        <div>
                          <b className="text-sm font-extrabold text-[var(--ink)]">
                            {idx + 1}. {drill.title}
                          </b>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-extrabold text-[var(--muted)] uppercase">
                              {drill.cat}
                            </span>
                            <span className="text-[10px] text-gray-400">•</span>
                            <span className="text-[10px] font-extrabold text-gray-500">
                              {drill.mins} mins
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              onUpdateTrainingState({
                                ...trainingState,
                                view: 'viewer',
                                activeId: drill.id,
                                step: 0,
                              })
                            }
                            className="px-2.5 py-1 text-xs font-bold bg-[#EEF2FF] text-[var(--blue)] hover:bg-[#E0E7FF] rounded-lg transition"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleRemoveFromPlan(idx)}
                            className="px-2.5 py-1 text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {activePlan.drills.length === 0 && (
                    <p className="text-xs text-[var(--muted)] font-semibold text-center py-6 bg-gray-50 rounded-xl">
                      No drills added to this plan yet. Use the selector below or the library to add them.
                    </p>
                  )}
                </div>

                {/* Add Available Drills Section */}
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-black tracking-wider text-[var(--muted)] uppercase">
                    Add other drills to this plan
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                    {drills
                      .filter((d) => !activePlan.drills.includes(d.id))
                      .map((d) => (
                        <div
                          key={d.id}
                          className="p-3 border border-gray-100 bg-gray-50 rounded-xl flex items-center justify-between"
                        >
                          <div>
                            <b className="text-xs font-bold text-[var(--ink)] block truncate max-w-[180px]">
                              {d.title}
                            </b>
                            <span className="text-[10px] text-[var(--muted)] font-medium">
                              {d.cat} • {d.mins} mins
                            </span>
                          </div>
                          <button
                            onClick={() => handleAddToPlan(d.id)}
                            className="px-2.5 py-1 text-xs font-bold bg-white border border-[var(--line)] text-[var(--blue)] hover:bg-[#EEF2FF] rounded-lg transition"
                          >
                            + Add
                          </button>
                        </div>
                      ))}
                    {drills.filter((d) => !activePlan.drills.includes(d.id)).length === 0 && (
                      <p className="text-xs text-gray-400 font-semibold text-center col-span-2 py-4">
                        All drills are already in this plan.
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <FolderHeart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-base font-extrabold text-[var(--navy)]">No Plan Selected</h3>
                <p className="text-xs text-[var(--muted)] mt-1 max-w-sm mx-auto">
                  Select an existing plan on the left side, or click "New Plan" to construct a new training routine.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Create or Edit Drill */}
      {showAddEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[2000] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl border border-[var(--line)] shadow-2xl p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-lg font-black text-[var(--navy)]">
                {editingDrill ? `Edit Drill: ${editingDrill.title}` : 'Create New Training Drill'}
              </h3>
              <button
                onClick={() => setShowAddEditModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <p className="p-3 mb-4 text-xs font-bold bg-red-50 text-red-600 rounded-xl border border-red-100">
                {formError}
              </p>
            )}

            {/* AI-Powered Paste / Import Section */}
            <div className="mb-4 p-3 bg-indigo-50/80 border border-indigo-100 rounded-2xl">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <span className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Import with AI</span>
                </span>
                <div className="flex bg-white p-0.5 rounded-lg border border-indigo-200" title="Choose which AI provider extracts the drill">
                  <button
                    type="button"
                    onClick={() => handleSetAiProvider('claude')}
                    className={`px-2 py-1 rounded-md text-[10px] font-black transition flex items-center gap-1 cursor-pointer ${
                      aiProvider === 'claude' ? 'bg-indigo-600 text-white' : 'text-indigo-500 hover:text-indigo-700'
                    }`}
                  >
                    <Cpu className="w-3 h-3" />
                    <span>Claude</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAiProvider('gemini')}
                    className={`px-2 py-1 rounded-md text-[10px] font-black transition flex items-center gap-1 cursor-pointer ${
                      aiProvider === 'gemini' ? 'bg-indigo-600 text-white' : 'text-indigo-500 hover:text-indigo-700'
                    }`}
                  >
                    <Cpu className="w-3 h-3" />
                    <span>Gemini</span>
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-indigo-600 font-semibold mb-2">Paste drill notes from anywhere and let AI fill the form</p>
              <textarea
                value={importRawText}
                onChange={(e) => setImportRawText(e.target.value)}
                placeholder="Paste a drill's objective, setup, and steps here (e.g. from a coaching website or your own notes)..."
                rows={4}
                className="w-full p-2 text-xs border border-indigo-200 bg-white rounded-xl text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
              />
              {importError && (
                <p className="mt-2 text-[11px] font-bold text-red-600">{importError}</p>
              )}
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={handleAiExtractDrill}
                  disabled={isImporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Extracting...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Extract Drill Details</span>
                    </>
                  )}
                </button>
              </div>
              <p className="mt-2 text-[10px] text-indigo-500 font-semibold">
                This fills in the fields below - review and edit them, then save as usual. The diagram will use a generic layout until you customise it.
              </p>
            </div>

            <div className="space-y-4">
              {/* Drill Title */}
              <div>
                <label className="text-xs font-bold text-[var(--muted)] tracking-wider uppercase block mb-1">
                  Drill Title *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Back-and-Forth Kicking Relay"
                  className="w-full px-3 py-2 border border-[var(--line)] rounded-xl text-sm bg-white text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
                />
              </div>

              {/* Category, Duration, and Players */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-[var(--muted)] tracking-wider uppercase block mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    list="formCatList"
                    value={formCat}
                    onChange={(e) => setFormCat(e.target.value)}
                    placeholder="e.g. Kicking"
                    className="w-full px-3 py-2 border border-[var(--line)] rounded-xl text-sm bg-white text-[var(--ink)] focus:outline-none"
                  />
                  <datalist id="formCatList">
                    {categories.filter((c) => c !== 'All').map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--muted)] tracking-wider uppercase block mb-1">
                    Duration (mins)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formMins}
                    onChange={(e) => setFormMins(parseInt(e.target.value, 10) || 10)}
                    className="w-full px-3 py-2 border border-[var(--line)] rounded-xl text-sm bg-white text-[var(--ink)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--muted)] tracking-wider uppercase block mb-1">
                    Players / Grouping
                  </label>
                  <input
                    type="text"
                    value={formPlayers}
                    onChange={(e) => setFormPlayers(e.target.value)}
                    placeholder="e.g. Pairs, 12+, Teams"
                    className="w-full px-3 py-2 border border-[var(--line)] rounded-xl text-sm bg-white text-[var(--ink)] focus:outline-none"
                  />
                </div>
              </div>

              {/* Overview */}
              <div>
                <label className="text-xs font-bold text-[var(--muted)] tracking-wider uppercase block mb-1">
                  Overview / Objective
                </label>
                <textarea
                  value={formOverview}
                  onChange={(e) => setFormOverview(e.target.value)}
                  placeholder="Describe the objective and setups of this training drill..."
                  rows={3}
                  className="w-full px-3 py-2 border border-[var(--line)] rounded-xl text-sm bg-white text-[var(--ink)] focus:outline-none font-sans"
                />
              </div>

              {/* Steps builder */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-[var(--muted)] tracking-wider uppercase block mb-1 border-b border-gray-100 pb-1">
                  Drill Instructions & Steps
                </label>
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {formSteps.map((step, index) => (
                    <div key={index} className="flex gap-2 items-start bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={step[0]}
                          onChange={(e) => handleStepChange(index, 0, e.target.value)}
                          placeholder={`Step ${index + 1} Title (e.g. Setup)`}
                          className="w-full px-2 py-1 border border-gray-200 bg-white rounded-lg text-xs font-bold"
                        />
                        <textarea
                          value={step[1]}
                          onChange={(e) => handleStepChange(index, 1, e.target.value)}
                          placeholder="Describe instructions for this step..."
                          rows={1}
                          className="w-full px-2 py-1 border border-gray-200 bg-white rounded-lg text-xs font-medium resize-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveStepRow(index)}
                        disabled={formSteps.length <= 1}
                        className="px-2 py-1 text-xs font-black text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAddStepRow}
                  className="w-full py-2 text-xs font-bold border border-dashed border-[var(--blue)] text-[var(--blue)] hover:bg-[#EEF2FF] rounded-xl transition"
                >
                  + Add Step Row
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4 mt-6">
              <button
                onClick={() => setShowAddEditModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDrill}
                className="px-4 py-2 text-xs font-bold text-white bg-[var(--green)] hover:opacity-90 rounded-xl transition"
              >
                {editingDrill ? 'Save Changes' : 'Save Drill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
