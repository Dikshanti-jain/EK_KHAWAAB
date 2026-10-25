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
        Relationships: [
          {
            foreignKeyName: "public_shayars_auth_user_id_fkey";
            columns: ["auth_user_id"];
            isOneToOne: true;
            referencedRelation: "private_user_vault";
            referencedColumns: ["auth_user_id"];
          }
        ];
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
          hindi_text: string;
          urdu_text: string;
          english_translation?: string | null;
          mood_tag: string;
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
          poem_content: string;
          clue_one: string;
          clue_two: string;
          secret_answer: string;
          wax_seal_color: string;
          is_unlocked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_uid: string;
          recipient_identifier: string;
          poem_content: string;
          clue_one: string;
          clue_two: string;
          secret_answer: string;
          wax_seal_color?: string;
          is_unlocked?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          sender_uid?: string;
          recipient_identifier?: string;
          poem_content?: string;
          clue_one?: string;
          clue_two?: string;
          secret_answer?: string;
          wax_seal_color?: string;
          is_unlocked?: boolean;
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
