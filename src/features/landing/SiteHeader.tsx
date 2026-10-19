"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { navLinks } from "./content";
import { ArrowRightIcon } from "./icons";
import { Logo } from "./Logo";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 border-b transition-colors duration-300",
        scrolled ? "border-line bg-bg/75 backdrop-blur-xl" : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 text-sm text-muted md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-1.5 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <Button href="/admin" variant="secondary" className="px-3 whitespace-nowrap sm:px-4">
            <span className="sm:hidden">Admin</span>
            <span className="hidden sm:inline">Admin dashboard</span>
          </Button>
          <Button href="/demo" className="px-3 whitespace-nowrap sm:px-4">
            Try the demo
            <ArrowRightIcon className="hidden size-3.5 transition-transform group-hover:translate-x-0.5 sm:block" />
          </Button>
        </div>
      </div>
    </header>
  );
}
