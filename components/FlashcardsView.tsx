import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Flashcard, SrsRating } from '../types';
import { LANGUAGE_CONFIG } from '../constants';
import {
  Trash2, RotateCw, ChevronLeft, ChevronRight, GraduationCap,
  Download, Search, X, Folder, FolderPlus, ChevronDown,
} from 'lucide-react';

interface FlashcardsViewProps {
  flashcards: Flashcard[];
  onDeleteFlashcard: (id: string) => void;
  onRateFlashcard: (id: string, rating: SrsRating) => void;
  onMoveToFolder: (id: string, folder: string | null) => void;
}

const ALL_LABEL = 'All';
const ALL_LANGUAGES = [ALL_LABEL, ...LANGUAGE_CONFIG.map(l => l.name)];

const RATING_BUTTONS: { rating: SrsRating; label: string; style: string }[] = [
  { rating: 'again', label: 'Again', style: 'bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30' },
  { rating: 'hard',  label: 'Hard',  style: 'bg-orange-600/20 text-orange-400 border border-orange-600/30 hover:bg-orange-600/30' },
  { rating: 'good',  label: 'Good',  style: 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 hover:bg-indigo-600/30' },
  { rating: 'easy',  label: 'Easy',  style: 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 hover:bg-emerald-600/30' },
];

const faceStyle: React.CSSProperties = {
  WebkitBackfaceVisibility: 'hidden',
  backfaceVisibility: 'hidden',
};

const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  flashcards, onDeleteFlashcard, onRateFlashcard, onMoveToFolder,
}) => {
  const [currentIndex, setCurrentIndex]       = useState(0);
  const [isFlipped, setIsFlipped]             = useState(false);
  const [search, setSearch]                   = useState('');
  const [langFilter, setLangFilter]           = useState(ALL_LABEL);
  const [ratedIds, setRatedIds]               = useState<Set<string>>(new Set());
  const [activeFolder, setActiveFolder]       = useState<string | null>(null);
  const [showFolderMenu, setShowFolderMenu]   = useState(false);
  const [newFolderName, setNewFolderName]     = useState('');
  const [showNewFolderTab, setShowNewFolderTab] = useState(false);

  const newFolderInputRef = useRef<HTMLInputElement>(null);
  const folderMenuRef     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showFolderMenu) return;
    const close = (e: MouseEvent) => {
      if (folderMenuRef.current && !folderMenuRef.current.contains(e.target as Node))
        setShowFolderMenu(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showFolderMenu]);

  const folders = useMemo(() => {
    const names = new Set<string>();
    flashcards.forEach(c => { if (c.folder) names.add(c.folder); });
    return [...names].sort();
  }, [flashcards]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return flashcards.filter(card => {
      const matchSearch  = !q || card.original.toLowerCase().includes(q) || card.translated.toLowerCase().includes(q);
      const matchLang    = langFilter === ALL_LABEL || card.targetLang === langFilter || card.sourceLang === langFilter;
      const matchFolder  = activeFolder === null || card.folder === activeFolder;
      return matchSearch && matchLang && matchFolder;
    });
  }, [flashcards, search, langFilter, activeFolder]);

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
    const header = 'Original,Translated,Source Language,Target Language,Folder,Date';
    const rows = flashcards.map(c =>
      [`"${c.original.replace(/"/g, '""')}"`, `"${c.translated.replace(/"/g, '""')}"`,
       `"${c.sourceLang || 'Auto'}"`, `"${c.targetLang}"`, `"${c.folder || ''}"`,
       new Date(c.timestamp).toLocaleDateString()].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'translatesafe-flashcards.csv'; link.click();
    URL.revokeObjectURL(url);
  };

  const handleMoveToFolder = (folder: string | null) => {
    if (!currentCard) return;
    onMoveToFolder(currentCard.id, folder);
    setShowFolderMenu(false);
  };

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    if (currentCard) {
      onMoveToFolder(currentCard.id, name);
      setActiveFolder(name);
    }
    setNewFolderName('');
    setShowNewFolderTab(false);
  };

  const dueCount = flashcards.filter(c => c.nextReview <= Date.now()).length;

  if (flashcards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8">
        <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <GraduationCap className="w-12 h-12 text-slate-600" />
        </div>
        <h3 className="text-xl font-semibold text-slate-300 mb-2">No Flashcards Yet</h3>
        <p className="text-center max-w-md">Translate something and click "Save Flashcard" to build your deck.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center h-full max-w-4xl mx-auto p-4 md:p-6 gap-4">

      {/* Folder tab bar */}
      <div className="w-full flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        <button
          onClick={() => { setActiveFolder(null); resetIndex(); }}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeFolder === null
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
          }`}
        >
          All <span className="opacity-60">({flashcards.length})</span>
        </button>

        {folders.map(folder => (
          <button
            key={folder}
            onClick={() => { setActiveFolder(folder); resetIndex(); }}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeFolder === folder
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            {folder}
            <span className="opacity-60">({flashcards.filter(c => c.folder === folder).length})</span>
          </button>
        ))}

        {showNewFolderTab ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <input
              ref={newFolderInputRef}
              autoFocus
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') { setShowNewFolderTab(false); setNewFolderName(''); }
              }}
              placeholder="Folder name…"
              className="bg-slate-800 border border-indigo-500 rounded-lg px-2.5 py-1 text-sm text-slate-200 outline-none w-36"
            />
            <button
              onClick={handleCreateFolder}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => { setShowNewFolderTab(false); setNewFolderName(''); }}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewFolderTab(true)}
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 text-sm text-slate-500 hover:text-slate-300 border border-dashed border-slate-700 rounded-full transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" /> New
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="w-full flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); resetIndex(); }}
            placeholder="Search cards..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-indigo-500 transition-colors"
          />
          {search && (
            <button onClick={() => { setSearch(''); resetIndex(); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={langFilter}
          onChange={e => { setLangFilter(e.target.value); resetIndex(); }}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500 transition-colors"
        >
          {ALL_LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
        </select>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2.5 text-sm bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 rounded-xl transition-colors font-medium shrink-0"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Stats row */}
      <div className="w-full flex justify-between items-center px-1">
        <div className="text-slate-400 text-sm font-medium">
          {filtered.length === 0 ? 'No cards match' : `Card ${Math.min(currentIndex + 1, filtered.length)} of ${filtered.length}`}
        </div>
        <div className="flex items-center gap-3">
          {/* Folder assignment */}
          {currentCard && (
            <div className="relative" ref={folderMenuRef}>
              <button
                onClick={() => setShowFolderMenu(!showFolderMenu)}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Folder className="w-3.5 h-3.5 shrink-0" />
                <span className="max-w-[110px] truncate">{currentCard.folder || 'No folder'}</span>
                <ChevronDown className="w-3 h-3 shrink-0" />
              </button>
              {showFolderMenu && (
                <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 min-w-44 py-1 overflow-hidden">
                  {folders.map(f => (
                    <button
                      key={f}
                      onClick={() => handleMoveToFolder(f)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors flex items-center gap-2 ${currentCard.folder === f ? 'text-indigo-400' : 'text-slate-300'}`}
                    >
                      <Folder className="w-3.5 h-3.5 shrink-0" />
                      {f}
                      {currentCard.folder === f && <span className="ml-auto">✓</span>}
                    </button>
                  ))}
                  <button
                    onClick={() => { setShowFolderMenu(false); setShowNewFolderTab(true); setTimeout(() => newFolderInputRef.current?.focus(), 50); }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:bg-slate-700 transition-colors flex items-center gap-2"
                  >
                    <FolderPlus className="w-3.5 h-3.5" /> New folder…
                  </button>
                  {currentCard.folder && (
                    <>
                      <div className="border-t border-slate-700 my-1" />
                      <button
                        onClick={() => handleMoveToFolder(null)}
                        className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-slate-700 transition-colors flex items-center gap-2"
                      >
                        <X className="w-3.5 h-3.5" /> Remove from folder
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {dueCount > 0 && (
            <span className="text-xs bg-amber-900/30 text-amber-400 border border-amber-700/30 px-2 py-1 rounded-full">
              {dueCount} due for review
            </span>
          )}
          <button
            onClick={handleDelete}
            disabled={!currentCard}
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
          {/* Card */}
          <div className="relative w-full max-w-2xl aspect-[3/2]" style={{ perspective: '1000px' }}>
            <div
              className={`relative w-full h-full cursor-pointer transition-transform duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
              style={{ willChange: 'transform' }}
              onClick={() => setIsFlipped(!isFlipped)}
            >
              {/* Front */}
              <div
                className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl shadow-xl border border-slate-600 flex flex-col items-center justify-center p-8 text-center"
                style={faceStyle}
              >
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4 bg-indigo-900/30 px-3 py-1 rounded-full border border-indigo-500/20">
                  Original
                </span>
                <p className="text-3xl md:text-4xl font-bold text-slate-100 leading-tight">
                  {currentCard.original}
                </p>
                {currentCard.nextReview > 0 && (
                  <p className="mt-6 text-xs text-slate-500">
                    Next review: {currentCard.nextReview <= Date.now() ? 'Due now' : new Date(currentCard.nextReview).toLocaleDateString()}
                  </p>
                )}
                <p className="mt-4 text-slate-500 text-sm">Click to flip</p>
              </div>

              {/* Back */}
              <div
                className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-slate-800 rounded-2xl shadow-xl border border-indigo-500/30 flex flex-col items-center justify-center p-8 text-center [transform:rotateY(180deg)]"
                style={faceStyle}
              >
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4 bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-500/20">
                  {currentCard.targetLang}
                </span>
                <p className="text-3xl md:text-4xl font-bold text-white leading-tight">
                  {currentCard.translated}
                </p>
                <p className="mt-6 text-indigo-300/50 text-sm">Rate your recall below</p>
              </div>
            </div>
          </div>

          {/* Controls */}
          {isFlipped ? (
            <div className="flex flex-col items-center gap-3 w-full max-w-2xl">
              <p className="text-xs text-slate-500 uppercase tracking-wider">How well did you remember?</p>
              <div className="grid grid-cols-4 gap-3 w-full">
                {RATING_BUTTONS.map(({ rating, label, style }) => (
                  <button key={rating} onClick={() => handleRate(rating)} className={`py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${style}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex gap-6 items-center">
              <button onClick={handlePrev} className="p-4 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 text-slate-200 transition-all shadow-lg active:scale-95">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button onClick={() => setIsFlipped(true)} className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-semibold shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
                <RotateCw className="w-5 h-5" /> Flip Card
              </button>
              <button onClick={handleNext} className="p-4 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 text-slate-200 transition-all shadow-lg active:scale-95">
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FlashcardsView;
