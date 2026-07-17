import { type ReactNode } from "react";

export interface PlatformBadgeProps {
  children: ReactNode;
  className?: string;
}

export function PlatformBadge({
  children,
  className,
}: PlatformBadgeProps) {
  return <span className={className}>{children}</span>;
}
