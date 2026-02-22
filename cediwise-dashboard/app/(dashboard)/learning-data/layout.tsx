import { LearningDataNav } from "./nav";

export default function LearningDataLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <LearningDataNav />
      {children}
    </div>
  );
}
