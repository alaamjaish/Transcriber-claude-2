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
  transcript: string;
  transcriptPreview: string;
  generationStatus: GenerationStatus;
  summaryReady: boolean;
  homeworkReady: boolean;
  summaryMd?: string | null;
  homeworkMd?: string | null;
  aiGenerationStatus?: string | null;
  aiGenerationStartedAt?: string | null;
}

export interface TeacherProfile {
  id: string;
  email: string;
  displayName?: string;
  onboarded: boolean;
}

export interface TeacherPreference {
  userId: string;
  currentStudentId?: string;
  updatedAt: string;
}
