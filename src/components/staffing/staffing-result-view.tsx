'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Plan = {
  id: string;
  week_start_date: string;
  revision: number;
  status: string;
};

type FactoryResult = {
  factory_id: string;
  equipment_details: Record<string, number>;
  base_required: number;
  packaging_additional: number;
  combination_additional: number;
  total_required: number;
};

type DateResult = {
  date: string;
  shift: string;
  results: FactoryResult[];
  available_count: number;
  total_required: number;
  gap: number;
  equipment_count: number;
};

type BatchResponse = {
  plan_id: string;
  results: DateResult[];
  summary: {
    total_dates: number;
    total_required: number;
    total_available: number;
  };
};

type Props = {
  plans: Plan[];
  employeeCount: number;
};

function dayName(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
}

function shortDate(dateStr: string): string {
  const parts = dateStr.split('-');
  return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
}

export function StaffingResultView({ plans, employeeCount }: Props): React.ReactElement {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchResponse | null>(null);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // 저장된 산출 결과 로드
  async function loadSavedResults(planId: string): Promise<void> {
    setLoading(true);
    try {
      const res = await fetch(`/api/staffing/calculate?plan_id=${planId}`);
      const data = await res.json();
      if (data.saved && data.results?.length > 0) {
        setBatchResult(data);
        setIsSaved(true);
      } else {
        setBatchResult(null);
        setIsSaved(false);
      }
    } catch {
      setBatchResult(null);
    } finally {
      setLoading(false);
    }
  }

  // 산출 실행 (계산 + DB 저장)
  async function handleBatchCalculate(): Promise<void> {
    if (!selectedPlan) return;
    setCalculating(true);

    try {
      const res = await fetch('/api/staffing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: selectedPlan, batch: true }),
      });
      const data = await res.json();
      if (data.results) {
        setBatchResult(data);
        setIsSaved(true);
      }
    } catch {
      // 에러 처리
    } finally {
      setCalculating(false);
    }
  }

  function handleSelectPlan(planId: string): void {
    setSelectedPlan(planId);
    setBatchResult(null);
    setExpandedDate(null);
    setIsSaved(false);
    loadSavedResults(planId);
  }

  const selectedPlanData = plans.find((p) => p.id === selectedPlan);

  return (
    <div className="space-y-4">
      {/* 생산계획 선택 */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">생산계획 선택</h3>
          {selectedPlan && (
            <div className="flex items-center gap-2">
              {loading && <span className="text-muted-foreground text-sm">로딩...</span>}
              {isSaved && <Badge variant="outline" className="text-green-600">저장됨</Badge>}
              <Button size="sm" onClick={handleBatchCalculate} disabled={calculating || loading}>
                {calculating ? '산출 중...' : isSaved ? '재산출' : '전체 인원산출 실행'}
              </Button>
            </div>
          )}
        </div>

        {plans.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">
            등록된 생산계획이 없습니다. 주간 생산계획을 먼저 입력해주세요.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => handleSelectPlan(plan.id)}
                className={cn(
                  'rounded-md border px-3 py-2 text-sm text-left',
                  selectedPlan === plan.id
                    ? 'border-primary bg-primary/10'
                    : 'hover:bg-muted',
                )}
              >
                <div className="font-medium">{plan.week_start_date} 주</div>
                <Badge variant={plan.status === '확정' ? 'default' : 'secondary'} className="mt-1">
                  {plan.status}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* 일괄 산출 결과 */}
      {batchResult && batchResult.results.length > 0 && (
        <>
          {/* 요약 카드 */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-4 text-center">
              <p className="text-muted-foreground text-sm">산출 일수</p>
              <p className="text-3xl font-bold">{batchResult.summary.total_dates}</p>
              <p className="text-muted-foreground text-xs">{selectedPlanData?.week_start_date} 주</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-muted-foreground text-sm">총 필요인원 (연인원)</p>
              <p className="text-3xl font-bold">{batchResult.summary.total_required}명</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-muted-foreground text-sm">총 가용인원 (연인원)</p>
              <p className="text-3xl font-bold">{batchResult.summary.total_available}명</p>
            </Card>
          </div>

          {/* 날짜별 결과 테이블 */}
          <Card className="overflow-hidden">
            <div className="border-b bg-gray-50 px-4 py-3">
              <h3 className="font-semibold">날짜별 인원산출 결과</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/50">
                    <th className="px-4 py-2.5 text-left font-medium">날짜</th>
                    <th className="px-4 py-2.5 text-center font-medium">교대</th>
                    <th className="px-4 py-2.5 text-right font-medium">가동설비</th>
                    <th className="px-4 py-2.5 text-right font-medium">필요인원</th>
                    <th className="px-4 py-2.5 text-right font-medium">가용인원</th>
                    <th className="px-4 py-2.5 text-right font-medium">과부족</th>
                    <th className="px-4 py-2.5 text-center font-medium">상세</th>
                  </tr>
                </thead>
                <tbody>
                  {batchResult.results.map((r) => {
                    const key = `${r.date}_${r.shift}`;
                    const isExpanded = expandedDate === key;
                    const isWeekend = [0, 6].includes(new Date(r.date + 'T00:00:00').getDay());

                    return (
                      <tr key={key} className="group">
                        {/* 메인 행 */}
                        <td className={cn('border-b px-4 py-2.5 font-medium', isWeekend && 'text-red-600')}>
                          {shortDate(r.date)} ({dayName(r.date)})
                        </td>
                        <td className="border-b px-4 py-2.5 text-center">
                          <Badge variant={r.shift === '주간' ? 'default' : 'secondary'}>
                            {r.shift}
                          </Badge>
                        </td>
                        <td className="border-b px-4 py-2.5 text-right font-mono">
                          {r.equipment_count}대
                        </td>
                        <td className="border-b px-4 py-2.5 text-right font-mono font-semibold">
                          {r.total_required}명
                        </td>
                        <td className="border-b px-4 py-2.5 text-right font-mono">
                          {r.available_count}명
                        </td>
                        <td className={cn(
                          'border-b px-4 py-2.5 text-right font-mono font-semibold',
                          r.gap > 0 && 'text-green-600',
                          r.gap < 0 && 'text-red-600',
                        )}>
                          {r.gap > 0 ? '+' : ''}{r.gap}
                        </td>
                        <td className="border-b px-4 py-2.5 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setExpandedDate(isExpanded ? null : key)}
                          >
                            {isExpanded ? '접기' : '보기'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* 선택된 날짜 상세 */}
          {expandedDate && (() => {
            const r = batchResult.results.find(
              (res) => `${res.date}_${res.shift}` === expandedDate,
            );
            if (!r) return null;

            return (
              <Card className="overflow-hidden">
                <div className="border-b bg-gray-50 px-4 py-3">
                  <h3 className="font-semibold">
                    {shortDate(r.date)} ({dayName(r.date)}) {r.shift} 상세
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  {r.results.map((fr, idx) => {
                    const factoryName = fr.factory_id.includes('f1') ? '1공장' : '2공장';
                    return (
                      <div key={idx}>
                        <h4 className="mb-2 font-medium">{factoryName}</h4>
                        <div className="mb-2 flex flex-wrap gap-3 text-sm">
                          <span>기본: <strong>{fr.base_required}명</strong></span>
                          {fr.packaging_additional > 0 && (
                            <span className="text-blue-600">포장추가: <strong>+{fr.packaging_additional}명</strong></span>
                          )}
                          {fr.combination_additional > 0 && (
                            <span className="text-orange-600">조합추가: <strong>+{fr.combination_additional}명</strong></span>
                          )}
                          <span className="font-semibold">합계: {fr.total_required}명</span>
                        </div>
                        {Object.keys(fr.equipment_details).length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(fr.equipment_details).map(([code, count]) => (
                              <Badge key={code} variant="outline" className="font-mono text-xs">
                                {code}: {count}명
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })()}
        </>
      )}

      {/* 산출 데이터 없을 때 */}
      {batchResult && batchResult.results.length === 0 && (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">
            이 생산계획에 설비 가동 데이터가 없습니다. 주간 생산계획에서 설비 상태를 입력해주세요.
          </p>
        </Card>
      )}

      {/* 참고 정보 */}
      <Card className="p-4">
        <p className="text-muted-foreground text-sm">
          총 등록 직원: <strong>{employeeCount}명</strong> (3조 교대, 매일 약 {Math.round(employeeCount * 2 / 3)}명 근무)
        </p>
      </Card>
    </div>
  );
}
