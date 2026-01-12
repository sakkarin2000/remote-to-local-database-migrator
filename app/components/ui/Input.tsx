"use client";
import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { label?: string; className?: string };

export function Input({ label, className = "", ...props }: InputProps) {
  return (
    <label className="block">
      {label && <div className="form-label">{label}</div>}
      <input className={`input ${className}`} {...props} />
    </label>
  );
}

export default Input;
