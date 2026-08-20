import { CLASS_ORDER, classTheme } from "@/lib/hsclasses";

interface ClassFilterBarProps {
  counts: Record<string, number>;
  active: string;
  onChange: (value: string) => void;
}

export default function ClassFilterBar({ counts, active, onChange }: ClassFilterBarProps) {
  const classes = CLASS_ORDER.filter((key) => (counts[key] ?? 0) > 0);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-wrap gap-2" data-testid="class-filter-bar">
      <button
        type="button"
        onClick={() => onChange("ALL")}
        data-testid="class-filter-all"
        className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
          active === "ALL"
            ? "border-amber-500/60 bg-amber-500/15 text-amber-300"
            : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        All decks <span className="ml-1.5 font-mono text-xs opacity-70">{total}</span>
      </button>
      {classes.map((key) => {
        const theme = classTheme(key);
        const isActive = active === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            data-testid={`class-filter-${key.toLowerCase()}`}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${isActive ? "" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}
            style={isActive ? { borderColor: theme.color, backgroundColor: theme.bg, color: theme.color } : undefined}
          >
            {theme.icon ? <img src={theme.icon} alt="" className="mr-1.5 inline-block size-5 align-[-0.28rem]" /> : null}
            {theme.name}
            <span className="ml-1.5 font-mono text-xs opacity-70">{counts[key]}</span>
          </button>
        );
      })}
    </div>
  );
}
