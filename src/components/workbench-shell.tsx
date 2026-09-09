import Link from "next/link";
import { type ReactNode } from "react";
export function WorkbenchShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0d0e0e] text-white">
      <div className="hidden min-h-screen items-center justify-center max-[767px]:flex">
        Mobile coming soon
      </div>
      <div className="max-[767px]:hidden">
        <header className="flex h-16 items-center justify-between border-b border-white/10 px-10 text-sm">
          <Link href="/">Prelude / Interface</Link>
          <span className="text-white/40">Glass workbench</span>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
