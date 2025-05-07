// Created NeumorphicCard component for neumorphic UI on the hormones page. Provides a soft, elevated card with customizable padding and className.
import React from "react";

interface NeumorphicCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: string;
}

export const NeumorphicCard: React.FC<NeumorphicCardProps> = ({ children, className = "", padding = "p-6" }) => (
  <div
    className={`
      ${padding} rounded-2xl bg-[#f4ecd8] shadow-neumorphic
      transition-shadow duration-200
      ${className}
    `}
    style={{
      boxShadow:
        "8px 8px 24px #e0d6c3, -8px -8px 24px #fffbe9, 1px 1px 2px #e0d6c3 inset, -1px -1px 2px #fffbe9 inset",
      border: "1px solid #ede3c9",
    }}
  >
    {children}
  </div>
); 