import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <Header />
      <main className="p-6 lg:pl-68">
        {children}
      </main>
    </div>
  );
}
