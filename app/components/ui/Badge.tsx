import React from "react";

type BadgeProps = { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLSpanElement>;

export function Badge({ children, className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;
