import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Shield, Shirt, Image as ImageIcon, Trash2, Check, Sparkles, AlertCircle } from 'lucide-react';
import { TeamProfile } from '../types';

interface TeamEditModalProps {
  isOpen?: boolean;
  onClose: () => void;
  team: TeamProfile | null; // Null means creating new team
  onSave: (team: TeamProfile) => void;
}

// Preset Club Logos (SVG Data URLs)
const PRESET_LOGOS = [
  {
    name: 'Gold Shield',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 5 L90 20 L90 55 C90 75 50 95 50 95 C50 95 10 75 10 55 L10 20 Z" fill="%23d97706" stroke="%23fef3c7" stroke-width="4"/><text x="50" y="58" font-size="32" font-weight="900" text-anchor="middle" fill="%23ffffff" font-family="sans-serif">IQ</text></svg>'
  },
  {
    name: 'Navy Tiger',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23102A43" stroke="%23e2e8f0" stroke-width="4"/><path d="M25 75 L75 25 L85 35 L35 85 Z" fill="%23f59e0b"/><text x="50" y="62" font-size="28" font-weight="900" text-anchor="middle" fill="%23ffffff" font-family="sans-serif">FC</text></svg>'
  },
  {
    name: 'Red Falcon',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 10 L85 30 L85 70 L50 90 L15 70 L15 30 Z" fill="%23dc2626" stroke="%23fee2e2" stroke-width="4"/><text x="50" y="60" font-size="34" font-weight="900" text-anchor="middle" fill="%23ffffff" font-family="sans-serif">⚡</text></svg>'
  },
  {
    name: 'Emerald Crown',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23059669" stroke="%23a7f3d0" stroke-width="4"/><text x="50" y="62" font-size="34" font-weight="900" text-anchor="middle" fill="%23ffffff" font-family="sans-serif">👑</text></svg>'
  },
  {
    name: 'Royal Crest',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 5 L90 20 L90 55 C90 75 50 95 50 95 C50 95 10 75 10 55 L10 20 Z" fill="%232563eb" stroke="%23bfdbfe" stroke-width="4"/><text x="50" y="60" font-size="32" font-weight="900" text-anchor="middle" fill="%23ffffff" font-family="sans-serif">VIC</text></svg>'
  }
];

// Preset Jumper / Jersey Designs (SVG Data URLs)
const PRESET_JUMPERS = [
  {
    name: 'Black & Gold Sash',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120"><path d="M25 10 L40 10 C45 20 55 20 60 10 L75 10 L95 30 L80 45 L80 110 L20 110 L20 45 L5 30 Z" fill="%230f172a"/><path d="M75 10 L95 30 L80 45 L80 55 L20 110 L20 90 Z" fill="%23f59e0b"/><path d="M25 10 C35 25 65 25 75 10" fill="none" stroke="%23ffffff" stroke-width="3"/></svg>'
  },
  {
    name: 'Navy & White Hoops',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120"><path d="M25 10 L40 10 C45 20 55 20 60 10 L75 10 L95 30 L80 45 L80 110 L20 110 L20 45 L5 30 Z" fill="%231e3a8a"/><rect x="20" y="35" width="60" height="15" fill="%23ffffff"/><rect x="20" y="65" width="60" height="15" fill="%23ffffff"/><rect x="20" y="95" width="60" height="15" fill="%23ffffff"/></svg>'
  },
  {
    name: 'Red & White V',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120"><path d="M25 10 L40 10 C45 20 55 20 60 10 L75 10 L95 30 L80 45 L80 110 L20 110 L20 45 L5 30 Z" fill="%23dc2626"/><path d="M25 10 L50 65 L75 10 L60 10 L50 42 L40 10 Z" fill="%23ffffff"/></svg>'
  },
  {
    name: 'Royal Blue & Wings',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120"><path d="M25 10 L40 10 C45 20 55 20 60 10 L75 10 L95 30 L80 45 L80 110 L20 110 L20 45 L5 30 Z" fill="%232563eb"/><path d="M20 45 L50 85 L80 45 L80 60 L50 100 L20 60 Z" fill="%23f59e0b"/></svg>'
  },
  {
    name: 'Emerald Green',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120"><path d="M25 10 L40 10 C45 20 55 20 60 10 L75 10 L95 30 L80 45 L80 110 L20 110 L20 45 L5 30 Z" fill="%23059669"/><rect x="42" y="25" width="16" height="85" fill="%23ffffff"/></svg>'
  }
];

