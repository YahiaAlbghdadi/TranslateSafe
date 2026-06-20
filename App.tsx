import React, { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AppTab, type Flashcard, type HistoryEntry, type SrsRating } from './types';
import type { Profile } from './types/database';
import { LOCAL_STORAGE_KEY } from './constants';
import { validateApiKey } from './services/geminiService';
import { supabase } from './services/supabaseClient';
import TranslationView from './components/TranslationView';
import FlashcardsView from './components/FlashcardsView';
import HistoryView from './components/HistoryView';
import AuthView from './components/AuthView';
import TeacherView from './components/teacher/TeacherView';
import StudentView from './components/student/StudentView';
import { Library, Globe2, AlertTriangle, Clock, LogOut, School, GraduationCap, Puzzle } from 'lucide-react';
import ExtensionView from './components/ExtensionView';

// Map Supabase snake_case rows → TS camelCase interfaces
const toFlashcard = (row: any): Flashcard => ({
  id: row.id,
  original: row.original,
  translated: row.translated,
  sourceLang: row.source_lang ?? undefined,
  targetLang: row.target_lang,
  timestamp: row.timestamp,
  folder: row.folder ?? null,
  setName: row.set_name ?? null,
  easiness: row.easiness ?? 2.5,
  interval: row.interval ?? 0,
  repetitions: row.repetitions ?? 0,
  nextReview: row.next_review ?? 0,
});

const toHistoryEntry = (row: any): HistoryEntry => ({
  id: row.id,
  original: row.original,
  translated: row.translated,
  sourceLang: row.source_lang ?? undefined,
  targetLang: row.target_lang,
  timestamp: row.timestamp,
});

