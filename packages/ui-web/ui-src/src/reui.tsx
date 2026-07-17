import React from "react";
import type { HTMLAttributes, ReactNode } from "react";

const cx = (...values: Array<string | false | undefined>) =>
  values.filter(Boolean).join(" ");

export function Frame(props: HTMLAttributes<HTMLElement>) {
  return <section {...props} className={cx("reui-frame", props.className)} />;
}
export function FrameHeader({ title, description, action }: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="reui-frame-header">
      <div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}
    </header>
  );
}
export function Badge({ children, tone = "neutral" }: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning";
}) {
  return <span className={`reui-badge is-${tone}`}>{children}</span>;
}
export function Button({ className, ...props }: HTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={cx("reui-button", className)} />;
}
