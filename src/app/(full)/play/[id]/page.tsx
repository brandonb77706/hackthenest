import { Suspense } from "react";
import { StepPlayer } from "@/features/step-player/components/StepPlayer";

export default function PlayPage(props: PageProps<"/play/[id]">) {
  return (
    <Suspense fallback={<p className="px-4 py-8">Getting your steps…</p>}>
      <Player params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Player({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const step = Number(Array.isArray(query.step) ? query.step[0] : query.step);
  return <StepPlayer routineId={id} startStep={Number.isInteger(step) && step > 0 ? step : 1} />;
}
