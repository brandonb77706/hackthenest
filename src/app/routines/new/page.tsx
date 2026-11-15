import Link from "next/link";
import { BLANK_TEMPLATE_ID, TEMPLATES } from "@/features/routine-builder/templates";
import { ui } from "@/features/routine-builder/ui";

export default function NewRoutinePage() {
  return (
    <main className={`${ui.page} space-y-6`}>
      <h1 className={ui.h1}>What do you need to do?</h1>

      <Link href="/routines/new/ai" className={ui.primary}>
        🎤 Tell Bridge
      </Link>
      <Link href={`/routines/new/${BLANK_TEMPLATE_ID}`} className={`${ui.secondary} w-full`}>
        ✏️ Make it myself
      </Link>

      <section aria-labelledby="quick-start" className="space-y-3">
        <h2 id="quick-start" className={ui.h2}>
          Quick start
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TEMPLATES.map((t) => (
            <li key={t.id}>
              <Link href={`/routines/new/${t.id}`} className={`${ui.secondary} w-full`}>
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Link href="/routines" className={`${ui.secondary} w-full`}>
        Back to my routines
      </Link>
    </main>
  );
}