const App: React.FC = () => {
  const [session, setSession]     = useState<Session | null>(null);
  const [profile, setProfile]     = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.TRANSLATE);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState('English');

  // @ts-ignore
  const envApiKey = process.env.API_KEY;

  // Auth: get initial session and subscribe to changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // USER_UPDATED fires when we call supabase.auth.updateUser() (e.g. persisting targetLang).
      // Ignoring it prevents the session useEffect from re-running and resetting the active tab.
      if (event === 'USER_UPDATED') return;
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) {
      setProfile(data);
      // Land teachers on their dashboard, students on assignments
      setActiveTab(data.role === 'teacher' ? AppTab.TEACHER : AppTab.STUDENT);
    }
  };

  // Handle flashcard save arriving from the bookmarklet via ?ts_save= URL param
  useEffect(() => {
    if (!session) return;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('ts_save');
    if (!raw) return;
    try {
      const card = JSON.parse(decodeURIComponent(raw));
      saveFlashcard(card);
    } catch { /* malformed param — ignore */ }
    window.history.replaceState({}, '', window.location.pathname);
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load data whenever session changes (login/logout)
  useEffect(() => {
    if (!session) {
      setFlashcards([]);
      setHistory([]);
      setProfile(null);
      return;
    }

    setHasApiKey(validateApiKey());

    // Restore target language from user metadata
    const savedLang = session.user.user_metadata?.targetLang;
    if (savedLang) setTargetLang(savedLang);

    loadProfile(session.user.id);
    loadCards(session.user.id);
    loadHistory();

    // Extension sync events
    const handleExternalUpdate = () => {
      loadCards(session.user.id);
      showNotification('Flashcards synced from Extension!');
    };
    const handleConfigUpdate = (e: CustomEvent) => {
      if (e.detail?.targetLang) setTargetLang(e.detail.targetLang);
    };
    const handleExtensionSave = (e: CustomEvent) => {
      if (e.detail) saveFlashcard(e.detail);
    };

    // Reload cards when the user switches back from the bookmarklet tab
    const handleFocus = () => loadCards(session.user.id);

    // BroadcastChannel: receives saves from the invisible popup (bookmarklet CSP fallback)
    const bc = new BroadcastChannel('ts-save');
    bc.onmessage = (e) => {
      if (e.data?.type === 'save' && e.data?.card) saveFlashcard(e.data.card);
    };

    window.addEventListener('lingua-gemini-update', handleExternalUpdate);
    window.addEventListener('lingua-gemini-config-update', handleConfigUpdate as EventListener);
    window.addEventListener('lingua-gemini-save-flashcard', handleExtensionSave as EventListener);
    window.addEventListener('focus', handleFocus);

    return () => {
      bc.close();
      window.removeEventListener('lingua-gemini-update', handleExternalUpdate);
      window.removeEventListener('lingua-gemini-config-update', handleConfigUpdate as EventListener);
      window.removeEventListener('lingua-gemini-save-flashcard', handleExtensionSave as EventListener);
      window.removeEventListener('focus', handleFocus);
    };
  }, [session]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSetTargetLang = (lang: string) => {
    setTargetLang(lang);
    // Persist to user profile so it restores on any device
    supabase.auth.updateUser({ data: { targetLang: lang } });
  };

  const loadCards = async (userId: string) => {
    // Migrate legacy localStorage cards first
    const legacyKeys = [LOCAL_STORAGE_KEY, 'lingua_gemini_flashcards'];
    for (const key of legacyKeys) {
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const localCards: Flashcard[] = JSON.parse(saved);
          if (localCards.length > 0) {
            const rows = localCards.map(c => ({
              id: c.id,
              user_id: userId,
              original: c.original,
              translated: c.translated,
              source_lang: c.sourceLang ?? null,
              target_lang: c.targetLang,
              timestamp: c.timestamp,
              easiness: c.easiness ?? 2.5,
              interval: c.interval ?? 0,
              repetitions: c.repetitions ?? 0,
              next_review: c.nextReview ?? 0,
            }));
            await supabase.from('flashcards').upsert(rows, { onConflict: 'id' });
            localStorage.removeItem(key);
          }
        } catch (e) {
          console.error('Migration error:', e);
        }
      }
    }

    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .order('timestamp', { ascending: false });

    if (!error && data) setFlashcards(data.map(toFlashcard));
  };

  const loadHistory = async () => {
    const { data, error } = await supabase
      .from('history')
      .select('*')
      .order('timestamp', { ascending: false });

    if (!error && data) setHistory(data.map(toHistoryEntry));
  };

  const saveFlashcard = async (
    cardData: Omit<Flashcard, 'id' | 'timestamp' | 'easiness' | 'interval' | 'repetitions' | 'nextReview'>
  ) => {
    if (!session) return;
    const newCard: Flashcard = {
      ...cardData,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      easiness: 2.5,
      interval: 0,
      repetitions: 0,
      nextReview: 0,
    };

    setFlashcards(prev => [newCard, ...prev]);

    const { error } = await supabase.from('flashcards').insert({
      id: newCard.id,
      user_id: session.user.id,
      original: newCard.original,
      translated: newCard.translated,
      source_lang: newCard.sourceLang ?? null,
      target_lang: newCard.targetLang,
      timestamp: newCard.timestamp,
      easiness: 2.5,
      interval: 0,
      repetitions: 0,
      next_review: 0,
    });

    if (error) {
      console.error('Failed to save flashcard:', error);
      setFlashcards(prev => prev.filter(c => c.id !== newCard.id));
    }
  };

  const deleteFlashcard = async (id: string) => {
    setFlashcards(prev => prev.filter(c => c.id !== id));
    await supabase.from('flashcards').delete().eq('id', id);
  };

  const assignFlashcard = async (id: string, folder: string | null, setName: string | null) => {
    const prev = flashcards.find(c => c.id === id);
    setFlashcards(cards => cards.map(c => c.id === id ? { ...c, folder, setName } : c));
    const { error } = await supabase.from('flashcards').update({ folder, set_name: setName }).eq('id', id);
    if (error) {
      setFlashcards(cards => cards.map(c => c.id === id ? { ...c, folder: prev?.folder ?? null, setName: prev?.setName ?? null } : c));
      showNotification('Column missing — run in Supabase SQL editor: ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS folder text DEFAULT NULL; ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS set_name text DEFAULT NULL;');
    }
  };

  const clearFolder = async (folder: string) => {
    setFlashcards(cards => cards.map(c => c.folder === folder ? { ...c, folder: null, setName: null } : c));
    await supabase.from('flashcards').update({ folder: null, set_name: null }).eq('folder', folder);
  };

  const clearSet = async (folder: string, setName: string) => {
    setFlashcards(cards => cards.map(c => c.folder === folder && c.setName === setName ? { ...c, setName: null } : c));
    await supabase.from('flashcards').update({ set_name: null }).eq('folder', folder).eq('set_name', setName);
  };

  const rateFlashcard = async (id: string, rating: SrsRating) => {
    const card = flashcards.find(c => c.id === id);
    if (!card) return;

    const quality: Record<SrsRating, number> = { again: 0, hard: 2, good: 4, easy: 5 };
    const q = quality[rating];
    const newEasiness = Math.max(1.3, card.easiness + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    let newInterval: number;
    let newRepetitions: number;

    if (q < 3) {
      newInterval = 1;
      newRepetitions = 0;
    } else {
      if (card.repetitions === 0) newInterval = 1;
      else if (card.repetitions === 1) newInterval = 6;
      else newInterval = Math.round(card.interval * card.easiness);
      newRepetitions = card.repetitions + 1;
    }
    const nextReview = Date.now() + newInterval * 86_400_000;

    setFlashcards(prev =>
      prev.map(c =>
        c.id === id
          ? { ...c, easiness: newEasiness, interval: newInterval, repetitions: newRepetitions, nextReview }
          : c
      )
    );

    await supabase.from('flashcards').update({
      easiness: newEasiness,
      interval: newInterval,
      repetitions: newRepetitions,
      next_review: nextReview,
    }).eq('id', id);
  };

  const saveHistoryEntry = async (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    if (!session) return;
    const newEntry: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    setHistory(prev => [newEntry, ...prev]);

    await supabase.from('history').insert({
      id: newEntry.id,
      user_id: session.user.id,
      original: newEntry.original,
      translated: newEntry.translated,
      source_lang: newEntry.sourceLang ?? null,
      target_lang: newEntry.targetLang,
      timestamp: newEntry.timestamp,
    });
  };

  const deleteHistoryEntry = async (id: string) => {
    setHistory(prev => prev.filter(e => e.id !== id));
    await supabase.from('history').delete().eq('id', id);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show login screen when not authenticated
  if (!session) {
    return <AuthView />;
  }

  const TABS = [
    { tab: AppTab.TRANSLATE,  label: 'Translate',  icon: <Globe2         className="w-4 h-4" /> },
    { tab: AppTab.FLASHCARDS, label: 'Flashcards', icon: <Library        className="w-4 h-4" />, badge: flashcards.length },
    { tab: AppTab.HISTORY,    label: 'History',    icon: <Clock          className="w-4 h-4" />, badge: history.length },
    { tab: AppTab.EXTENSION,  label: 'Browser',    icon: <Puzzle         className="w-4 h-4" /> },
    ...(profile?.role === 'teacher'
      ? [{ tab: AppTab.TEACHER,  label: 'Teaching',  icon: <School        className="w-4 h-4" /> }]
      : []),
    ...(profile?.role === 'student'
      ? [{ tab: AppTab.STUDENT,  label: 'Learning',  icon: <GraduationCap className="w-4 h-4" /> }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">

      {hasApiKey && (
        <div
          id="lingua-gemini-bridge"
          data-api-key={envApiKey}
          data-target-lang={targetLang}
          style={{ display: 'none' }}
          aria-hidden="true"
        />
      )}

      <div className="w-full min-h-screen flex flex-col bg-slate-900">

        <header className="flex flex-col border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
          {!hasApiKey && (
            <div className="bg-red-500/10 border-b border-red-500/20 p-2 text-center text-xs md:text-sm text-red-400 flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Gemini API key missing. Set <code>API_KEY</code> in a local <b>.env</b> file, or as an environment variable in your hosting provider's project settings, then rebuild/redeploy.</span>
            </div>
          )}
          {notification && (
            <div className="bg-emerald-500/10 border-b border-emerald-500/20 p-2 text-center text-sm text-emerald-400 animate-in fade-in slide-in-from-top-2">
              {notification}
            </div>
          )}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="TranslateSafe" className="w-10 h-10 object-contain" />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 leading-none">
                  TranslateSafe
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">{session.user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-slate-800/80 p-1 rounded-xl overflow-x-auto">
                {TABS.map(({ tab, label, icon, badge }) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                      activeTab === tab
                        ? 'bg-slate-700 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {icon}
                    {label}
                    {badge !== undefined && badge > 0 && (
                      <span className="ml-1 bg-slate-900 text-slate-400 text-xs px-2 py-0.5 rounded-full border border-slate-700">
                        {badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={handleSignOut}
                title="Sign out"
                className="p-2.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative">
          {activeTab === AppTab.TRANSLATE && (
            <TranslationView
              onSaveFlashcard={saveFlashcard}
              onSaveHistory={saveHistoryEntry}
              targetLang={targetLang}
              setTargetLang={handleSetTargetLang}
            />
          )}
          {activeTab === AppTab.FLASHCARDS && (
            <FlashcardsView
              flashcards={flashcards}
              onDeleteFlashcard={deleteFlashcard}
              onRateFlashcard={rateFlashcard}
              onAssignCard={assignFlashcard}
              onClearFolder={clearFolder}
              onClearSet={clearSet}
            />
          )}
          {activeTab === AppTab.HISTORY && (
            <HistoryView
              history={history}
              onDeleteEntry={deleteHistoryEntry}
              onSaveAsFlashcard={saveFlashcard}
            />
          )}
          {activeTab === AppTab.EXTENSION && (
            <ExtensionView
              apiKey={envApiKey || ''}
              targetLang={targetLang}
              accessToken={session?.access_token ?? ''}
              userId={session?.user.id ?? ''}
            />
          )}
          {activeTab === AppTab.TEACHER && session && (
            <TeacherView userId={session.user.id} />
          )}
          {activeTab === AppTab.STUDENT && session && (
            <StudentView userId={session.user.id} />
          )}
        </main>
      </div>

      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-3xl opacity-50" />
      </div>
    </div>
  );
};

export default App;
