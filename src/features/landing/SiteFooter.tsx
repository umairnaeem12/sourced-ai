import { navLinks } from "./content";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-14 sm:px-6 md:grid-cols-[1.5fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-pretty text-muted">
            Sourced AI is a portfolio demo. Pinebrook Supply is a fictional store, and all
            sample data is made up.
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-2 text-sm">
          {[...navLinks, { href: "#team", label: "For your team" }, { href: "/demo", label: "Live demo" }].map(
            (link) => (
              <a key={link.href} href={link.href} className="text-muted transition-colors hover:text-ink">
                {link.label}
              </a>
            ),
          )}
        </nav>
      </div>
      <p
        aria-hidden="true"
        className="mt-10 bg-linear-to-b from-line-strong to-transparent bg-clip-text text-center font-display text-[22vw] leading-[0.8] text-transparent italic select-none lg:text-[15rem]"
      >
        Sourced AI
      </p>
    </footer>
  );
}
