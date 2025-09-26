import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-6 rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center text-slate-300">
      <h2 className="text-2xl font-semibold text-slate-100">Student not found</h2>
      <p className="text-sm text-slate-400">Check the URL or navigate back to the student directory.</p>
      <Link
        href="/students"
        className="inline-flex items-center justify-center rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-sky-300"
      >
        Back to students
      </Link>
    </div>
  );
}
