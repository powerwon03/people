import { LaborReport } from '@/components/reports/labor-report';

export default function LaborReportPage(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">근무실적 리포트</h1>
        <p className="text-muted-foreground text-sm">기간별 근무일수, 특근, 소속별 집계를 확인합니다.</p>
      </div>
      <LaborReport />
    </div>
  );
}
