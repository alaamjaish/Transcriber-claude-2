import { notFound } from "next/navigation";

import { loadSessionsForStudent, loadStudentById } from "@/lib/data-loaders";
import type { Session, Student } from "@/lib/types";

import { SessionListProvider } from "@/app/(dashboard)/recordings/components/SessionListProvider";
import { StudentPageClient } from "./components/StudentPageClient";

interface StudentPageProps {
  params: Promise<{ studentId: string }>;
}

export default async function StudentPage({ params }: StudentPageProps) {
  const { studentId } = await params;

  let student: Student | null = null;
  try {
    student = await loadStudentById(studentId);
  } catch (error) {
    console.error("Failed to load student", error);
    throw error;
  }

  if (!student) {
    notFound();
  }

  let sessions: Session[] = [];
  let errorMessage: string | null = null;
  try {
    sessions = await loadSessionsForStudent(studentId);
  } catch (error) {
    console.error("Failed to load sessions for student", error);
    errorMessage = "We couldn't load this student's sessions. Verify Supabase settings and try again.";
  }

  return (
    <SessionListProvider initialSessions={sessions}>
      <StudentPageClient student={student} errorMessage={errorMessage} />
    </SessionListProvider>
  );
}
