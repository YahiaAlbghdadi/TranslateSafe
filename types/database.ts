// ============================================================
// Supabase Database type — pass to createClient<Database>()
// Keep in sync with supabase/migrations/
// ============================================================

// ------ enums -----------------------------------------------

export type UserRole       = 'teacher' | 'student';
export type ExerciseType   = 'fill_gap' | 'multiple_choice' | 'matching';

// ------ JSONB payloads --------------------------------------

export interface AnswerRecord {
  question_id: string;
  given:        string;
  correct:      string;
  ok:           boolean;
}

// ============================================================
// Database shape (compatible with createClient<Database>)
// ============================================================

export interface Database {
  public: {
    Tables: {

      flashcards: {
        Row: {
          id:          string;
          user_id:     string;
          original:    string;
          translated:  string;
          source_lang: string | null;
          target_lang: string;
          timestamp:   number;
          easiness:    number;
          interval:    number;
          repetitions: number;
          next_review: number;
        };
        Insert: {
          id:           string;
          user_id:      string;
          original:     string;
          translated:   string;
          source_lang?: string | null;
          target_lang:  string;
          timestamp:    number;
          easiness?:    number;
          interval?:    number;
          repetitions?: number;
          next_review?: number;
        };
        Update: {
          id?:          string;
          user_id?:     string;
          original?:    string;
          translated?:  string;
          source_lang?: string | null;
          target_lang?: string;
          timestamp?:   number;
          easiness?:    number;
          interval?:    number;
          repetitions?: number;
          next_review?: number;
        };
        Relationships: [];
      };

      history: {
        Row: {
          id:          string;
          user_id:     string;
          original:    string;
          translated:  string;
          source_lang: string | null;
          target_lang: string;
          timestamp:   number;
        };
        Insert: {
          id:           string;
          user_id:      string;
          original:     string;
          translated:   string;
          source_lang?: string | null;
          target_lang:  string;
          timestamp:    number;
        };
        Update: {
          id?:          string;
          user_id?:     string;
          original?:    string;
          translated?:  string;
          source_lang?: string | null;
          target_lang?: string;
          timestamp?:   number;
        };
        Relationships: [];
      };

      profiles: {
        Row: {
          id:           string;
          role:         UserRole | null;
          display_name: string | null;
          created_at:   string;
        };
        Insert: {
          id:           string;
          role?:        UserRole | null;
          display_name?: string | null;
          created_at?:  string;
        };
        Update: {
          id?:          string;
          role?:        UserRole | null;
          display_name?: string | null;
          created_at?:  string;
        };
        Relationships: [];
      };

      classes: {
        Row: {
          id:          string;
          teacher_id:  string;
          name:        string;
          invite_code: string;
          created_at:  string;
        };
        Insert: {
          id?:         string;
          teacher_id:  string;
          name:        string;
          invite_code?: string;
          created_at?: string;
        };
        Update: {
          id?:          string;
          teacher_id?:  string;
          name?:        string;
          invite_code?: string;
          created_at?:  string;
        };
        Relationships: [];
      };

      class_memberships: {
        Row: {
          id:         string;
          class_id:   string;
          student_id: string;
          joined_at:  string;
        };
        Insert: {
          id?:        string;
          class_id:   string;
          student_id: string;
          joined_at?: string;
        };
        Update: {
          id?:         string;
          class_id?:   string;
          student_id?: string;
          joined_at?:  string;
        };
        Relationships: [];
      };

      flashcard_sets: {
        Row: {
          id:          string;
          teacher_id:  string;
          title:       string;
          description: string | null;
          created_at:  string;
        };
        Insert: {
          id?:          string;
          teacher_id:   string;
          title:        string;
          description?: string | null;
          created_at?:  string;
        };
        Update: {
          id?:          string;
          teacher_id?:  string;
          title?:       string;
          description?: string | null;
          created_at?:  string;
        };
        Relationships: [];
      };

      flashcard_set_items: {
        Row: {
          id:          string;
          set_id:      string;
          word:        string;
          translation: string;
          position:    number;
        };
        Insert: {
          id?:         string;
          set_id:      string;
          word:        string;
          translation: string;
          position?:   number;
        };
        Update: {
          id?:          string;
          set_id?:      string;
          word?:        string;
          translation?: string;
          position?:    number;
        };
        Relationships: [];
      };

      exercises: {
        Row: {
          id:         string;
          set_id:     string;
          teacher_id: string;
          title:      string;
          type:       ExerciseType;
          created_at: string;
        };
        Insert: {
          id?:        string;
          set_id:     string;
          teacher_id: string;
          title:      string;
          type:       ExerciseType;
          created_at?: string;
        };
        Update: {
          id?:         string;
          set_id?:     string;
          teacher_id?: string;
          title?:      string;
          type?:       ExerciseType;
          created_at?: string;
        };
        Relationships: [];
      };

      exercise_questions: {
        Row: {
          id:             string;
          exercise_id:    string;
          position:       number;
          sentence:       string;
          correct_answer: string;
          options:        string[] | null;
        };
        Insert: {
          id?:             string;
          exercise_id:     string;
          position?:       number;
          sentence:        string;
          correct_answer:  string;
          options?:        string[] | null;
        };
        Update: {
          id?:             string;
          exercise_id?:    string;
          position?:       number;
          sentence?:       string;
          correct_answer?: string;
          options?:        string[] | null;
        };
        Relationships: [];
      };

      assignments: {
        Row: {
          id:               string;
          class_id:         string;
          assigned_by:      string;
          flashcard_set_id: string | null;
          exercise_id:      string | null;
          due_date:         string | null;
          assigned_at:      string;
        };
        Insert: {
          id?:               string;
          class_id:          string;
          assigned_by:       string;
          flashcard_set_id?: string | null;
          exercise_id?:      string | null;
          due_date?:         string | null;
          assigned_at?:      string;
        };
        Update: {
          id?:               string;
          class_id?:         string;
          assigned_by?:      string;
          flashcard_set_id?: string | null;
          exercise_id?:      string | null;
          due_date?:         string | null;
          assigned_at?:      string;
        };
        Relationships: [];
      };

      student_results: {
        Row: {
          id:           string;
          student_id:   string;
          exercise_id:  string;
          score:        number;
          total:        number;
          answers:      AnswerRecord[] | null;
          completed_at: string;
        };
        Insert: {
          id?:           string;
          student_id:    string;
          exercise_id:   string;
          score:         number;
          total:         number;
          answers?:      AnswerRecord[] | null;
          completed_at?: string;
        };
        Update: {
          id?:           string;
          student_id?:   string;
          exercise_id?:  string;
          score?:        number;
          total?:        number;
          answers?:      AnswerRecord[] | null;
          completed_at?: string;
        };
        Relationships: [];
      };

      student_set_progress: {
        Row: {
          id:                     string;
          student_id:             string;
          flashcard_set_item_id:  string;
          ease_factor:            number;
          interval_days:          number;
          due_date:               string;
          last_reviewed:          string | null;
        };
        Insert: {
          id?:                     string;
          student_id:              string;
          flashcard_set_item_id:   string;
          ease_factor?:            number;
          interval_days?:          number;
          due_date?:               string;
          last_reviewed?:          string | null;
        };
        Update: {
          id?:                     string;
          student_id?:             string;
          flashcard_set_item_id?:  string;
          ease_factor?:            number;
          interval_days?:          number;
          due_date?:               string;
          last_reviewed?:          string | null;
        };
        Relationships: [];
      };

    };

    Views: {
      [_ in never]: never;
    };

    Functions: {
      is_class_teacher: {
        Args:    { p_class_id: string };
        Returns: boolean;
      };
      is_class_member: {
        Args:    { p_class_id: string };
        Returns: boolean;
      };
      join_class_by_invite_code: {
        Args:    { p_invite_code: string };
        Returns: void;
      };
    };
  };
}

