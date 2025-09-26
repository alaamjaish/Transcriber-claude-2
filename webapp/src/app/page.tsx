import Link from "next/link";

const sections = [
  {
    title: "Record Lessons",
    description:
      "Capture microphone and system audio in real time, monitor speaker labels, and control gain without leaving the browser.",
    href: "/recordings",
  },
  {
    title: "Student Workspaces",
    description:
      "Organise sessions by student, review transcripts, and manage follow-up tasks with a single source of truth.",
    href: "/students",
  },
  {
    title: "AI Lesson Artifacts",
    description:
      "Automate summaries and homework plans once a session ends, with easy copy/export workflows for teachers.",
    href: "/recordings",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-16 px-6 py-24">
      <header className="space-y-4 text-center md:text-left">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Transcriber Studio</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50 md:text-5xl">
          Production foundation for your lesson recording platform.
        </h1>
        <p className="text-base text-slate-400 md:max-w-2xl">
          This project bootstraps the modern Node.js/TypeScript stack that will replace the HTML prototype. Explore the
          authenticated workspace to record sessions, manage students, and trigger AI-generated lesson artefacts.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/auth/sign-in"
            className="inline-flex items-center justify-center rounded-md bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-sky-300"
          >
            Sign in
          </Link>
          <Link
            href="/auth/sign-up"
            className="inline-flex items-center justify-center rounded-md border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500"
          >
            Create account
          </Link>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        {sections.map((section) => (
          <article
            key={section.title}
            className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 shadow-sm shadow-black/20"
          >
            <h2 className="text-lg font-medium text-slate-100">{section.title}</h2>
            <p className="mt-2 text-sm text-slate-400">{section.description}</p>
            <Link
              href={section.href}
              className="mt-4 inline-flex items-center text-sm font-semibold text-sky-400 hover:text-sky-300"
            >
              View surface
            </Link>
          </article>
        ))}
      </section>

      <footer className="mt-auto border-t border-slate-800 pt-6 text-sm text-slate-500">
        <p>
          Foundation build - replace placeholder copy and wire integrations during implementation phases. See
          `src/components` for shared layout primitives.
        </p>
      </footer>
    </main>
  );
}
