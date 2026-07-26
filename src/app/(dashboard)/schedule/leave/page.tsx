import { Card } from '@/components/ui/card';

export default function LeavePage(): React.ReactElement {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">휴무/연차 관리</h1>
      <Card className="p-6">
        <p className="text-muted-foreground text-sm">
          모바일에서 휴무/연차 신청이 가능합니다.
        </p>
        <p className="text-muted-foreground mt-2 text-sm">
          승인 워크플로우와 근무계획표 자동 반영이 지원됩니다.
        </p>
      </Card>
    </div>
  );
}
