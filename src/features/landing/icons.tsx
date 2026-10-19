import { cn } from "@/lib/cn";

interface IconProps {
  className?: string;
}

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-4 shrink-0", className)}
    >
      {children}
    </svg>
  );
}

export function SparkleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-4 shrink-0", className)}>
      <path
        fill="currentColor"
        d="M12 3.5l1.9 5.2 5.2 1.9-5.2 1.9L12 17.7l-1.9-5.2-5.2-1.9 5.2-1.9zM18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"
      />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5 12.5l4.2 4.2L19 7" />
    </Svg>
  );
}

export function CrossIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M7 7l10 10M17 7L7 17" />
    </Svg>
  );
}

export function DocIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M7 3.5h7l4 4V20a.5.5 0 01-.5.5h-10.5a.5.5 0 01-.5-.5V4a.5.5 0 01.5-.5z" />
      <path d="M13.5 3.5V8h4.5M9.5 12.5h5M9.5 16h5" />
    </Svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </Svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function UserIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
    </Svg>
  );
}

export function SendIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5 12l14-7-5 14-2.5-5.5z" />
    </Svg>
  );
}
