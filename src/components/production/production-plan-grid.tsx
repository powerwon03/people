'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type EquipmentItem = {
  id: string;
  code: string;
  name: string | null;
  type: string | null;
  factory_id: string;
  factory: { id: string; name: string } | null;
};

type ProductItem = {
  id: string;
  name: string;
  volume_ml: number | null;
  box_count_12h: number | null;
};

type CellStatus = '가동' | '대기' | '부동' | '금형이상' | '몰드체인지' | 'confirm';

type CellData = {
  product_id: string | null;
  product_name: string;
  status: CellStatus;
};

type Props = {
  equipment: EquipmentItem[];
  products: ProductItem[];
};

const STATUS_COLORS: Record<string, string> = {
  '가동': 'bg-green-100 text-green-800',
  '대기': 'bg-yellow-100 text-yellow-800',
  '부동': 'bg-gray-100 text-gray-500',
  '금형이상': 'bg-red-100 text-red-800',
  '몰드체인지': 'bg-purple-100 text-purple-800',
  'confirm': 'bg-blue-100 text-blue-800',
};

const ALL_STATUSES: CellStatus[] = ['가동', '대기', '부동', '금형이상', '몰드체인지', 'confirm'];

function getWeekDates(baseDate: Date): Date[] {
  const monday = new Date(baseDate);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDay(d: Date): string {
  return ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
}

function shortProductName(name: string): string {
  if (name.length <= 8) return name;
  return name.substring(0, 7) + '…';
}

export function ProductionPlanGrid({ equipment, products }: Props): React.ReactElement {
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [selectedFactory, setSelectedFactory] = useState<string>('all');
  const [shift, setShift] = useState<'주간' | '야간'>('주간');
  const [cells, setCells] = useState<Record<string, CellData>>({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [planId, setPlanId] = useState<string | null>(null);
  const [planStatus, setPlanStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 셀 편집 팝업
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [eqProducts, setEqProducts] = useState<Record<string, ProductItem[]>>({});
  // 최근 변경된 셀 추적
  const [recentlyChanged, setRecentlyChanged] = useState<Set<string>>(new Set());
  // Excel 업로드
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const baseDate = useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() + currentWeekOffset * 7);
    return now;
  }, [currentWeekOffset]);

  const weekDates = useMemo(() => getWeekDates(baseDate), [baseDate]);
  const mondayStr = useMemo(() => toLocalDateStr(weekDates[0]), [weekDates]);

  const factories = useMemo(() => {
    const map = new Map<string, string>();
    equipment.forEach((eq) => {
      if (eq.factory?.id && eq.factory?.name) map.set(eq.factory.id, eq.factory.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [equipment]);

  const filteredEquipment = equipment.filter(
    (eq) => selectedFactory === 'all' || eq.factory_id === selectedFactory,
  );

  const isReadOnly = planStatus === '확정';

  function isPastDate(dateStr: string): boolean {
    const today = toLocalDateStr(new Date());
    return dateStr < today;
  }

  // 설비별 생산 가능 제품 로드
  const loadEquipmentProducts = useCallback(async (eqId: string): Promise<ProductItem[]> => {
    if (eqProducts[eqId]) return eqProducts[eqId];
    try {
      const res = await fetch(`/api/equipment-products?equipment_id=${eqId}`);
      const data = await res.json();
      const items: ProductItem[] = (data ?? [])
        .filter((d: { product: ProductItem | null }) => d.product)
        .map((d: { product: ProductItem }) => d.product);
      setEqProducts((prev) => ({ ...prev, [eqId]: items }));
      return items;
    } catch {
      return [];
    }
  }, [eqProducts]);

  // DB 로드
  const loadPlan = useCallback(async (): Promise<void> => {
    setLoading(true);
    setSaveMessage('');
    try {
      const res = await fetch(`/api/production-plans?week_start=${mondayStr}`);
      const plans = await res.json();
      if (plans.length > 0) {
        const plan = plans[0];
        setPlanId(plan.id);
        setPlanStatus(plan.status);
        const loaded: Record<string, CellData> = {};
        const eqIds = new Set(equipment.map((e) => e.id));
        for (const detail of plan.details ?? []) {
          if (eqIds.has(detail.equipment_id)) {
            loaded[`${detail.equipment_id}_${detail.date}_${detail.shift}`] = {
              product_id: detail.product_id ?? null,
              product_name: detail.product?.name ?? '',
              status: detail.status,
            };
          }
        }
        setCells(loaded);
      } else {
        setPlanId(null);
        setPlanStatus('');
        setCells({});
      }
      setHasChanges(false);
    } catch { setSaveMessage('데이터 로드 실패'); }
    finally { setLoading(false); }
  }, [mondayStr, equipment]);

  useEffect(() => { loadPlan(); }, [loadPlan]);

  // 저장
  async function handleSave(): Promise<void> {
    setSaving(true);
    setSaveMessage('');
    const weekDateStrs = new Set(weekDates.map((d) => toLocalDateStr(d)));
    const details = Object.entries(cells)
      .filter(([key]) => weekDateStrs.has(key.split('_')[1]))
      .map(([key, cell]) => {
        const parts = key.split('_');
        return {
          equipment_id: parts[0], date: parts[1], shift: parts[2],
          product_id: cell.product_id, status: cell.status, notes: null,
        };
      });
    try {
      const res = await fetch('/api/production-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start_date: mondayStr, details }),
      });
      if (res.ok) {
        const plan = await res.json();
        setPlanId(plan.id);
        setPlanStatus('잠정');
        setHasChanges(false);
        setSaveMessage('저장 완료');
      } else {
        const err = await res.json();
        setSaveMessage(`오류: ${err.error}`);
      }
    } catch { setSaveMessage('저장 중 오류'); }
    finally { setSaving(false); }
  }

  function getCellKey(equipmentId: string, dateStr: string): string {
    return `${equipmentId}_${dateStr}_${shift}`;
  }

  // 셀 클릭 → 편집 팝업 열기 (즉시 등록하지 않음)
  async function handleCellClick(equipmentId: string, dateStr: string): Promise<void> {
    if (isReadOnly || isPastDate(dateStr)) return;

    const key = getCellKey(equipmentId, dateStr);
    if (editingCell === key) {
      setEditingCell(null);
      return;
    }
    setEditingCell(key);

    // 해당 설비의 생산 가능 제품 로드
    await loadEquipmentProducts(equipmentId);
  }

  // 상태 선택 시에만 셀 생성 (빈칸 클릭만으로는 등록되지 않음)
  function handleSetStatus(equipmentId: string, dateStr: string, status: CellStatus): void {
    const key = getCellKey(equipmentId, dateStr);
    const existing = cells[key];
    if (existing) {
      handleStatusChange(key, status);
    } else {
      setCells((prev) => ({ ...prev, [key]: { product_id: null, product_name: '', status } }));
      setHasChanges(true);
    }
    markRecentlyChanged(key);
  }

  function markRecentlyChanged(key: string): void {
    setRecentlyChanged((prev) => new Set(prev).add(key));
    setTimeout(() => {
      setRecentlyChanged((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 3000);
  }

  function handleStatusChange(key: string, status: CellStatus): void {
    if (status !== '가동') {
      setCells((prev) => ({ ...prev, [key]: { ...prev[key], status, product_id: null, product_name: '' } }));
    } else {
      setCells((prev) => ({ ...prev, [key]: { ...prev[key], status } }));
    }
    setHasChanges(true);
    markRecentlyChanged(key);
  }

  function handleProductChange(key: string, productId: string): void {
    const product = products.find((p) => p.id === productId);
    setCells((prev) => ({
      ...prev,
      [key]: { ...prev[key], product_id: productId || null, product_name: product?.name ?? '' },
    }));
    setHasChanges(true);
    markRecentlyChanged(key);
    setEditingCell(null);
  }

  // Excel 업로드 처리
  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setSaveMessage('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('week_start_date', mondayStr);
    formData.append('shift', shift);

    try {
      const res = await fetch('/api/production-plans/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const result = await res.json();
        setSaveMessage(`업로드 완료: ${result.count}건 반영`);
        await loadPlan();
      } else {
        const err = await res.json();
        setSaveMessage(`업로드 오류: ${err.error}`);
      }
    } catch {
      setSaveMessage('업로드 중 오류');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // Excel 템플릿 다운로드
  function downloadTemplate(): void {
    const headers = ['설비코드', ...weekDates.map((d) => toLocalDateStr(d))];
    const rows = filteredEquipment.map((eq) => {
      const cols = [eq.code];
      weekDates.forEach((d) => {
        const key = getCellKey(eq.id, toLocalDateStr(d));
        const cell = cells[key];
        cols.push(cell ? cell.status : '');
      });
      return cols;
    });

    const csvContent = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `생산계획_${mondayStr}_${shift}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClearCell(key: string): void {
    setCells((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setEditingCell(null);
    setHasChanges(true);
  }

  return (
    <div className="space-y-4">
      {/* 컨트롤바 */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => { setCurrentWeekOffset((v) => v - 1); setEditingCell(null); }}>←</Button>
            <Button variant="outline" size="sm" onClick={() => { setCurrentWeekOffset(0); setEditingCell(null); }}>이번주</Button>
            <Button variant="outline" size="sm" onClick={() => { setCurrentWeekOffset((v) => v + 1); setEditingCell(null); }}>→</Button>
          </div>
          <div className="flex gap-1">
            {(['주간', '야간'] as const).map((s) => (
              <Button key={s} variant={shift === s ? 'default' : 'outline'} size="sm" onClick={() => { setShift(s); setEditingCell(null); }}>{s}</Button>
            ))}
          </div>
          <div className="flex gap-1">
            <button onClick={() => setSelectedFactory('all')}
              className={cn('rounded-md px-3 py-1.5 text-sm font-medium min-h-[36px]', selectedFactory === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>전체</button>
            {factories.map((f) => (
              <button key={f.id} onClick={() => setSelectedFactory(f.id)}
                className={cn('rounded-md px-3 py-1.5 text-sm font-medium min-h-[36px]', selectedFactory === f.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>{f.name}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {planId && <Badge variant={planStatus === '확정' ? 'default' : 'secondary'}>{planStatus}</Badge>}
          {loading && <span className="text-muted-foreground text-sm">로딩...</span>}
          {saveMessage && <span className={cn('text-sm', saveMessage.startsWith('오류') || saveMessage.includes('실패') || saveMessage.includes('오류') ? 'text-red-500' : 'text-green-600')}>{saveMessage}</span>}
          {isReadOnly && <span className="text-sm text-amber-600 font-medium">확정된 계획 (수정 불가)</span>}
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <Button size="sm" variant="outline" onClick={downloadTemplate}>
              CSV 다운로드
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading || isReadOnly}>
              {uploading ? '업로드 중...' : 'CSV 업로드'}
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
            <Button size="sm" onClick={handleSave} disabled={saving || isReadOnly || Object.keys(cells).length === 0} variant={hasChanges ? 'default' : 'outline'}>
              {saving ? '저장 중...' : hasChanges ? '변경사항 저장' : '잠정 저장'}
            </Button>
            <span className="text-muted-foreground text-sm">{filteredEquipment.length}대 | {shift}</span>
          </div>
        </div>
      </div>

      {/* 그리드 */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-20">
              <tr className="border-b bg-gray-50">
                <th className="sticky left-0 z-30 bg-gray-50 px-2 py-2 text-left font-medium min-w-[60px] sm:min-w-[80px]">설비</th>
                {weekDates.map((d) => {
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <th key={d.toISOString()} className={cn('min-w-[80px] sm:min-w-[120px] px-1 sm:px-2 py-2 text-center font-medium', isWeekend ? 'bg-red-50 text-red-600' : 'bg-gray-50')}>
                      <div>{formatDate(d)}</div>
                      <div className="text-xs font-normal">({formatDay(d)})</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredEquipment.map((eq) => (
                <tr key={eq.id} className="border-b last:border-0">
                  <td className="sticky left-0 z-10 bg-white px-3 py-2">
                    <div className="font-mono font-medium">{eq.code}</div>
                    <div className="text-muted-foreground text-xs">{eq.type}</div>
                  </td>
                  {weekDates.map((d) => {
                    const dateStr = toLocalDateStr(d);
                    const key = getCellKey(eq.id, dateStr);
                    const cell = cells[key];
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    const isEditing = editingCell === key;
                    const linkedProducts = eqProducts[eq.id] ?? [];

                    const isCellLocked = isReadOnly || isPastDate(dateStr);

                    const isRecentlyChanged = recentlyChanged.has(key);

                    return (
                      <td key={dateStr}
                        className={cn(
                          'border-l px-1 py-1 text-center relative',
                          isWeekend && 'bg-red-50/30',
                          isEditing && 'bg-blue-50',
                          isRecentlyChanged && 'ring-2 ring-inset ring-amber-400',
                          isCellLocked && 'opacity-60 cursor-not-allowed',
                        )}
                        onClick={() => !isEditing && !isCellLocked && handleCellClick(eq.id, dateStr)}>

                        {cell ? (
                          <div className="cursor-pointer">
                            <Badge variant="outline" className={cn('text-xs', STATUS_COLORS[cell.status])}>
                              {cell.status}
                            </Badge>
                            {cell.product_name && (
                              <div className="text-[10px] text-gray-600 mt-0.5 truncate max-w-[70px] sm:max-w-[110px] mx-auto" title={cell.product_name}>
                                {shortProductName(cell.product_name)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs cursor-pointer">-</span>
                        )}

                        {/* 편집 팝업 */}
                        {isEditing && (
                          <div className="fixed inset-x-4 bottom-4 z-50 sm:absolute sm:inset-auto sm:top-full sm:left-0 sm:bottom-auto sm:w-56 mt-1 rounded-md border bg-white p-3 sm:p-2 shadow-lg text-left"
                            onClick={(e) => e.stopPropagation()}>
                            {/* 상태 선택 */}
                            <div className="mb-2">
                              <p className="text-xs font-medium text-gray-500 mb-1">상태 선택</p>
                              <div className="flex flex-wrap gap-1">
                                {ALL_STATUSES.map((s) => (
                                  <button key={s} onClick={() => handleSetStatus(eq.id, dateStr, s)}
                                    className={cn('rounded px-2 py-1.5 text-xs min-h-[36px]', cell?.status === s ? STATUS_COLORS[s] + ' ring-1 ring-gray-400' : 'bg-gray-50 hover:bg-gray-100')}>
                                    {s}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* 제품 선택 (가동일 때만) */}
                            {cell?.status === '가동' && (
                              <div className="mb-2">
                                <p className="text-xs font-medium text-gray-500 mb-1">생산 제품</p>
                                {linkedProducts.length > 0 ? (
                                  <select
                                    value={cell.product_id ?? ''}
                                    onChange={(e) => handleProductChange(key, e.target.value)}
                                    className="w-full rounded border px-2 py-1 text-xs">
                                    <option value="">선택안함</option>
                                    {linkedProducts.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name} {p.volume_ml ? `(${p.volume_ml}ml)` : ''}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <p className="text-xs text-gray-400">
                                    설비에 연결된 제품이 없습니다.<br/>
                                    설비 관리에서 제품을 연결하세요.
                                  </p>
                                )}
                              </div>
                            )}

                            <div className="flex justify-between">
                              {cell && (
                                <button onClick={() => handleClearCell(key)}
                                  className="text-xs text-red-500 hover:text-red-700">초기화</button>
                              )}
                              <button onClick={() => setEditingCell(null)}
                                className="text-xs text-gray-500 hover:text-gray-700 ml-auto">닫기</button>
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 범례 */}
      <div className="flex flex-wrap gap-2 text-xs">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <span key={status} className={cn('rounded px-2 py-1', color)}>{status}</span>
        ))}
        <span className="text-muted-foreground ml-2">셀 클릭 → 상태/제품 선택</span>
      </div>
    </div>
  );
}
