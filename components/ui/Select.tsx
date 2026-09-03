"use client";

import { ChevronDownIcon } from "@/components/icons";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
}

export function Select({ label, value, options, onChange, className }: SelectProps) {
  return (
    <label className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      {label && (
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-2">
          {label}
        </span>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-xl border border-border bg-surface-2 py-2.5 pl-3.5 pr-9 text-sm text-foreground transition-colors hover:border-border-strong focus:border-gold/40 focus:outline-none"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
      </div>
    </label>
  );
}
