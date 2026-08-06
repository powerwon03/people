'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navigation = [
  {
    title: '대시보드',
    href: '/dashboard',
  },
  {
    title: '생산계획',
    items: [
      { title: '주간 생산계획', href: '/production/plan' },
      { title: '설비 가동현황', href: '/production/equipment' },
    ],
  },
  {
    title: '인력관리',
    items: [
      { title: '인원산출 결과', href: '/staffing/calculate' },
      { title: '인력배치표', href: '/staffing/assign' },
      { title: '산출 규칙 관리', href: '/staffing/rules' },
    ],
  },
  {
    title: '근무관리',
    items: [
      { title: '연간 근무계획표', href: '/schedule/annual' },
      { title: '휴무/연차 관리', href: '/schedule/leave' },
    ],
  },
  {
    title: '리포트',
    items: [
      { title: '근무실적 리포트', href: '/reports/labor' },
    ],
  },
  {
    title: '마스터 데이터',
    items: [
      { title: '직원 관리', href: '/master/employees' },
      { title: '제품 관리', href: '/master/products' },
      { title: '설비 관리', href: '/master/equipment' },
    ],
  },
];

function NavContent(): React.ReactElement {
  const pathname = usePathname();

  return (
    <nav className="space-y-1 p-4">
      {navigation.map((section) => {
        if ('href' in section && section.href) {
          return (
            <Link
              key={section.title}
              href={section.href}
              className={cn(
                'block rounded-md px-3 py-2.5 text-sm font-medium min-h-[44px] flex items-center',
                pathname === section.href
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {section.title}
            </Link>
          );
        }

        return (
          <div key={section.title} className="pt-4">
            <p className="text-muted-foreground px-3 pb-1 text-xs font-semibold uppercase tracking-wider">
              {section.title}
            </p>
            {'items' in section &&
              section.items?.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'block rounded-md px-3 py-2.5 text-sm min-h-[44px] flex items-center',
                    pathname === item.href
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  {item.title}
                </Link>
              ))}
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar(): React.ReactElement {
  return (
    <aside className="bg-background fixed inset-y-0 left-0 z-50 hidden w-64 border-r lg:block">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="text-lg font-bold">
          새한프라텍
        </Link>
      </div>
      <NavContent />
    </aside>
  );
}

export function MobileSidebar(): React.ReactElement {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b px-6">
        <span className="text-lg font-bold">새한프라텍</span>
      </div>
      <NavContent />
    </div>
  );
}
