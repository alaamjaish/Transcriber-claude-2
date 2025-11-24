'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Student } from '@/lib/types';
import { StudentSessionList } from './StudentSessionList';
import { StudentRecordingInterface } from './StudentRecordingInterface';
import { AIChatSidebar } from './AIChatSidebar';
import { EditStudentModal } from '@/app/(dashboard)/dashboard/components/EditStudentModal';

interface StudentPageClientProps {
  student: Student;
  errorMessage: string | null;
}

export function StudentPageClient({ student, errorMessage }: StudentPageClientProps) {
  const router = useRouter();
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  return (
    <>
      {/* AI Tutor Toggle Button - TEMPORARILY HIDDEN */}
      {/* <div className="fixed top-4 left-4 z-[60]">
        <button
          onClick={() => setIsAIChatOpen(!isAIChatOpen)}
          className="group relative w-12 h-12 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 transition-all duration-200 flex items-center justify-center shadow-lg"
          title={isAIChatOpen ? 'Close AI Tutor' : 'Open AI Tutor'}
        >
          {!isAIChatOpen && (
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          )}

          {isAIChatOpen && (
            <div className="w-6 h-5 flex flex-col justify-center items-center">
              <span className="block h-0.5 w-6 bg-white transition-all duration-300 ease-out rotate-45 translate-y-[2px]" />
              <span className="block h-0.5 w-6 bg-white transition-all duration-300 ease-out -rotate-45 -translate-y-[2px]" />
            </div>
          )}
        </button>
      </div> */}

      {/* Main Content */}
      <div className="space-y-8">
        <StudentRecordingInterface
          student={student}
          onEditName={() => setShowEditModal(true)}
        />

        <Card
          title={`${student.name}'s Sessions`}
          description="Auditable list of sessions tied to this student."
        >
          {errorMessage ? (
            <EmptyState
              title="Unable to load sessions"
              description={errorMessage}
              actionLabel="Reload"
              actionHref={`/students/${student.id}`}
              aside={<span>If this persists, confirm your Supabase env vars and policies.</span>}
            />
          ) : (
            <StudentSessionList studentId={student.id} studentName={student.name} />
          )}
        </Card>
      </div>

      {/* AI Chat Sidebar - TEMPORARILY HIDDEN */}
      {/* <AIChatSidebar
        studentId={student.id}
        studentName={student.name}
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
      /> */}

      {/* Edit Student Modal */}
      <EditStudentModal
        open={showEditModal}
        student={{...student, totalSessions: student.totalSessions ?? 0}}
        onDismiss={() => setShowEditModal(false)}
        onStudentUpdated={() => {
          router.refresh();
          setShowEditModal(false);
        }}
      />
    </>
  );
}
