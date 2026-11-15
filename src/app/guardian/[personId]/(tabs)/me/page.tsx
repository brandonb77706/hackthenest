import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { br } from "@/components/bridge/styles";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { GuardianControls } from "@/features/guardians/components/GuardianControls";
import { sharedList } from "@/features/guardians/day";
import { requirePerson } from "@/features/guardians/person";

export const metadata: Metadata = { title: "Me · Bridge" };

export default function Page({ params }: PageProps<"/guardian/[personId]/me">) {
  return (
    <Suspense fallback={<p className="px-5 pt-8 text-[18px]">Loading…</p>}>
      <Me params={params} />
    </Suspense>
  );
}

async function Me({ params }: { params: PageProps<"/guardian/[personId]/me">["params"] }) {
  await connection();
  const { personId } = await params;
  const { guardian, person } = await requirePerson(personId);
  const who = person.name || "They";
  const shared = sharedList(person);

  return (
    <div className="flex flex-col gap-3.5 px-4 pb-[120px] pt-7">
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden="true"
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-[28px] font-bold text-primary-text"
        >
          {(guardian.name || "?").charAt(0).toUpperCase()}
        </span>
        <span className="flex flex-col">
          <h1 className="m-0 font-display text-[30px] font-bold leading-[1.1]">{guardian.name}</h1>
          <span className="text-[16px] text-ink2">Guardian for {who}</span>
        </span>
      </div>

      <div className="mt-2 flex flex-col gap-1.5 rounded-[18px] bg-primary-soft px-4 py-4">
        <h2 className={`${br.h2} text-[19px]`}>What {who} shares with you</h2>
        {shared.length === 0 ? (
          <p className="m-0 text-[17px]">Nothing yet.</p>
        ) : (
          <ul className="m-0 flex flex-col gap-1 pl-5 text-[17px]">
            {shared.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        )}
        <p className="m-0 text-[16px] text-ink2">{who} controls this on their Me tab.</p>
      </div>

      <GuardianControls
        linkId={person.link_id}
        name={person.name || "They"}
        initial={{
          user_can_edit_routines: person.user_can_edit_routines,
          user_can_edit_contacts: person.user_can_edit_contacts,
        }}
      />

      <Link
        href="/guardian?manage=1"
        className={`${br.ghost} flex min-h-14 items-center justify-center rounded-2xl text-[18px] no-underline`}
      >
        People you support
      </Link>
      <SignOutButton />
    </div>
  );
}
