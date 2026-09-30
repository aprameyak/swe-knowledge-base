"use client";

import { cn } from "@/lib/utils";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all disabled:opacity-50 disabled:pointer-events-none",
        size === "sm" && "px-3 py-1.5 text-sm",
        size === "md" && "px-4 py-2 text-sm",
        size === "lg" && "px-5 py-2.5 text-base",
        variant === "primary" &&
          "bg-[var(--accent)] text-white hover:bg-[var(--accent-ink)] shadow-sm",
        variant === "secondary" &&
          "bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--line-strong)] hover:bg-[var(--bg-elevated)]",
        variant === "ghost" &&
          "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-black/5",
        variant === "danger" &&
          "bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/15",
        className
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]",
        className
      )}
      {...props}
    />
  );
}

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-3 text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] resize-y min-h-[100px]",
        className
      )}
      {...props}
    />
  );
});

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "explicit" | "inferred" | "accent" | "warn";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide",
        tone === "neutral" && "bg-[var(--bg)] text-[var(--ink-muted)]",
        tone === "explicit" &&
          "bg-[var(--explicit-soft)] text-[var(--explicit)]",
        tone === "inferred" &&
          "bg-[var(--inferred-soft)] text-[var(--inferred)]",
        tone === "accent" && "bg-[var(--accent-soft)] text-[var(--accent-ink)]",
        tone === "warn" && "bg-[var(--warn-soft)] text-[var(--warn)]",
        className
      )}
    >
      {children}
    </span>
  );
}

export function ProvenanceBadge({
  provenance,
}: {
  provenance: "explicit" | "inferred" | string;
}) {
  const isExplicit = provenance === "explicit";
  return (
    <Badge tone={isExplicit ? "explicit" : "inferred"}>
      {isExplicit ? "From your words" : "Inferred"}
    </Badge>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-dashed border-[var(--line-strong)] bg-[var(--bg-elevated)] px-6 py-12 text-center">
      <h3 className="font-display text-xl text-[var(--ink)]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--ink-muted)] leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]",
        className
      )}
    >
      {children}
    </div>
  );
}
