interface AppHeaderProps {
  eyebrow: string;
  title: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
}

export default function AppHeader({ eyebrow, title, icon, action }: AppHeaderProps) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{
          border: "1px solid rgba(205,168,104,.2)",
          background: "linear-gradient(145deg, rgba(205,168,104,.12), rgba(255,255,255,.02))",
          color: "var(--gold)",
        }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div
          style={{
            fontSize: "10px",
            letterSpacing: ".28em",
            textTransform: "uppercase",
            color: "var(--faint)",
          }}
        >
          {eyebrow}
        </div>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(1.8rem, 5vw, 2.8rem)",
            fontWeight: 600,
            letterSpacing: "-.04em",
            lineHeight: 1,
            color: "var(--text)",
          }}
        >
          {title}
        </h1>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
