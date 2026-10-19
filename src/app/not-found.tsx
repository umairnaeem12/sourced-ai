import { Button } from "@/components/ui/Button";
import { Logo } from "@/features/landing/Logo";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-muted">That page doesn&rsquo;t exist.</p>
      </div>
      <Button href="/">Back to home</Button>
    </main>
  );
}