// ============================================================
// Row aliases  — use these throughout the app
// ============================================================

type Tables = Database['public']['Tables'];

export type Profile            = Tables['profiles']['Row'];
export type Class              = Tables['classes']['Row'];
export type ClassMembership    = Tables['class_memberships']['Row'];
export type FlashcardSet       = Tables['flashcard_sets']['Row'];
export type FlashcardSetItem   = Tables['flashcard_set_items']['Row'];
export type Exercise           = Tables['exercises']['Row'];
export type ExerciseQuestion   = Tables['exercise_questions']['Row'];
export type Assignment         = Tables['assignments']['Row'];
export type StudentResult      = Tables['student_results']['Row'];
export type StudentSetProgress = Tables['student_set_progress']['Row'];

// Insert aliases
export type InsertProfile            = Tables['profiles']['Insert'];
export type InsertClass              = Tables['classes']['Insert'];
export type InsertClassMembership    = Tables['class_memberships']['Insert'];
export type InsertFlashcardSet       = Tables['flashcard_sets']['Insert'];
export type InsertFlashcardSetItem   = Tables['flashcard_set_items']['Insert'];
export type InsertExercise           = Tables['exercises']['Insert'];
export type InsertExerciseQuestion   = Tables['exercise_questions']['Insert'];
export type InsertAssignment         = Tables['assignments']['Insert'];
export type InsertStudentResult      = Tables['student_results']['Insert'];
export type InsertStudentSetProgress = Tables['student_set_progress']['Insert'];

// Update aliases
export type UpdateFlashcardSet       = Tables['flashcard_sets']['Update'];
export type UpdateFlashcardSetItem   = Tables['flashcard_set_items']['Update'];
export type UpdateExercise           = Tables['exercises']['Update'];
export type UpdateExerciseQuestion   = Tables['exercise_questions']['Update'];
export type UpdateAssignment         = Tables['assignments']['Update'];
export type UpdateStudentSetProgress = Tables['student_set_progress']['Update'];

// ============================================================
// Composed types — rows with their related data joined
// ============================================================

export type ClassWithMemberships = Class & {
  class_memberships: ClassMembership[];
};

export type FlashcardSetWithItems = FlashcardSet & {
  flashcard_set_items: FlashcardSetItem[];
};

export type ExerciseWithQuestions = Exercise & {
  exercise_questions: ExerciseQuestion[];
};

export type AssignmentWithContent = Assignment & {
  flashcard_sets: FlashcardSet | null;
  exercises:      Exercise     | null;
};

export type StudentResultWithExercise = StudentResult & {
  exercises: Exercise;
};

export type FlashcardSetItemWithProgress = FlashcardSetItem & {
  progress: StudentSetProgress | null;
};
