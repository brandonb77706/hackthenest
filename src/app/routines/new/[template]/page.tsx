import { notFound } from "next/navigation";
import { RoutineEditorPage } from "@/features/routine-builder/components/RoutineEditorPage";
import { BLANK_TEMPLATE_ID, startingRoutine, TEMPLATES } from "@/features/routine-builder/templates";

export function generateStaticParams() {
  return [BLANK_TEMPLATE_ID, ...TEMPLATES.map((t) => t.id)].map((template) => ({ template }));
}

export default async function NewFromTemplatePage(props: PageProps<"/routines/new/[template]">) {
  const { template } = await props.params;
  const initial = startingRoutine(template);
  if (!initial) notFound();
  return <RoutineEditorPage initial={initial} heading="New routine" />;
}
