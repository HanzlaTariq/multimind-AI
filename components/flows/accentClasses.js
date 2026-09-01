// Tailwind's JIT scanner only picks up class names it can see as literal
// strings in source. Building these with a template literal like
// `text-${accent}-400` would work at runtime but get purged from the
// production CSS bundle, since the scanner never sees "text-amber-400"
// as a whole string anywhere. This table exists so every class is
// spelled out literally once.
export const ACCENT_CLASSES = {
  amber: {
    icon: "text-amber-400",
    border: "border-amber-400/40",
    borderHover: "hover:border-amber-400/60",
    dot: "bg-amber-400",
    bg: "bg-amber-400/10",
  },
  violet: {
    icon: "text-violet-400",
    border: "border-violet-400/40",
    borderHover: "hover:border-violet-400/60",
    dot: "bg-violet-400",
    bg: "bg-violet-400/10",
  },
  sky: {
    icon: "text-sky-400",
    border: "border-sky-400/40",
    borderHover: "hover:border-sky-400/60",
    dot: "bg-sky-400",
    bg: "bg-sky-400/10",
  },
  emerald: {
    icon: "text-emerald-400",
    border: "border-emerald-400/40",
    borderHover: "hover:border-emerald-400/60",
    dot: "bg-emerald-400",
    bg: "bg-emerald-400/10",
  },
};

export function accentClasses(accent) {
  return ACCENT_CLASSES[accent] || ACCENT_CLASSES.violet;
}
