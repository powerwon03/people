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
      <main className="px-4 py-4 pt-20 sm:px-6 sm:py-6 lg:pl-68 lg:pt-22">
        {children}
      </main>
    </div>
  );
}
