// Updated MeasurementSelect: fix click to select measurement, close dropdown, and make input/dropdown box larger.
import React, { useState, useRef } from "react";

export interface MeasurementSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

function toReadableLabel(key: string) {
  // Convert e.g. "BMXWAIST" or "bideltoid_breadth" to "Bideltoid Breadth"
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/([A-Z]+)/g, (m) => m.charAt(0) + m.slice(1).toLowerCase())
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .trim();
}

export const MeasurementSelect: React.FC<MeasurementSelectProps> = ({ options, value, onChange, className }) => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = options.filter((opt) =>
    toReadableLabel(opt).toLowerCase().includes(search.toLowerCase())
  );

  // Close dropdown on blur unless clicking an option
  function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setOpen(false);
    }
  }

  function handleSelect(opt: string) {
    onChange(opt);
    setSearch("");
    setOpen(false);
  }

  return (
    <div
      className={`relative ${className ?? ""}`}
      tabIndex={-1}
      onBlur={handleBlur}
    >
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="search measurement"
          className="w-full font-mono lowercase border-2 border-black bg-black text-white px-4 py-3 mb-1 text-lg"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="toggle dropdown"
          className="border-2 border-black bg-black text-white px-3 py-3 mb-1 font-mono lowercase text-lg"
          onClick={() => {
            setOpen((o) => !o);
            if (!open) inputRef.current?.focus();
          }}
        >
          {open ? "▲" : "▼"}
        </button>
      </div>
      {open && (
        <div className="max-h-60 overflow-y-auto border-2 border-black bg-black absolute w-full z-10 text-lg">
          {filtered.length === 0 && (
            <div className="px-4 py-2 text-gray-400 font-mono lowercase">no results</div>
          )}
          {filtered.map((opt) => (
            <div
              key={opt}
              tabIndex={0}
              className={`px-4 py-2 cursor-pointer font-mono lowercase hover:bg-gray-800 ${opt === value ? "bg-gray-700" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(opt);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleSelect(opt);
                }
              }}
            >
              {toReadableLabel(opt)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 