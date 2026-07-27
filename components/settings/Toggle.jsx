import { Check, X } from "lucide-react";

export default function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm text-paper">{label}</p>
        {description && <p className="mt-0.5 text-xs text-mist">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-[52px] shrink-0 rounded-full border transition-colors duration-200 ${
          checked
            ? "border-signal bg-signal/90"
            : "border-line bg-surface2"
        }`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-200 ${
            checked ? "translate-x-[26px]" : "translate-x-0.5"
          }`}
        >
          {checked ? (
            <Check className="h-3.5 w-3.5 text-signal" strokeWidth={3} />
          ) : (
            <X className="h-3.5 w-3.5 text-mist" strokeWidth={3} />
          )}
        </span>
      </button>
    </div>
  );
}