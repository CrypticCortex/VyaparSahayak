// Minimal layout for public order pages -- no dashboard chrome

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b px-4 py-3 text-center">
        <h1 className="text-lg font-bold text-gray-900">
          Vyapar<span className="text-orange-500">Sahayak</span>
        </h1>
      </header>
      <main className="mx-auto max-w-[480px] px-4 py-6">
        {children}
      </main>
    </div>
  );
}
