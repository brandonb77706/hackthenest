import { TabBar } from "@/components/bridge/TabBar";

/** The main app: a phone-width column with the tab bar at the bottom. */
export default function TabsLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="br-root relative mx-auto min-h-dvh w-full max-w-[480px] bg-canvas text-ink">
      <main>{children}</main>
      <TabBar />
    </div>
  );
}
