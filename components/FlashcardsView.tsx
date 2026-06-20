import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Flashcard, SrsRating } from '../types';
import { LANGUAGE_CONFIG } from '../constants';
import {
  Trash2, RotateCw, ChevronLeft, ChevronRight, GraduationCap,
  Download, Search, X, Folder, FolderPlus, ChevronDown, Layers,
} from 'lucide-react';

interface FlashcardsViewProps {
  flashcards: Flashcard[];
  onDeleteFlashcard: (id: string) => void;
  onRateFlashcard: (id: string, rating: SrsRating) => void;
  onAssignCard: (id: string, folder: string | null, setName: string | null) => void;
  onClearFolder: (folder: string) => void;
  onClearSet: (folder: string, setName: string) => void;
}

const ALL_LABEL = 'All';
const ALL_LANGUAGES = [ALL_LABEL, ...LANGUAGE_CONFIG.map(l => l.name)];
const LS_FOLDERS = 'ts_user_folders';
const LS_SETS    = 'ts_user_sets';

const RATING_BUTTONS: { rating: SrsRating; label: string; style: string }[] = [
  { rating: 'again', label: 'Again', style: 'bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30' },
  { rating: 'hard',  label: 'Hard',  style: 'bg-orange-600/20 text-orange-400 border border-orange-600/30 hover:bg-orange-600/30' },
  { rating: 'good',  label: 'Good',  style: 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 hover:bg-indigo-600/30' },
  { rating: 'easy',  label: 'Easy',  style: 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 hover:bg-emerald-600/30' },
];

const faceStyle: React.CSSProperties = { WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden' };

function loadLS<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}

const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  flashcards, onDeleteFlashcard, onRateFlashcard, onAssignCard, onClearFolder, onClearSet,
}) => {
  const [currentIndex, setCurrentIndex]         = useState(0);
  const [isFlipped, setIsFlipped]               = useState(false);
  const [search, setSearch]                     = useState('');
  const [langFilter, setLangFilter]             = useState(ALL_LABEL);
  const [ratedIds, setRatedIds]                 = useState<Set<string>>(new Set());
  const [activeFolder, setActiveFolder]         = useState<string | null>(null);
  const [activeSet, setActiveSet]               = useState<string | null>(null);
  const [showFolderMenu, setShowFolderMenu]     = useState(false);
  const [showNewFolderTab, setShowNewFolderTab] = useState(false);
  const [showNewSetTab, setShowNewSetTab]       = useState(false);
  const [newFolderName, setNewFolderName]       = useState('');
  const [newSetName, setNewSetName]             = useState('');
  const [newSetInFolder, setNewSetInFolder]     = useState('');
  const [newSetInFolderName, setNewSetInFolderName] = useState('');

  // Folder/set names persist independently of which cards are in them
  const [userFolders, setUserFolders] = useState<string[]>(() => loadLS<string[]>(LS_FOLDERS, []));
  const [userSets, setUserSets]       = useState<Record<string, string[]>>(() => loadLS<Record<string, string[]>>(LS_SETS, {}));

  const newFolderRef = useRef<HTMLInputElement>(null);
  const menuRef      = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showFolderMenu) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowFolderMenu(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showFolderMenu]);

  // Merge localStorage folders with any folder names on cards (union, sorted)
  const folders = useMemo(() => {
    const all = new Set([...userFolders, ...flashcards.flatMap(c => c.folder ? [c.folder] : [])]);
    return [...all].sort();
  }, [flashcards, userFolders]);

  // Merge localStorage sets with card-derived sets per folder
  const setsByFolder = useMemo(() => {
    const result: Record<string, string[]> = {};
    Object.entries(userSets).forEach(([f, ss]) => { result[f] = [...ss]; });
    flashcards.forEach(c => {
      if (c.folder && c.setName) {
        if (!result[c.folder]) result[c.folder] = [];
        if (!result[c.folder].includes(c.setName)) result[c.folder].push(c.setName);
      }
    });
    Object.values(result).forEach(arr => arr.sort());
    return result;
  }, [flashcards, userSets]);

  const currentSets = activeFolder ? (setsByFolder[activeFolder] ?? []) : [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return flashcards.filter(card => {
      const matchSearch = !q || card.original.toLowerCase().includes(q) || card.translated.toLowerCase().includes(q);
      const matchLang   = langFilter === ALL_LABEL || card.targetLang === langFilter || card.sourceLang === langFilter;
      const matchFolder = activeFolder === null || card.folder === activeFolder;
      const matchSet    = !activeFolder || activeSet === null || card.setName === activeSet;
      return matchSearch && matchLang && matchFolder && matchSet;
    });
  }, [flashcards, search, langFilter, activeFolder, activeSet]);

  const resetIndex = () => setCurrentIndex(0);
  const currentCard = filtered[Math.min(currentIndex, filtered.length - 1)];

  const handleNext = () => { setIsFlipped(false); setCurrentIndex(p => (p + 1) % filtered.length); };
  const handlePrev = () => { setIsFlipped(false); setCurrentIndex(p => (p - 1 + filtered.length) % filtered.length); };

  const handleDelete = () => {
    if (!currentCard) return;
    onDeleteFlashcard(currentCard.id);
    setIsFlipped(false);
    if (filtered.length > 1 && currentIndex >= filtered.length - 1) setCurrentIndex(0);
  };

  const handleRate = (rating: SrsRating) => {
    if (!currentCard) return;
    onRateFlashcard(currentCard.id, rating);
    setRatedIds(prev => new Set(prev).add(currentCard.id));
    setTimeout(() => { setIsFlipped(false); handleNext(); }, 300);
  };

  const handleExport = () => {
    const header = 'Original,Translated,Source,Target,Folder,Set,Date';
    const rows = flashcards.map(c =>
      [`"${c.original.replace(/"/g, '""')}"`, `"${c.translated.replace(/"/g, '""')}"`,
       `"${c.sourceLang || 'Auto'}"`, `"${c.targetLang}"`, `"${c.folder || ''}"`, `"${c.setName || ''}"`,
       new Date(c.timestamp).toLocaleDateString()].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: 'translatesafe-flashcards.csv' });
    a.click(); URL.revokeObjectURL(url);
  };

  // Persist a folder name to localStorage
  const saveFolder = (name: string) => {
    const updated = [...new Set([...userFolders, name])].sort();
    setUserFolders(updated);
    localStorage.setItem(LS_FOLDERS, JSON.stringify(updated));
  };

  // Persist a set name under a folder to localStorage
  const saveSet = (folder: string, setName: string) => {
    const existing = userSets[folder] ?? [];
    const updated = { ...userSets, [folder]: [...new Set([...existing, setName])].sort() };
    setUserSets(updated);
    localStorage.setItem(LS_SETS, JSON.stringify(updated));
  };

  // Assign current card (from dropdown) — also persists the folder/set names
  const handleAssign = (folder: string | null, setName: string | null) => {
    if (!currentCard) return;
    if (folder) saveFolder(folder);
    if (folder && setName) saveSet(folder, setName);
    onAssignCard(currentCard.id, folder, setName);
    setShowFolderMenu(false);
    setNewSetInFolder(''); setNewSetInFolderName('');
  };

  // Tab bar: create folder without touching any card
  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    saveFolder(name);
    setActiveFolder(name); setActiveSet(null);
    setNewFolderName(''); setShowNewFolderTab(false);
  };

  // Tab bar: create set without touching any card
  const handleCreateSet = () => {
    const name = newSetName.trim();
    if (!name || !activeFolder) return;
    saveSet(activeFolder, name);
    setActiveSet(name);
    setNewSetName(''); setShowNewSetTab(false);
  };

  // Dropdown: create set AND assign current card
  const handleCreateSetInFolder = (folder: string) => {
    const name = newSetInFolderName.trim();
    if (!name || !currentCard) return;
    saveFolder(folder);
    saveSet(folder, name);
    onAssignCard(currentCard.id, folder, name);
    setNewSetInFolder(''); setNewSetInFolderName(''); setShowFolderMenu(false);
  };

  const handleDeleteFolder = (folder: string) => {
    const updatedFolders = userFolders.filter(f => f !== folder);
    setUserFolders(updatedFolders);
    localStorage.setItem(LS_FOLDERS, JSON.stringify(updatedFolders));
    const { [folder]: _removed, ...restSets } = userSets;
    setUserSets(restSets);
    localStorage.setItem(LS_SETS, JSON.stringify(restSets));
    if (activeFolder === folder) { setActiveFolder(null); setActiveSet(null); resetIndex(); }
    onClearFolder(folder);
  };

  const handleDeleteSet = (folder: string, setName: string) => {
    const updatedSets = { ...userSets, [folder]: (userSets[folder] ?? []).filter(s => s !== setName) };
    setUserSets(updatedSets);
    localStorage.setItem(LS_SETS, JSON.stringify(updatedSets));
    if (activeSet === setName) { setActiveSet(null); resetIndex(); }
    onClearSet(folder, setName);
  };

  const cardLabel = currentCard
    ? currentCard.folder
      ? currentCard.setName ? `${currentCard.folder} / ${currentCard.setName}` : currentCard.folder
      : 'No folder'
    : '';

  const dueCount = flashcards.filter(c => c.nextReview <= Date.now()).length;

  if (flashcards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8">
        <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6">
          <GraduationCap className="w-12 h-12 text-slate-600" />
        </div>
        <h3 className="text-xl font-semibold text-slate-300 mb-2">No Flashcards Yet</h3>
        <p className="text-center max-w-md">Translate something and click "Save Flashcard" to build your deck.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center h-full max-w-4xl mx-auto p-4 md:p-6 gap-3">

      {/* ── Folder tabs ── */}
      <div className="w-full flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        <button
          onClick={() => { setActiveFolder(null); setActiveSet(null); resetIndex(); }}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeFolder === null ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
          }`}
        >
          All <span className="opacity-60">({flashcards.length})</span>
        </button>

        {folders.map(folder => (
          <div key={folder} className={`shrink-0 group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            activeFolder === folder ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
          }`}
            onClick={() => { setActiveFolder(folder); setActiveSet(null); resetIndex(); }}
          >
            <Folder className="w-3.5 h-3.5 shrink-0" />
            {folder}
            <span className="opacity-60">({flashcards.filter(c => c.folder === folder).length})</span>
            <span
              onClick={e => { e.stopPropagation(); handleDeleteFolder(folder); }}
              className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </span>
          </div>
        ))}

        {showNewFolderTab ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <input ref={newFolderRef} autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') { setShowNewFolderTab(false); setNewFolderName(''); } }}
              placeholder="Folder name…"
              className="bg-slate-800 border border-indigo-500 rounded-lg px-2.5 py-1 text-sm text-slate-200 outline-none w-36"
            />
            <button onClick={handleCreateFolder} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg">Add</button>
            <button onClick={() => { setShowNewFolderTab(false); setNewFolderName(''); }} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <button onClick={() => setShowNewFolderTab(true)}
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 text-sm text-slate-500 hover:text-slate-300 border border-dashed border-slate-700 rounded-full transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" /> New Folder
          </button>
        )}
      </div>

      {/* ── Set tabs (only when a folder is selected) ── */}
      {activeFolder && (
        <div className="w-full flex items-center gap-2 overflow-x-auto pb-1 pl-3" style={{ scrollbarWidth: 'none' }}>
          <span className="text-slate-700 text-xs shrink-0 select-none">▸</span>
          <button
            onClick={() => { setActiveSet(null); resetIndex(); }}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeSet === null ? 'bg-slate-600 text-white' : 'bg-slate-800/60 text-slate-500 hover:text-slate-300 border border-slate-700'
            }`}
          >
            All in {activeFolder}
          </button>

          {currentSets.map(setName => (
            <div key={setName}
              className={`shrink-0 group flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                activeSet === setName ? 'bg-slate-600 text-white' : 'bg-slate-800/60 text-slate-500 hover:text-slate-300 border border-slate-700'
              }`}
              onClick={() => { setActiveSet(setName); resetIndex(); }}
            >
              <Layers className="w-3 h-3 shrink-0" />
              {setName}
              <span className="opacity-60">({flashcards.filter(c => c.folder === activeFolder && c.setName === setName).length})</span>
              <span
                onClick={e => { e.stopPropagation(); handleDeleteSet(activeFolder!, setName); }}
                className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </span>
            </div>
          ))}

          {showNewSetTab ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <input autoFocus value={newSetName} onChange={e => setNewSetName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateSet(); if (e.key === 'Escape') { setShowNewSetTab(false); setNewSetName(''); } }}
                placeholder="Set name…"
                className="bg-slate-800 border border-slate-500 rounded-lg px-2.5 py-0.5 text-xs text-slate-200 outline-none w-28"
              />
              <button onClick={handleCreateSet} className="text-xs bg-slate-600 hover:bg-slate-500 text-white px-2 py-0.5 rounded-lg">Add</button>
              <button onClick={() => { setShowNewSetTab(false); setNewSetName(''); }} className="text-slate-500 hover:text-slate-300"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <button onClick={() => setShowNewSetTab(true)}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 hover:text-slate-400 border border-dashed border-slate-700 rounded-full transition-colors"
            >
              <FolderPlus className="w-3 h-3" /> New Set
            </button>
          )}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="w-full flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); resetIndex(); }} placeholder="Search cards..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-indigo-500 transition-colors"
          />
          {search && <button onClick={() => { setSearch(''); resetIndex(); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>}
        </div>
        <select value={langFilter} onChange={e => { setLangFilter(e.target.value); resetIndex(); }}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500 transition-colors"
        >
          {ALL_LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
        </select>
        <button onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2.5 text-sm bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 rounded-xl transition-colors font-medium shrink-0"
        >
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {/* ── Stats row ── */}
      <div className="w-full flex justify-between items-center px-1">
        <div className="text-slate-400 text-sm font-medium">
          {filtered.length === 0 ? 'No cards match' : `Card ${Math.min(currentIndex + 1, filtered.length)} of ${filtered.length}`}
        </div>
        <div className="flex items-center gap-3">

          {/* Folder/Set assignment dropdown */}
          {currentCard && (
            <div className="relative" ref={menuRef}>
              <button onClick={() => setShowFolderMenu(!showFolderMenu)}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Folder className="w-3.5 h-3.5 shrink-0" />
                <span className="max-w-[160px] truncate">{cardLabel}</span>
                <ChevronDown className="w-3 h-3 shrink-0" />
              </button>

              {showFolderMenu && (
                <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 w-60 py-1 max-h-80 overflow-y-auto">
                  <button onClick={() => handleAssign(null, null)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors flex items-center gap-2 ${!currentCard.folder ? 'text-indigo-400' : 'text-slate-400'}`}
                  >
                    <X className="w-3.5 h-3.5" /> No folder
                  </button>

                  {folders.length > 0 && <div className="border-t border-slate-700 my-1" />}

                  {folders.map(folder => (
                    <div key={folder}>
                      <button onClick={() => handleAssign(folder, null)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors flex items-center gap-2 font-medium ${currentCard.folder === folder && !currentCard.setName ? 'text-indigo-400' : 'text-slate-200'}`}
                      >
                        <Folder className="w-3.5 h-3.5 shrink-0" /> {folder}
                      </button>
                      {(setsByFolder[folder] ?? []).map(setName => (
                        <button key={setName} onClick={() => handleAssign(folder, setName)}
                          className={`w-full text-left pl-8 pr-3 py-1.5 text-xs hover:bg-slate-700 transition-colors flex items-center gap-2 ${currentCard.folder === folder && currentCard.setName === setName ? 'text-indigo-400' : 'text-slate-400'}`}
                        >
                          <Layers className="w-3 h-3 shrink-0" /> {setName}
                          {currentCard.folder === folder && currentCard.setName === setName && <span className="ml-auto">✓</span>}
                        </button>
                      ))}
                      {newSetInFolder === folder ? (
                        <div className="flex items-center gap-1.5 pl-8 pr-3 py-1.5">
                          <input autoFocus value={newSetInFolderName} onChange={e => setNewSetInFolderName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleCreateSetInFolder(folder); if (e.key === 'Escape') { setNewSetInFolder(''); setNewSetInFolderName(''); } }}
                            placeholder="Set name…"
                            className="bg-slate-700 border border-slate-600 rounded px-2 py-0.5 text-xs text-slate-200 outline-none flex-1 focus:border-indigo-500"
                          />
                          <button onClick={() => handleCreateSetInFolder(folder)} className="text-xs text-indigo-400 hover:text-indigo-300 shrink-0">Add</button>
                        </div>
                      ) : (
                        <button onClick={() => { setNewSetInFolder(folder); setNewSetInFolderName(''); }}
                          className="w-full text-left pl-8 pr-3 py-1.5 text-xs text-slate-600 hover:text-slate-400 hover:bg-slate-700 transition-colors flex items-center gap-2"
                        >
                          <FolderPlus className="w-3 h-3" /> New set…
                        </button>
                      )}
                    </div>
                  ))}

                  <div className="border-t border-slate-700 my-1" />
                  <button onClick={() => { setShowFolderMenu(false); setShowNewFolderTab(true); setTimeout(() => newFolderRef.current?.focus(), 50); }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:bg-slate-700 transition-colors flex items-center gap-2"
                  >
                    <FolderPlus className="w-3.5 h-3.5" /> New folder…
                  </button>
                </div>
              )}
            </div>
          )}

          {dueCount > 0 && (
            <span className="text-xs bg-amber-900/30 text-amber-400 border border-amber-700/30 px-2 py-1 rounded-full">{dueCount} due</span>
          )}
          <button onClick={handleDelete} disabled={!currentCard}
            className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-2 rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-30"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-500">No cards match your filters.</div>
      ) : (
        <>
          {/* ── Card ── */}
          <div className="relative w-full max-w-2xl aspect-[3/2]" style={{ perspective: '1000px' }}>
            <div
              className={`relative w-full h-full cursor-pointer transition-transform duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
              style={{ willChange: 'transform' }}
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl shadow-xl border border-slate-600 flex flex-col items-center justify-center p-8 text-center" style={faceStyle}>
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4 bg-indigo-900/30 px-3 py-1 rounded-full border border-indigo-500/20">Original</span>
                <p className="text-3xl md:text-4xl font-bold text-slate-100 leading-tight">{currentCard.original}</p>
                {currentCard.nextReview > 0 && (
                  <p className="mt-6 text-xs text-slate-500">
                    Next review: {currentCard.nextReview <= Date.now() ? 'Due now' : new Date(currentCard.nextReview).toLocaleDateString()}
                  </p>
                )}
                <p className="mt-4 text-slate-500 text-sm">Click to flip</p>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-slate-800 rounded-2xl shadow-xl border border-indigo-500/30 flex flex-col items-center justify-center p-8 text-center [transform:rotateY(180deg)]" style={faceStyle}>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4 bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-500/20">{currentCard.targetLang}</span>
                <p className="text-3xl md:text-4xl font-bold text-white leading-tight">{currentCard.translated}</p>
                <p className="mt-6 text-indigo-300/50 text-sm">Rate your recall below</p>
              </div>
            </div>
          </div>

          {/* ── Controls ── */}
          {isFlipped ? (
            <div className="flex flex-col items-center gap-3 w-full max-w-2xl">
              <p className="text-xs text-slate-500 uppercase tracking-wider">How well did you remember?</p>
              <div className="grid grid-cols-4 gap-3 w-full">
                {RATING_BUTTONS.map(({ rating, label, style }) => (
                  <button key={rating} onClick={() => handleRate(rating)} className={`py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${style}`}>{label}</button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex gap-6 items-center">
              <button onClick={handlePrev} className="p-4 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 transition-all shadow-lg active:scale-95"><ChevronLeft className="w-6 h-6" /></button>
              <button onClick={() => setIsFlipped(true)} className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-semibold shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
                <RotateCw className="w-5 h-5" /> Flip Card
              </button>
              <button onClick={handleNext} className="p-4 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 transition-all shadow-lg active:scale-95"><ChevronRight className="w-6 h-6" /></button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FlashcardsView;
