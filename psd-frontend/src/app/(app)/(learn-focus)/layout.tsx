/** Mode fokus belajar: tanpa header/footer situs, layar penuh. */
export default function LearnFocusLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-neutral-900">
      {children}
    </div>
  )
}
