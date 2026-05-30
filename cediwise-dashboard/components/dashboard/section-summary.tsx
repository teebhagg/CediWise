interface SectionSummaryProps {
  text: string;
}

export function SectionSummary({ text }: SectionSummaryProps) {
  return (
    <p className="text-balance text-sm leading-relaxed text-muted-foreground">
      {text}
    </p>
  );
}
