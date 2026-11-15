import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/bridge/Icon";

interface Props {
  title: string;
  icon: IconName;
  /** One big friendly line */
  lead: string;
  /** Who is building this tab */
  owner: string;
  children?: ReactNode;
}

/** A tab that isn't built yet, in the Bridge look. Its owner replaces this with the real screen. */
export function PlaceholderTab({ title, icon, lead, owner, children }: Props) {
  return (
    <div className="flex flex-col gap-4 px-4 pb-[130px] pt-7">
      <h1 className="m-0 font-display text-[32px] font-bold">{title}</h1>
      <div className="flex flex-col items-center gap-3.5 text-center">
        <div className="box-border flex h-[200px] w-full items-center justify-center rounded-3xl border-[3px] border-dashed border-cta bg-primary-soft text-primary-text">
          <Icon name={icon} size={88} strokeWidth={1.5} />
        </div>
        <p className="m-0 mt-1.5 font-display text-[22px] font-semibold leading-tight">{lead}</p>
        <p className="m-0 text-ink2">Coming soon. {owner} is building this part.</p>
      </div>
      {children}
    </div>
  );
}
