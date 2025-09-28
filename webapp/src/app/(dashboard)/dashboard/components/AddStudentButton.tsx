"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AddStudentModal } from "./AddStudentModal";

export function AddStudentButton() {
  const [showAddModal, setShowAddModal] = useState(false);
  const router = useRouter();

  const handleStudentCreated = () => {
    router.refresh();
  };

  return (
    <>
      <button
        onClick={() => setShowAddModal(true)}
        className="rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-sky-300"
      >
        Add Student
      </button>

      <AddStudentModal
        open={showAddModal}
        onDismiss={() => setShowAddModal(false)}
        onStudentCreated={handleStudentCreated}
      />
    </>
  );
}