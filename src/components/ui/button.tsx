// Created Button component (shadcn/ui style) with Tailwind variants: default, secondary, destructive, ghost.
import * as React from "react";
import { cn } from "../utils";

type Variant = "default" | "secondary" | "destructive" | "ghost";

const variantClasses: Record<Variant, string> = {
  default:
    "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600",
  secondary:
    "bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600",
  destructive:
    "bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600",
  ghost:
    "bg-transparent text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800 border border-transparent",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "px-4 py-2 rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:pointer-events-none",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button"; 