export default function TeamEditModal({ isOpen = true, onClose, team, onSave }: TeamEditModalProps) {
  const [name, setName] = useState('');
  const [isInactive, setIsInactive] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [jumperUrl, setJumperUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const logoFileRef = useRef<HTMLInputElement>(null);
  const iconFileRef = useRef<HTMLInputElement>(null);
  const jumperFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (team) {
      setName(team.name || '');
      setIsInactive(!!team.isInactive);
      setLogoUrl(team.logoUrl || '');
      setIconUrl(team.iconUrl || '');
      setJumperUrl(team.jumperUrl || '');
    } else {
      setName('');
      setIsInactive(false);
      setLogoUrl(PRESET_LOGOS[0].url);
      setIconUrl(PRESET_LOGOS[0].url);
      setJumperUrl(PRESET_JUMPERS[0].url);
    }
    setErrorMsg('');
  }, [team, isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 5MB limit. Please upload a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setter(result);
        setErrorMsg('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Please enter a team name');
      return;
    }

    const updatedTeam: TeamProfile = {
      id: team ? team.id : `team_${Date.now()}`,
      name: trimmedName,
      createdAt: team ? team.createdAt : Date.now(),
      isInactive,
      showTraining: team ? team.showTraining : true,
      showPlayerGrowth: team ? team.showPlayerGrowth : true,
      showJarvis: team ? team.showJarvis : true,
      logoUrl,
      iconUrl: iconUrl || logoUrl, // Fallback icon to logo if iconUrl not specified
      jumperUrl,
    };

    onSave(updatedTeam);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[3000] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl border border-[var(--line)] shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[var(--navy)] via-[#102A43] to-indigo-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base tracking-tight text-white">
                {team ? 'Edit Team & Visual Identity' : 'Create New Team Squad'}
              </h3>
              <p className="text-xs text-indigo-200 font-semibold">
                Manage squad details, official club logo, icon & jumper image
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Team Name & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                Team / Squad Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Richmond Tigers U16, Valiants Senior Team"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                Season Status
              </label>
              <select
                value={isInactive ? 'inactive' : 'active'}
                onChange={(e) => setIsInactive(e.target.value === 'inactive')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="active">Active (Live Season)</option>
                <option value="inactive">Inactive / Archived</option>
              </select>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* VISUAL BRANDING SECTION */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Team Visual Branding & Jersey Assets</span>
                </h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Upload your club logo, small icon, and jersey/jumper design. Logos appear on Game Day & Squad views.
                </p>
              </div>
            </div>

            {/* 3 Upload Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* 1. TEAM LOGO */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span>Club Logo</span>
                  </span>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="text-[10px] text-red-500 hover:text-red-700 font-bold cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Preview Box */}
                <div className="w-20 h-20 mx-auto rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center overflow-hidden p-1.5 relative group">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Club Logo" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center text-slate-400 space-y-1">
                      <Shield className="w-8 h-8 mx-auto stroke-1" />
                      <span className="text-[9px] font-bold block">No Logo</span>
                    </div>
                  )}
                </div>

                {/* File Upload Button */}
                <div>
                  <input
                    type="file"
                    ref={logoFileRef}
                    onChange={(e) => handleFileUpload(e, setLogoUrl)}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => logoFileRef.current?.click()}
                    className="w-full py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-extrabold text-xs rounded-xl shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                    <span>Upload Logo</span>
                  </button>
                </div>

                {/* Presets */}
                <div className="pt-1 border-t border-slate-200">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Or pick preset:
                  </span>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {PRESET_LOGOS.map((p, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setLogoUrl(p.url)}
                        title={p.name}
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center p-0.5 shrink-0 transition cursor-pointer ${
                          logoUrl === p.url ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50' : 'border-slate-300 bg-white hover:border-slate-400'
                        }`}
                      >
                        <img src={p.url} alt={p.name} className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. TEAM JUMPER / JERSEY */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Shirt className="w-4 h-4 text-amber-600" />
                    <span>Jumper / Jersey</span>
                  </span>
                  {jumperUrl && (
                    <button
                      type="button"
                      onClick={() => setJumperUrl('')}
                      className="text-[10px] text-red-500 hover:text-red-700 font-bold cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Preview Box */}
                <div className="w-20 h-20 mx-auto rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center overflow-hidden p-1.5 relative group">
                  {jumperUrl ? (
                    <img src={jumperUrl} alt="Jumper Design" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center text-slate-400 space-y-1">
                      <Shirt className="w-8 h-8 mx-auto stroke-1" />
                      <span className="text-[9px] font-bold block">No Jumper</span>
                    </div>
                  )}
                </div>

                {/* File Upload Button */}
                <div>
                  <input
                    type="file"
                    ref={jumperFileRef}
                    onChange={(e) => handleFileUpload(e, setJumperUrl)}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => jumperFileRef.current?.click()}
                    className="w-full py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-extrabold text-xs rounded-xl shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-600" />
                    <span>Upload Jumper</span>
                  </button>
                </div>

                {/* Presets */}
                <div className="pt-1 border-t border-slate-200">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Or pick preset:
                  </span>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {PRESET_JUMPERS.map((p, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setJumperUrl(p.url)}
                        title={p.name}
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center p-0.5 shrink-0 transition cursor-pointer ${
                          jumperUrl === p.url ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50' : 'border-slate-300 bg-white hover:border-slate-400'
                        }`}
                      >
                        <img src={p.url} alt={p.name} className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. TEAM ICON / BADGE */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    <span>App Icon / Badge</span>
                  </span>
                  {iconUrl && (
                    <button
                      type="button"
                      onClick={() => setIconUrl('')}
                      className="text-[10px] text-red-500 hover:text-red-700 font-bold cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Preview Box */}
                <div className="w-20 h-20 mx-auto rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center overflow-hidden p-1.5 relative group">
                  {iconUrl || logoUrl ? (
                    <img src={iconUrl || logoUrl} alt="App Icon" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center text-slate-400 space-y-1">
                      <ImageIcon className="w-8 h-8 mx-auto stroke-1" />
                      <span className="text-[9px] font-bold block">Same as Logo</span>
                    </div>
                  )}
                </div>

                {/* File Upload Button */}
                <div>
                  <input
                    type="file"
                    ref={iconFileRef}
                    onChange={(e) => handleFileUpload(e, setIconUrl)}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => iconFileRef.current?.click()}
                    className="w-full py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-extrabold text-xs rounded-xl shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Upload Icon</span>
                  </button>
                </div>

                <div className="pt-1 border-t border-slate-200">
                  <p className="text-[10px] font-semibold text-slate-400 leading-tight">
                    Small round icon used in navigation headers & notification alerts. Defaults to Club Logo if left blank.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{team ? 'Save Team Identity' : 'Create Team Squad'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
