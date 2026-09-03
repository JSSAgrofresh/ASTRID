function DiffLine({ line }: { line: string }) {
  const tone = line.startsWith("+") && !line.startsWith("+++")
    ? "text-success"
    : line.startsWith("-") && !line.startsWith("---")
      ? "text-danger"
      : line.startsWith("@@")
        ? "text-gold-ink"
        : "text-muted";

  return <div className={tone}>{line || " "}</div>;
}

export function DiffView({ diff, maxHeightClass = "max-h-72" }: { diff: string; maxHeightClass?: string }) {
  const lines = diff ? diff.split("\n") : [];
  if (lines.length === 0) return null;

  return (
    <pre className={`${maxHeightClass} overflow-auto px-3.5 py-2.5 font-mono text-[11px] leading-relaxed`}>
      {lines.map((line, index) => (
        <DiffLine key={index} line={line} />
      ))}
    </pre>
  );
}
