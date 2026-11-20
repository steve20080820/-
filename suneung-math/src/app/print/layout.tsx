export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-stone-200 print:bg-white">{children}</div>;
}
