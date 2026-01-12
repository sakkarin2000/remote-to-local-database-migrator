"use client";
import React from "react";
import Link from "next/link";

type BaseProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string };

export function Button({ className = "", children, ...props }: BaseProps) {
  return (
    <button
      {...props}
      className={`btn ${className}`}
    >
      {children}
    </button>
  );
}

type LinkButtonProps = { href: string; className?: string; children: React.ReactNode } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">;
export function LinkButton({ href, className = "", children, ...props }: LinkButtonProps) {
  return (
    <Link href={href} {...props} className={`btn ${className}`}>
      {children}
    </Link>
  );
}

export default Button;
