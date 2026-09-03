import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9.5v-6h5v6H17.5a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5.5h16v10.5H8.5L4 20V5.5Z" />
      <path d="M8 9.5h8M8 12.5h5" />
    </svg>
  );
}

export function ProjectsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6.5A1.5 1.5 0 0 1 5.5 5H10l2 2.5h6.5A1.5 1.5 0 0 1 20 9v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18V6.5Z" />
    </svg>
  );
}

export function TasksIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4.5" y="4.5" width="15" height="15" rx="2.5" />
      <path d="m8.5 12.5 2.2 2.2L15.5 9.5" />
    </svg>
  );
}

export function AgentsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="8" width="14" height="10" rx="2.5" />
      <path d="M12 8V5.2M9.5 5.2h5" />
      <circle cx="9.3" cy="12.8" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.7" cy="12.8" r="1" fill="currentColor" stroke="none" />
      <path d="M4 12v2M20 12v2" />
    </svg>
  );
}

export function ActivityIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 13h3.2l2-5.5 3.4 10.5 2.2-7.3 1.6 2.3H20" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.8v2.1M12 18.1v2.1M20.2 12h-2.1M5.9 12H3.8M17.4 6.6l-1.5 1.5M8.1 15.9l-1.5 1.5M17.4 17.4l-1.5-1.5M8.1 8.1 6.6 6.6" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12h13.5M13 6.5 18.5 12 13 17.5" />
    </svg>
  );
}

export function BranchIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="7" cy="6" r="2" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="10" r="2" />
      <path d="M7 8v8M7 12c0-3 2.5-4.5 6-4.5H16" />
    </svg>
  );
}

export function PullRequestIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="7" cy="6" r="2" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="6" r="2" />
      <path d="M7 8v8M17 8v5.5a2.5 2.5 0 0 1-2.5 2.5H14" />
    </svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 12 19.5 5l-5.2 15-3.1-6.6L4.5 12Z" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6.5 9.5 5.5 5 5.5-5" />
    </svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 10a5 5 0 0 1 10 0c0 4 1.5 5 1.5 5H5.5S7 14 7 10Z" />
      <path d="M10.3 18a1.8 1.8 0 0 0 3.4 0" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function CommitIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="2.5" />
      <path d="M4 12h5.5M14.5 12H20" />
    </svg>
  );
}

export function BuildIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 19 12 5l7 14" />
      <path d="M8.5 13h7" />
    </svg>
  );
}

export function TestIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 3.5h6M10 3.5v5l-4.5 8A2 2 0 0 0 7.3 20h9.4a2 2 0 0 0 1.8-3l-4.5-8v-5" />
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M5 5l1.4 1.4M17.6 17.6 19 19M3 12h2M19 12h2M5 19l1.4-1.4M17.6 6.4 19 5" />
    </svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
    </svg>
  );
}

export function MonitorIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="4.5" width="17" height="12" rx="1.5" />
      <path d="M9 20h6M12 16.5V20" />
    </svg>
  );
}

export function DiffIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 4v6M9 15v5M6.5 6.5H9M9 17.5h4.5M15 4v6a2 2 0 0 0 2 2h2M15 14v3a2 2 0 0 0 2 2h.5" />
    </svg>
  );
}
