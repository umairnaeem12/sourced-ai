import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "group inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-ink shadow-[0_10px_30px_-10px_var(--glow)] hover:-translate-y-0.5 hover:bg-accent-strong",
        secondary:
          "border border-line bg-surface/70 text-ink backdrop-blur hover:-translate-y-0.5 hover:border-line-strong",
      },
      size: {
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  href: string;
  children: React.ReactNode;
  className?: string;
}

// Every button on the landing page navigates, so this renders a link.
export function Button({ href, variant, size, className, children }: ButtonProps) {
  return (
    <Link href={href} className={cn(buttonVariants({ variant, size }), className)}>
      {children}
    </Link>
  );
}
