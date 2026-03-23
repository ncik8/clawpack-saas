import Sidebar from '@/components/dashboard/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <Sidebar />
      <main className="ml-60">
        {children}
      </main>
    </div>
  );
}
