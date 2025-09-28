import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { loadStudentsWithSessionCounts } from "@/lib/data-loaders";
import type { DashboardStudent } from "@/lib/types";
import { DashboardClient } from "./components/DashboardClient";
import { AddStudentButton } from "./components/AddStudentButton";

export default async function DashboardPage() {
  let students: DashboardStudent[] = [];
  let errorMessage: string | null = null;

  try {
    students = await loadStudentsWithSessionCounts();
  } catch (error) {
    console.error("Failed to load students", error);
    errorMessage = "We couldn't load your students. Verify Supabase credentials and try again.";
  }

  const hasStudents = students.length > 0;

  return (
    <div className="space-y-8">
      <Card
        title="Dashboard"
        description="Overview of your students and their recent activity"
        actions={hasStudents ? <AddStudentButton /> : undefined}
      >
        {errorMessage ? (
          <EmptyState
            title="Unable to load students"
            description={errorMessage}
            actionLabel="Reload"
            actionHref="/dashboard"
            aside={<span>If this persists, check that your Supabase env vars are set and the schema has been deployed.</span>}
          />
        ) : (
          <DashboardClient students={students} />
        )}
      </Card>
    </div>
  );
}