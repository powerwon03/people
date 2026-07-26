'use client';

import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { MobileSidebar } from './sidebar';

export function Header(): React.ReactElement {
  const router = useRouter();

  async function handleLogout(): Promise<void> {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="bg-background sticky top-0 z-40 flex h-16 items-center border-b px-4 lg:pl-68">
      {/* 모바일 메뉴 */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger className="rounded-md p-2 hover:bg-gray-100">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <MobileSidebar />
          </SheetContent>
        </Sheet>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          로그아웃
        </Button>
      </div>
    </header>
  );
}
