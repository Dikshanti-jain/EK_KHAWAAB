export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      private_user_vault: {
        Row: {
          id: string;
          auth_user_id: string;
          real_full_name: string;
          email: string;
          phone_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          real_full_name: string;
          email: string;
          phone_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string;
          real_full_name?: string;
          email?: string;
          phone_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      public_shayars: {
        Row: {
          id: string;
          auth_user_id: string;
          shayar_uid: string;
          takhallus: string;
          takhallus_meaning: string | null;
          vibe_category: string | null;
          avatar_color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          shayar_uid: string;
          takhallus: string;
          takhallus_meaning?: string | null;
          vibe_category?: string | null;
          avatar_color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string;
          shayar_uid?: string;
          takhallus?: string;
          takhallus_meaning?: string | null;
          vibe_category?: string | null;
          avatar_color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      poems: {
        Row: {
          id: string;
          shayar_uid: string;
          hinglish_text: string;
          hindi_text: string;
          urdu_text: string;
          english_translation: string | null;
          mood_tag: string;
          format_type: string;
          seed_words: string[] | null;
          is_gumnaam: boolean;
          daad_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shayar_uid: string;
          hinglish_text: string;
          hindi_text?: string;
          urdu_text?: string;
          english_translation?: string | null;
          mood_tag?: string;
          format_type?: string;
          seed_words?: string[] | null;
          is_gumnaam?: boolean;
          daad_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shayar_uid?: string;
          hinglish_text?: string;
          hindi_text?: string;
          urdu_text?: string;
          english_translation?: string | null;
          mood_tag?: string;
          format_type?: string;
          seed_words?: string[] | null;
          is_gumnaam?: boolean;
          daad_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "poems_shayar_uid_fkey";
            columns: ["shayar_uid"];
            isOneToOne: false;
            referencedRelation: "public_shayars";
            referencedColumns: ["shayar_uid"];
          }
        ];
      };
      poem_likes: {
        Row: {
          id: string;
          poem_id: string;
          shayar_uid: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          poem_id: string;
          shayar_uid: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          poem_id?: string;
          shayar_uid?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "poem_likes_poem_id_fkey";
            columns: ["poem_id"];
            isOneToOne: false;
            referencedRelation: "poems";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "poem_likes_shayar_uid_fkey";
            columns: ["shayar_uid"];
            isOneToOne: false;
            referencedRelation: "public_shayars";
            referencedColumns: ["shayar_uid"];
          }
        ];
      };
      bookmarks: {
        Row: {
          id: string;
          poem_id: string;
          shayar_uid: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          poem_id: string;
          shayar_uid: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          poem_id?: string;
          shayar_uid?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookmarks_poem_id_fkey";
            columns: ["poem_id"];
            isOneToOne: false;
            referencedRelation: "poems";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookmarks_shayar_uid_fkey";
            columns: ["shayar_uid"];
            isOneToOne: false;
            referencedRelation: "public_shayars";
            referencedColumns: ["shayar_uid"];
          }
        ];
      };
      comments: {
        Row: {
          id: string;
          poem_id: string;
          shayar_uid: string;
          comment_text: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          poem_id: string;
          shayar_uid: string;
          comment_text: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          poem_id?: string;
          shayar_uid?: string;
          comment_text?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_poem_id_fkey";
            columns: ["poem_id"];
            isOneToOne: false;
            referencedRelation: "poems";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_shayar_uid_fkey";
            columns: ["shayar_uid"];
            isOneToOne: false;
            referencedRelation: "public_shayars";
            referencedColumns: ["shayar_uid"];
          }
        ];
      };
      secret_khats: {
        Row: {
          id: string;
          sender_uid: string;
          recipient_identifier: string;
          recipient_token_hash?: string | null;
          poem_content: string;
          clue_one: string;
          clue_two: string;
          secret_answer: string;
          secret_answer_hash?: string | null;
          wax_seal_color: string;
          is_unlocked: boolean;
          failed_attempts: number;
          locked_until: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_uid: string;
          recipient_identifier: string;
          recipient_token_hash?: string | null;
          poem_content: string;
          clue_one: string;
          clue_two: string;
          secret_answer: string;
          secret_answer_hash?: string | null;
          wax_seal_color?: string;
          is_unlocked?: boolean;
          failed_attempts?: number;
          locked_until?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          sender_uid?: string;
          recipient_identifier?: string;
          recipient_token_hash?: string | null;
          poem_content?: string;
          clue_one?: string;
          clue_two?: string;
          secret_answer?: string;
          secret_answer_hash?: string | null;
          wax_seal_color?: string;
          is_unlocked?: boolean;
          failed_attempts?: number;
          locked_until?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "secret_khats_sender_uid_fkey";
            columns: ["sender_uid"];
            isOneToOne: false;
            referencedRelation: "public_shayars";
            referencedColumns: ["shayar_uid"];
          }
        ];
      };
      content_reports: {
        Row: {
          id: string;
          reporter_uid: string | null;
          target_type: "poem" | "comment" | "khat";
          target_id: string;
          reason: string;
          status: "pending" | "reviewed" | "removed";
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_uid?: string | null;
          target_type: "poem" | "comment" | "khat";
          target_id: string;
          reason: string;
          status?: "pending" | "reviewed" | "removed";
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_uid?: string | null;
          target_type?: "poem" | "comment" | "khat";
          target_id?: string;
          reason?: string;
          status?: "pending" | "reviewed" | "removed";
          created_at?: string;
        };
        Relationships: [];
      };
      room_sessions: {
        Row: {
          room_code: string;
          user_uid: string;
          role: "host" | "guest";
          joined_at: string;
          last_seen: string;
        };
        Insert: {
          room_code: string;
          user_uid: string;
          role: "host" | "guest";
          joined_at?: string;
          last_seen?: string;
        };
        Update: {
          room_code?: string;
          user_uid?: string;
          role?: "host" | "guest";
          joined_at?: string;
          last_seen?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      safe_poems_feed: {
        Row: {
          id: string;
          shayar_uid: string;
          takhallus: string;
          hinglish_text: string;
          hindi_text: string | null;
          urdu_text: string | null;
          english_translation: string | null;
          mood_tag: string | null;
          format_type: string | null;
          seed_words: string[] | null;
          is_gumnaam: boolean;
          daad_count: number;
          created_at: string;
          is_owner: boolean;
        };
        Relationships: [];
      };
      public_shayar_directory: {
        Row: {
          shayar_uid: string;
          takhallus: string;
          takhallus_meaning: string | null;
          vibe_category: string | null;
          created_at: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_secret_khat_rpc: {
        Args: {
          p_recipient_identifier: string;
          p_poem_content: string;
          p_clue_one: string;
          p_clue_two: string;
          p_secret_answer: string;
          p_wax_seal_color?: string;
        };
        Returns: string;
      };
      get_secret_khat_by_id: {
        Args: {
          p_khat_id: string;
        };
        Returns: {
          id: string;
          poem_content: string;
          clue_one: string;
          clue_two: string;
          wax_seal_color: string;
          is_unlocked: boolean;
          sender_uid: string | null;
          sender_takhallus: string | null;
          created_at: string;
        }[];
      };
      unlock_secret_khat_rpc: {
        Args: {
          p_khat_id: string;
          p_guess: string;
        };
        Returns: {
          unlocked: boolean;
          sender_uid: string | null;
          sender_takhallus: string | null;
          remaining_attempts: number;
          error_message: string | null;
        }[];
      };
      delete_my_account_rpc: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      get_feed_page: {
        Args: {
          p_cursor_created_at?: string | null;
          p_cursor_id?: string | null;
          p_mood?: string | null;
          p_limit?: number;
        };
        Returns: {
          id: string;
          shayar_uid: string;
          takhallus: string;
          hinglish_text: string;
          hindi_text: string | null;
          urdu_text: string | null;
          english_translation: string | null;
          mood_tag: string | null;
          format_type: string | null;
          seed_words: string[] | null;
          is_gumnaam: boolean;
          daad_count: number;
          created_at: string;
          is_owner: boolean;
          recent_comments: {
            id: string;
            comment_text: string;
            created_at: string;
            takhallus: string | null;
          }[] | null;
        }[];
      };
      get_my_shayar_profile: {
        Args: Record<PropertyKey, never>;
        Returns: {
          shayar_uid: string;
          takhallus: string;
        }[];
      };
      update_my_takhallus: {
        Args: {
          p_takhallus: string;
          p_meaning?: string | null;
        };
        Returns: boolean;
      };
      room_heartbeat: {
        Args: {
          p_code: string;
          p_role: string;
        };
        Returns: {
          active: number;
          capacity: number;
          ok: boolean;
        }[];
      };
      room_leave: {
        Args: {
          p_code: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
