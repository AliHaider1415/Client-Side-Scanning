"use client";

import { ReactNode } from "react";
import clsx from "clsx";

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  size?: "icon" | "sm" | "md" | "lg";
  variant?: "default" | "outline" | "ghost";
  className?: string;
};

export function Button({
  children,
  onClick,
  disabled = false,
  size = "md",
  variant = "default",
  className,
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";

  const sizeStyles = {
    icon: "p-2",
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  const variantStyles = {
    default:
      "bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500 disabled:opacity-50 disabled:pointer-events-none",
    outline:
      "border border-gray-300 text-gray-700 hover:bg-gray-100 focus:ring-gray-400 disabled:opacity-50 disabled:pointer-events-none",
    ghost:
      "bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-400 disabled:opacity-50 disabled:pointer-events-none",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
    >
      {children}
    </button>
  );
}
