import { GenerationStatus, type Session, type Student, type TeacherProfile } from "@/lib/types";

const now = new Date();

function daysAgo(days: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export const mockTeacher: TeacherProfile = {
  id: "teacher_123",
  email: "teacher@example.com",
  displayName: "Alaa",
  onboarded: false,
};

export const mockStudents: Student[] = [
  { id: "stu_1", name: "Layla Hasan", createdAt: daysAgo(10), totalSessions: 12 },
  { id: "stu_2", name: "Omar Saleh", createdAt: daysAgo(21), totalSessions: 7 },
  { id: "stu_3", name: "Unassigned", createdAt: daysAgo(45), totalSessions: 3 },
];

export const mockSessions: Session[] = [
  {
    id: "sess_eco",
    studentId: "stu_1",
    studentName: "Layla Hasan",
    recordedAt: daysAgo(1),
    durationMs: 36 * 60 * 1000,
    transcript: "Speaker 1: marhaba, keef halak? (Hello, how are you?) Speaker 2: ahlan, ana mneeh, shukran. (Hi, I'm good, thank you.) Speaker 1: btitakalam arabi? (Do you speak Arabic?) Speaker 2: shway shway, ba3deni bata3alam. (A little, I'm still learning.)",
    transcriptPreview: "Speaker 1: marhaba... Speaker 2: ahlan...",
    generationStatus: "complete",
    summaryReady: true,
    homeworkReady: true,
    summaryMd: "## Session Summary\n\nGreeting conversation practice with basic introductions.",
    homeworkMd: "## Practice Homework\n\n1. Practice greeting phrases\n2. Review vocabulary",
    aiGenerationStatus: "complete",
    aiGenerationStartedAt: null,
  },
  {
    id: "sess_alpha",
    studentId: "stu_2",
    studentName: "Omar Saleh",
    recordedAt: daysAgo(3),
    durationMs: 22 * 60 * 1000,
    transcript: "Short pronunciation drill covering the alphabet and basic sounds in Arabic language learning session.",
    transcriptPreview: "Short pronunciation drill covering the ",
    generationStatus: "generating",
    summaryReady: false,
    homeworkReady: false,
    summaryMd: null,
    homeworkMd: null,
    aiGenerationStatus: "generating",
    aiGenerationStartedAt: daysAgo(0.1),
  },
  {
    id: "sess_empty",
    studentId: undefined,
    studentName: "Unassigned",
    recordedAt: daysAgo(6),
    durationMs: 11 * 60 * 1000,
    transcript: "",
    transcriptPreview: "",
    generationStatus: "empty",
    summaryReady: false,
    homeworkReady: false,
    summaryMd: null,
    homeworkMd: null,
    aiGenerationStatus: "idle",
    aiGenerationStartedAt: null,
  },
];

export function statusLabel(status: GenerationStatus): string {
  switch (status) {
    case "complete":
      return "Complete";
    case "generating":
      return "Generating";
    case "empty":
      return "No transcript";
    case "error":
      return "Error";
    default:
      return "Queued";
  }
}

