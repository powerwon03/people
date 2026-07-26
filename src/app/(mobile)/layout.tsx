import Link from 'next/link';

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-background sticky top-0 z-40 flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="font-bold">
          새한프라텍
        </Link>
        <span className="text-muted-foreground ml-2 text-sm">모바일</span>
      </header>
      <main className="p-4">{children}</main>
      <nav className="bg-background fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-around border-t">
        <Link
          href="/m/status"
          className="text-muted-foreground flex flex-col items-center text-xs"
        >
          <svg className="mb-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          가동현황
        </Link>
        <Link
          href="/m/schedule"
          className="text-muted-foreground flex flex-col items-center text-xs"
        >
          <svg className="mb-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          근무표
        </Link>
        <Link
          href="/m/assignment"
          className="text-muted-foreground flex flex-col items-center text-xs"
        >
          <svg className="mb-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          배치표
        </Link>
      </nav>
    </div>
  );
}
