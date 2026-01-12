import React from "react";

type CardProps = React.HTMLAttributes<HTMLDivElement> & { className?: string };

export function Card({ className = "", children, ...props }: CardProps) {
  return (
    <div className={`card ${className}`} {...props}>
      {children}
    </div>
  );
}

export default Card;
