
export enum AppTab {
  TRANSLATE = 'TRANSLATE',
  FLASHCARDS = 'FLASHCARDS',
  HISTORY = 'HISTORY',
  EXTENSION = 'EXTENSION',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
}

export interface Flashcard {
  id: string;
  original: string;
  translated: string;
  sourceLang?: string;
  targetLang: string;
  timestamp: number;
  // SM-2 spaced repetition fields
  easiness: number;
  interval: number;
  repetitions: number;
  nextReview: number;
}

export interface HistoryEntry {
  id: string;
  original: string;
  translated: string;
  sourceLang?: string;
  targetLang: string;
  timestamp: number;
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  detectedSourceLanguage?: string;
}

export enum TranslationMode {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VOICE = 'VOICE',
}

export type SrsRating = 'again' | 'hard' | 'good' | 'easy';
