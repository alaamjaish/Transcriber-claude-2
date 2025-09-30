import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { loadStudentsWithSessionCounts, loadRecentSessions } from "@/lib/data-loaders";
import type { DashboardStudent, Session } from "@/lib/types";
import { DashboardClient } from "./components/DashboardClient";
import { AddStudentButton } from "./components/AddStudentButton";
import { RecentSessionsList } from "./components/RecentSessionsList";

export default async function DashboardPage() {
  let students: DashboardStudent[] = [];
  let recentSessions: Session[] = [];
  let errorMessage: string | null = null;

  try {
    students = await loadStudentsWithSessionCounts();
    recentSessions = await loadRecentSessions();
  } catch (error) {
    console.error("Failed to load dashboard data", error);
    errorMessage = "We couldn't load your dashboard. Verify Supabase credentials and try again.";
  }

  const hasStudents = students.length > 0;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 lg:w-[70%]">
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

      <aside className="lg:w-[30%]">
        <Card
          title="Recent Sessions"
          description="Quick access to your latest 5 sessions"
        >
          <RecentSessionsList sessions={recentSessions.slice(0, 5)} />
        </Card>
      </aside>
    </div>
  );
}