/** Mode fokus notebook: tanpa header/footer situs agar toolbar editor sticky tidak tertutup. */
export default function NotebookFocusLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-white dark:bg-[#202124]">
      {children}
    </div>
  )
}
