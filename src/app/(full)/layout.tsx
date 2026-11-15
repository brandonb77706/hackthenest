/** Full-screen flows with no tab bar: making a routine and doing one. */
export default function FullScreenLayout({ children }: LayoutProps<"/">) {
  return <div className="br-root relative mx-auto min-h-dvh w-full max-w-[480px] bg-canvas text-ink">{children}</div>;
}
