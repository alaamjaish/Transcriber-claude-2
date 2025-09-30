"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DashboardStudent } from "@/lib/types";
import { AddStudentModal } from "./AddStudentModal";
import { EditStudentModal } from "./EditStudentModal";
import { DeleteStudentDialog } from "./DeleteStudentDialog";
import { StudentCard } from "./StudentCard";

interface DashboardClientProps {
  students: DashboardStudent[];
}

export function DashboardClient({ students }: DashboardClientProps) {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<DashboardStudent | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState<DashboardStudent | null>(null);

  const handleStudentClick = (studentId: string) => {
    router.push(`/students/${studentId}`);
  };

  const handleEdit = (student: DashboardStudent) => {
    setEditingStudent(student);
    setShowEditModal(true);
  };

  const handleDelete = (student: DashboardStudent) => {
    setDeletingStudent(student);
    setShowDeleteDialog(true);
  };

  const handleRefresh = () => {
    router.refresh();
  };

  const hasStudents = students.length > 0;

  return (
    <>
      {hasStudents ? (
        <ul className="grid gap-4 md:grid-cols-3">
          {students.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              onClick={() => handleStudentClick(student.id)}
              onEdit={() => handleEdit(student)}
              onDelete={() => handleDelete(student)}
            />
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 p-10 text-center text-slate-700 dark:text-slate-300">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">No students yet</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Add your first student to start organizing sessions and tracking progress.
          </p>
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setShowAddModal(true)}
              className="rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-sky-300"
            >
              Add First Student
            </button>
          </div>
        </div>
      )}

      <AddStudentModal
        open={showAddModal}
        onDismiss={() => setShowAddModal(false)}
        onStudentCreated={handleRefresh}
      />

      <EditStudentModal
        open={showEditModal}
        student={editingStudent}
        onDismiss={() => {
          setShowEditModal(false);
          setEditingStudent(null);
        }}
        onStudentUpdated={handleRefresh}
      />

      <DeleteStudentDialog
        open={showDeleteDialog}
        student={deletingStudent}
        onDismiss={() => {
          setShowDeleteDialog(false);
          setDeletingStudent(null);
        }}
        onStudentDeleted={handleRefresh}
      />
    </>
  );
}