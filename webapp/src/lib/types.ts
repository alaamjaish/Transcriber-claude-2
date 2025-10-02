export type GenerationStatus = "idle" | "generating" | "complete" | "empty" | "error";

export interface Student {
  id: string;
  name: string;
  createdAt: string;
  totalSessions?: number;
}

export interface DashboardStudent extends Student {
  totalSessions: number;
  lastSessionDate?: string;
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
  defaultSummaryPromptId?: string;
  defaultHomeworkPromptId?: string;
  updatedAt: string;
}

export interface Prompt {
  id: string;
  userId: string;
  name: string;
  promptText: string;
  createdAt: string;
  updatedAt: string;
}

export interface TutorSettings {
  id: string;
  userId: string;
  teachingMethodology: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIChatSession {
  id: string;
  studentId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokensUsed?: number;
  createdAt: string;
}
