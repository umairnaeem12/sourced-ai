import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | Sourced AI",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-dvh overflow-x-clip">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-64 left-1/2 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-glow opacity-70 blur-[140px]" />
      </div>
      {children}
    </div>
  );
}
