import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DemoSection } from "@/components/demo/DemoSection";

const sections = [
  {
    title: "تسجيل الدروس",
    description:
      "سجّل صوت الميكروفون والنظام في الوقت الفعلي، مع إمكانية التحكم في الصوت ومراقبة المتحدثين مباشرة من المتصفح.",
    href: "/recordings",
  },
  {
    title: "إدارة الطلاب",
    description:
      "نظّم الجلسات حسب كل طالب، راجع النصوص المكتوبة، وأدِر المهام المتابعة من مكان واحد.",
    href: "/students",
  },
  {
    title: "ملخصات بالذكاء الاصطناعي",
    description:
      "احصل على ملخصات وخطط واجبات تلقائية فور انتهاء الجلسة، مع سهولة النسخ والتصدير للمعلمين.",
    href: "/recordings",
  },
];

export default async function Home() {
  // Check if user is authenticated
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If user is authenticated, redirect to dashboard
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-16 px-6 py-24">
      <header className="space-y-4 text-center md:text-right">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">استوديو النسخ الصوتي</p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-5xl">
          منصة احترافية لتسجيل ونسخ الدروس بالذكاء الاصطناعي
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-400 md:max-w-2xl md:mr-auto">
          حوّل دروسك ومحاضراتك إلى نصوص مكتوبة وملخصات ذكية تلقائياً. مثالي للمعلمين، الأساتذة، الطلاب، وكل من يريد توثيق اجتماعاته ومحاضراته بسهولة.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Link
            href="/auth/sign-in"
            className="inline-flex items-center justify-center rounded-md bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-600 shadow-md hover:shadow-lg"
          >
            تسجيل الدخول
          </Link>
          <Link
            href="/auth/sign-up"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 px-6 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100 transition hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            إنشاء حساب مجاني
          </Link>
        </div>
      </header>

      {/* Demo Section */}
      <section className="py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3">
            جرّب النسخ الصوتي بالذكاء الاصطناعي
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-400">
            سجّل حتى 3 دقائق وشاهد كلماتك تظهر مباشرةً مع ملخص تلقائي من الذكاء الاصطناعي!
          </p>
        </div>
        <DemoSection />
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {sections.map((section) => (
          <article
            key={section.title}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-6 shadow-sm shadow-black/5 dark:shadow-black/20 text-right"
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{section.title}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{section.description}</p>
            <Link
              href={section.href}
              className="mt-4 inline-flex items-center text-sm font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300"
            >
              استكشف الآن ←
            </Link>
          </article>
        ))}
      </section>

      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 pt-6 text-sm text-slate-500 dark:text-slate-500 text-center">
        <p>
          منصة احترافية للمعلمين والمدربين • النسخ الصوتي والملخصات بالذكاء الاصطناعي
        </p>
      </footer>
    </main>
  );
}
