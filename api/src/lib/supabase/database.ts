export type StudySpace = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MaterialStatus =
  | "created"
  | "uploaded"
  | "processing"
  | "ready"
  | "upload_failed"
  | "error";

export type Material = {
  id: string;
  user_id: string;
  study_space_id: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  status: MaterialStatus;
  ingestion_error: string | null;
  ingested_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MaterialChunk = {
  id: string;
  material_id: string;
  user_id: string;
  study_space_id: string;
  chunk_index: number;
  content: string;
  page_number: number | null;
  start_seconds: number | null;
  end_seconds: number | null;
  embedding: number[] | null;
  created_at: string;
};

export type Citation = {
  chunkId: string;
  materialId: string;
  materialName: string;
  label: string;
  quote: string;
  pageNumber: number | null;
  startSeconds: number | null;
  endSeconds: number | null;
};

export type ChatSession = {
  id: string;
  user_id: string;
  study_space_id: string;
  title: string;
  locale: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  session_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  created_at: string;
};

export type StudyArtifactKind =
  | "video_quiz"
  | "video_create"
  | "video_engage";

export type LearningFeedKind =
  | "meme"
  | "quiz"
  | "flashcard"
  | "fill_blank"
  | "true_false"
  | "did_you_know";

export type ArtifactKind = StudyArtifactKind | LearningFeedKind;

export type LearningAtom = {
  id: string;
  user_id: string;
  study_space_id: string;
  material_id: string;
  concept: string;
  tension: Json;
  emotional_shape: "dilemma" | "preference" | "betrayal" | "irony" | "escalation";
  created_at: string;
};

export type StudyArtifact = {
  id: string;
  user_id: string;
  study_space_id: string;
  atom_id: string | null;
  material_id: string | null;
  asset_path: string | null;
  generation_key: string | null;
  kind: ArtifactKind;
  title: string;
  payload: Json;
  created_at: string;
};

export type StudyAttempt = {
  id: string;
  user_id: string;
  artifact_id: string;
  score: number;
  answers: Json;
  created_at: string;
};

export type LearningProgress = {
  id: string;
  user_id: string;
  study_space_id: string;
  artifact_id: string;
  item_type: ArtifactKind;
  completed_at: string | null;
  last_score: number | null;
};

export type UserActivityEvent = {
  id: string;
  user_id: string;
  event_type: string;
  metadata: Json;
  local_date: string;
  xp_awarded: number;
  occurred_at: string;
};

export type UserGamification = {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_qualifying_date: string | null;
  total_xp: number;
  daily_goal: number;
  coach_tour_completed: Json;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          preferred_locale: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          preferred_locale?: string | null;
        };
        Update: {
          display_name?: string | null;
          preferred_locale?: string | null;
        };
        Relationships: [];
      };
      study_spaces: {
        Row: StudySpace;
        Insert: {
          user_id: string;
          name: string;
          description?: string | null;
        };
        Update: {
          name?: string;
          description?: string | null;
        };
        Relationships: [];
      };
      materials: {
        Row: Material;
        Insert: {
          id?: string;
          user_id: string;
          study_space_id: string;
          name: string;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          status?: MaterialStatus;
          ingestion_error?: string | null;
          ingested_at?: string | null;
        };
        Update: {
          status?: MaterialStatus;
          ingestion_error?: string | null;
          ingested_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      material_chunks: {
        Row: MaterialChunk;
        Insert: {
          material_id: string;
          user_id: string;
          study_space_id: string;
          chunk_index: number;
          content: string;
          page_number?: number | null;
          start_seconds?: number | null;
          end_seconds?: number | null;
          embedding: number[];
        };
        Update: never;
        Relationships: [];
      };
      learning_atoms: {
        Row: LearningAtom;
        Insert: {
          user_id: string;
          study_space_id: string;
          material_id: string;
          concept: string;
          tension: Json;
          emotional_shape: LearningAtom["emotional_shape"];
        };
        Update: {
          concept?: string;
          tension?: Json;
          emotional_shape?: LearningAtom["emotional_shape"];
        };
        Relationships: [];
      };
      chat_sessions: {
        Row: ChatSession;
        Insert: {
          user_id: string;
          study_space_id: string;
          title?: string;
          locale?: string | null;
        };
        Update: {
          title?: string;
          locale?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: {
          session_id: string;
          user_id: string;
          role: "user" | "assistant";
          content: string;
          citations?: Citation[];
        };
        Update: never;
        Relationships: [];
      };
      study_artifacts: {
        Row: StudyArtifact;
        Insert: {
          user_id: string;
          study_space_id: string;
          atom_id?: string | null;
          material_id?: string | null;
          asset_path?: string | null;
          generation_key?: string | null;
          kind: ArtifactKind;
          title: string;
          payload: Json;
        };
        Update: {
          atom_id?: string | null;
          material_id?: string | null;
          asset_path?: string | null;
          generation_key?: string | null;
          kind?: ArtifactKind;
          title?: string;
          payload?: Json;
        };
        Relationships: [];
      };
      study_attempts: {
        Row: StudyAttempt;
        Insert: {
          user_id: string;
          artifact_id: string;
          score: number;
          answers: Json;
        };
        Update: never;
        Relationships: [];
      };
      learning_progress: {
        Row: LearningProgress;
        Insert: {
          user_id: string;
          study_space_id: string;
          artifact_id: string;
          item_type: ArtifactKind;
          completed_at?: string | null;
          last_score?: number | null;
        };
        Update: {
          completed_at?: string | null;
          last_score?: number | null;
        };
        Relationships: [];
      };
      user_activity_events: {
        Row: UserActivityEvent;
        Insert: {
          user_id: string;
          event_type: string;
          metadata?: Json;
          local_date: string;
          xp_awarded?: number;
          occurred_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      user_gamification: {
        Row: UserGamification;
        Insert: {
          user_id: string;
          current_streak?: number;
          longest_streak?: number;
          last_qualifying_date?: string | null;
          total_xp?: number;
          daily_goal?: number;
          coach_tour_completed?: Json;
        };
        Update: {
          current_streak?: number;
          longest_streak?: number;
          last_qualifying_date?: string | null;
          total_xp?: number;
          daily_goal?: number;
          coach_tour_completed?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      match_material_chunks: {
        Args: {
          query_embedding: number[];
          match_user_id: string;
          match_study_space_id: string;
          match_count?: number;
        };
        Returns: Array<{
          id: string;
          material_id: string;
          material_name: string;
          content: string;
          page_number: number | null;
          start_seconds: number | null;
          end_seconds: number | null;
          similarity: number;
        }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
