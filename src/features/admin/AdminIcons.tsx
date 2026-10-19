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

export function OverviewIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />
    </Svg>
  );
}

export function ChatsIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 5.5h11a1.5 1.5 0 011.5 1.5v6a1.5 1.5 0 01-1.5 1.5H9l-3.5 3v-3H4A1.5 1.5 0 012.5 13V7A1.5 1.5 0 014 5.5z" />
      <path d="M19 9h.5A1.5 1.5 0 0121 10.5v6a1.5 1.5 0 01-1.5 1.5H19v2.5L15.5 18H11" />
    </Svg>
  );
}

export function InboxIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3.5 13.5l2.6-7.2A1.5 1.5 0 017.5 5.3h9a1.5 1.5 0 011.4 1l2.6 7.2V18a1.5 1.5 0 01-1.5 1.5H5A1.5 1.5 0 013.5 18z" />
      <path d="M3.5 13.5H8l1.5 2.5h5l1.5-2.5h4.5" />
    </Svg>
  );
}

export function GapIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.4a2.5 2.5 0 014.8.9c0 1.7-2.4 2.2-2.4 3.7M12 16.8v.2" />
    </Svg>
  );
}

export function DocumentsIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M8 3.5h6.5l4 4V18a1.5 1.5 0 01-1.5 1.5H8A1.5 1.5 0 016.5 18V5A1.5 1.5 0 018 3.5z" />
      <path d="M14 3.5V8h4.5M3.5 7.5V20A1.5 1.5 0 005 21.5h9" />
    </Svg>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </Svg>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </Svg>
  );
}

export function ExternalIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M14 4.5h5.5V10M19.5 4.5L11 13M17 14v4.5a1 1 0 01-1 1H5.5a1 1 0 01-1-1V8a1 1 0 011-1H10" />
    </Svg>
  );
}

export function SignOutIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M14 4.5H6a1.5 1.5 0 00-1.5 1.5v12A1.5 1.5 0 006 19.5h8M10 12h10M17 8.5l3.5 3.5-3.5 3.5" />
    </Svg>
  );
}

export function CopyIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6a1.5 1.5 0 00-1.5-1.5H6A1.5 1.5 0 004.5 6v8A1.5 1.5 0 006 15.5h2.5" />
    </Svg>
  );
}

export function MailIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </Svg>
  );
}

export function UploadIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 15.5V4.5M7.5 9L12 4.5 16.5 9M4.5 15v3a1.5 1.5 0 001.5 1.5h12a1.5 1.5 0 001.5-1.5v-3" />
    </Svg>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4.5 7h15M9.5 7V5a1 1 0 011-1h3a1 1 0 011 1v2M6.5 7l.9 11.6a1.5 1.5 0 001.5 1.4h6.2a1.5 1.5 0 001.5-1.4L17.5 7M10 11v5.5M14 11v5.5" />
    </Svg>
  );
}

export function RefreshIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M19.5 12a7.5 7.5 0 01-13.2 4.9M4.5 12a7.5 7.5 0 0113.2-4.9M17.7 3.5v3.6h-3.6M6.3 20.5v-3.6h3.6" />
    </Svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M9.5 6l6 6-6 6" />
    </Svg>
  );
}

export function ArrowUpIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </Svg>
  );
}

export function ArrowDownIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </Svg>
  );
}

export function NoteIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5.5 4.5h13a1 1 0 011 1v9l-5 5h-9a1 1 0 01-1-1v-13a1 1 0 011-1z" />
      <path d="M19.5 14.5h-4a1 1 0 00-1 1v4M8.5 9h7M8.5 12.5h4" />
    </Svg>
  );
}

export function EyeIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

export function EyeOffIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M10.6 5.6A9.7 9.7 0 0112 5.5c6 0 9.5 6.5 9.5 6.5a16.6 16.6 0 01-2.6 3.4M6.6 6.6C4 8.3 2.5 12 2.5 12S6 18.5 12 18.5a9.4 9.4 0 005.4-1.6" />
      <path d="M9.9 9.9a3 3 0 004.2 4.2M3 3l18 18" />
    </Svg>
  );
}
