export type GenerationStatus = "idle" | "generating" | "complete" | "empty" | "error";

export interface Student {
  id: string;
  name: string;
  createdAt: string;
  totalSessions?: number;
}

export interface Session {
  id: string;
  studentId?: string;
  studentName?: string;
  recordedAt: string;
  durationMs: number;
  transcriptPreview: string;
  generationStatus: GenerationStatus;
  summaryReady: boolean;
  homeworkReady: boolean;
}

export interface TeacherProfile {
  id: string;
  email: string;
  displayName?: string;
  onboarded: boolean;
}
