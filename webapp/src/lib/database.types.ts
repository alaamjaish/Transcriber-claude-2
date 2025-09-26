export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string;
          owner_user_id: string;
          student_id: string;
          timestamp: string;
          duration_ms: number;
          transcript: string;
          summary_md: string | null;
          homework_md: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          student_id: string;
          timestamp?: string;
          duration_ms?: number;
          transcript: string;
          summary_md?: string | null;
          homework_md?: string | null;
          created_at?: string;
        };
        Update: Partial<{
          owner_user_id: string;
          student_id: string;
          timestamp: string;
          duration_ms: number;
          transcript: string;
          summary_md: string | null;
          homework_md: string | null;
          created_at: string;
        }>;
        Relationships: [
          {
            foreignKeyName: "sessions_student_id_fkey";
            columns: ["student_id"];
            referencedRelation: "students";
            referencedColumns: ["id"];
          }
        ];
      };
      students: {
        Row: {
          id: string;
          owner_user_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          name: string;
          created_at?: string;
        };
        Update: Partial<{
          owner_user_id: string;
          name: string;
          created_at: string;
        }>;
        Relationships: [];
      };
    };
  };
}
