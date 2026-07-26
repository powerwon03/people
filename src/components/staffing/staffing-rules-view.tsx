'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type StaffingRule = {
  id: string;
  rule_code: string;
  equipment_codes: string[];
  condition_type: string;
  condition_value: Record<string, unknown> | null;
  required_headcount: number;
  is_additional: boolean;
  description: string | null;
  factory_id: string;
  factory: { name: string } | null;
};

type PackagingRule = {
  id: string;
  min_boxes: number;
  max_boxes: number | null;
  additional_headcount: number;
  factory_id: string;
  factory: { name: string } | null;
};

type Factory = { id: string; name: string };
type Props = { rules: StaffingRule[]; packagingRules: PackagingRule[]; factories: Factory[] };

const CONDITION_TYPES = ['ALWAYS', 'PRODUCT_MATCH', 'SHIFT_MATCH', 'SET_OPERATION', 'COUNT_RANGE'] as const;

function conditionLabel(type: string): string {
  const map: Record<string, string> = { ALWAYS: '가동 시', PRODUCT_MATCH: '제품 매칭', SHIFT_MATCH: '교대 조건', SET_OPERATION: '세트 운영', COUNT_RANGE: '가동 대수' };
  return map[type] ?? type;
}

function conditionBadgeColor(type: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const map: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { ALWAYS: 'default', PRODUCT_MATCH: 'secondary', SET_OPERATION: 'destructive', SHIFT_MATCH: 'outline', COUNT_RANGE: 'outline' };
  return map[type] ?? 'default';
}

type RuleForm = {
  rule_code: string;
  equipment_codes: string;
  condition_type: string;
  // 조건별 개별 필드
  product_keywords: string;      // PRODUCT_MATCH: 쉼표 구분 키워드
  shift_day_count: string;       // SHIFT_MATCH: 주간 인원
  shift_night_count: string;     // SHIFT_MATCH: 야간 인원
  set_type: string;              // SET_OPERATION: any 등
  count_min: string;             // COUNT_RANGE: 최소 대수
  count_max: string;             // COUNT_RANGE: 최대 대수
  required_headcount: string;
  is_additional: boolean;
  description: string;
};

function conditionValueToForm(type: string, value: Record<string, unknown> | null): Partial<RuleForm> {
  if (!value) return {};
  switch (type) {
    case 'PRODUCT_MATCH':
      return { product_keywords: ((value.keywords as string[]) ?? []).join(', ') };
    case 'SHIFT_MATCH':
      return { shift_day_count: String(value.day ?? 1), shift_night_count: String(value.night ?? 1) };
    case 'SET_OPERATION':
      return { set_type: String(value.type ?? 'any') };
    case 'COUNT_RANGE':
      return { count_min: String(value.min ?? 0), count_max: String(value.max ?? '') };
    default:
      return {};
  }
}

function formToConditionValue(form: RuleForm): Record<string, unknown> | null {
  switch (form.condition_type) {
    case 'ALWAYS':
      return null;
    case 'PRODUCT_MATCH':
      return { keywords: form.product_keywords.split(',').map((k) => k.trim()).filter(Boolean) };
    case 'SHIFT_MATCH':
      return { day: parseFloat(form.shift_day_count) || 1, night: parseFloat(form.shift_night_count) || 1 };
    case 'SET_OPERATION':
      return { type: form.set_type || 'any' };
    case 'COUNT_RANGE':
      return { min: parseInt(form.count_min) || 0, max: parseInt(form.count_max) || null };
    default:
      return null;
  }
}

type PkgForm = {
  min_boxes: string;
  max_boxes: string;
  additional_headcount: string;
};

export function StaffingRulesView({ rules, packagingRules, factories }: Props): React.ReactElement {
  const router = useRouter();
  const [selectedFactory, setSelectedFactory] = useState<string>(factories[0]?.id ?? '');

  // 규칙 폼 상태
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const emptyRuleForm: RuleForm = {
    rule_code: '', equipment_codes: '', condition_type: 'ALWAYS',
    product_keywords: '', shift_day_count: '1', shift_night_count: '2',
    set_type: 'any', count_min: '0', count_max: '',
    required_headcount: '1', is_additional: false, description: '',
  };
  const [ruleForm, setRuleForm] = useState<RuleForm>(emptyRuleForm);

  // 포장 규칙 폼 상태
  const [showPkgForm, setShowPkgForm] = useState(false);
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [pkgForm, setPkgForm] = useState<PkgForm>({ min_boxes: '0', max_boxes: '', additional_headcount: '2' });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filteredRules = rules.filter((r) => r.factory_id === selectedFactory);
  const filteredPackaging = packagingRules.filter((r) => r.factory_id === selectedFactory);
  const baseRules = filteredRules.filter((r) => !r.is_additional);
  const additionalRules = filteredRules.filter((r) => r.is_additional);

  // === 인원산출 규칙 CRUD ===
  function openAddRule(isAdditional: boolean): void {
    setEditingRuleId(null);
    setRuleForm({ ...emptyRuleForm, is_additional: isAdditional });
    setError(''); setShowRuleForm(true); setShowPkgForm(false);
  }

  function openEditRule(rule: StaffingRule): void {
    setEditingRuleId(rule.id);
    const condFields = conditionValueToForm(rule.condition_type, rule.condition_value);
    setRuleForm({
      ...emptyRuleForm,
      rule_code: rule.rule_code,
      equipment_codes: rule.equipment_codes.join(', '),
      condition_type: rule.condition_type,
      required_headcount: String(rule.required_headcount),
      is_additional: rule.is_additional,
      description: rule.description ?? '',
      ...condFields,
    });
    setError(''); setShowRuleForm(true); setShowPkgForm(false);
  }

  async function handleSaveRule(): Promise<void> {
    if (!ruleForm.rule_code.trim() || !ruleForm.equipment_codes.trim()) {
      setError('규칙코드와 설비코드를 입력하세요.'); return;
    }
    setSaving(true); setError('');

    const codes = ruleForm.equipment_codes.split(',').map((c) => c.trim()).filter(Boolean);
    const condValue = formToConditionValue(ruleForm);

    const body = {
      ...(editingRuleId ? { id: editingRuleId } : {}),
      factory_id: selectedFactory,
      rule_code: ruleForm.rule_code.trim(),
      equipment_codes: codes,
      condition_type: ruleForm.condition_type,
      condition_value: condValue,
      required_headcount: parseFloat(ruleForm.required_headcount) || 1,
      is_additional: ruleForm.is_additional,
      description: ruleForm.description.trim() || null,
    };

    try {
      const res = await fetch('/api/staffing-rules', {
        method: editingRuleId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const err = await res.json(); setError(err.error ?? '저장 실패'); return; }
      setShowRuleForm(false); router.refresh();
    } catch { setError('저장 중 오류'); } finally { setSaving(false); }
  }

  async function handleDeleteRule(id: string, code: string): Promise<void> {
    if (!confirm(`규칙 "${code}"를 삭제하시겠습니까?`)) return;
    await fetch(`/api/staffing-rules?id=${id}`, { method: 'DELETE' });
    router.refresh();
  }

  // === 포장박스 규칙 CRUD ===
  function openAddPkg(): void {
    setEditingPkgId(null);
    setPkgForm({ min_boxes: '0', max_boxes: '', additional_headcount: '2' });
    setError(''); setShowPkgForm(true); setShowRuleForm(false);
  }

  function openEditPkg(rule: PackagingRule): void {
    setEditingPkgId(rule.id);
    setPkgForm({
      min_boxes: String(rule.min_boxes),
      max_boxes: rule.max_boxes != null ? String(rule.max_boxes) : '',
      additional_headcount: String(rule.additional_headcount),
    });
    setError(''); setShowPkgForm(true); setShowRuleForm(false);
  }

  async function handleSavePkg(): Promise<void> {
    setSaving(true); setError('');
    const body = {
      ...(editingPkgId ? { id: editingPkgId } : {}),
      factory_id: selectedFactory,
      min_boxes: parseInt(pkgForm.min_boxes) || 0,
      max_boxes: pkgForm.max_boxes.trim() ? parseInt(pkgForm.max_boxes) : null,
      additional_headcount: parseInt(pkgForm.additional_headcount) || 0,
    };
    try {
      const res = await fetch('/api/packaging-rules', {
        method: editingPkgId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const err = await res.json(); setError(err.error ?? '저장 실패'); return; }
      setShowPkgForm(false); router.refresh();
    } catch { setError('저장 중 오류'); } finally { setSaving(false); }
  }

  async function handleDeletePkg(id: string): Promise<void> {
    if (!confirm('이 포장박스 규칙을 삭제하시겠습니까?')) return;
    await fetch(`/api/packaging-rules?id=${id}`, { method: 'DELETE' });
    router.refresh();
  }

  // === 규칙 테이블 행 렌더링 ===
  function renderRuleRow(rule: StaffingRule, isAdditional: boolean): React.ReactElement {
    return (
      <tr key={rule.id} className="border-b last:border-0 hover:bg-gray-50">
        <td className="px-4 py-2.5 font-mono text-xs">{rule.rule_code}</td>
        <td className="px-4 py-2.5">
          <div className="flex flex-wrap gap-1">
            {rule.equipment_codes.map((code) => (
              <Badge key={code} variant="outline" className="font-mono">{code}</Badge>
            ))}
          </div>
        </td>
        <td className="px-4 py-2.5">
          <Badge variant={conditionBadgeColor(rule.condition_type)}>{conditionLabel(rule.condition_type)}</Badge>
        </td>
        <td className={cn('px-4 py-2.5 text-right font-mono font-semibold', isAdditional && 'text-orange-600')}>
          {isAdditional ? '+' : ''}{rule.required_headcount}명
        </td>
        <td className="text-muted-foreground px-4 py-2.5 text-xs">{rule.description}</td>
        <td className="px-4 py-2.5 text-center">
          <div className="flex justify-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => openEditRule(rule)}>수정</Button>
            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteRule(rule.id, rule.rule_code)}>삭제</Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="space-y-6">
      {/* 공장 탭 */}
      <div className="flex gap-2">
        {factories.map((f) => (
          <button key={f.id} onClick={() => { setSelectedFactory(f.id); setShowRuleForm(false); setShowPkgForm(false); }}
            className={cn('rounded-md px-4 py-2 text-sm font-medium transition-colors', selectedFactory === f.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
            {f.name}
          </button>
        ))}
      </div>

      {/* 규칙 입력/수정 폼 */}
      {showRuleForm && (
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">{editingRuleId ? '규칙 수정' : '규칙 추가'}</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div><Label>규칙코드 *</Label><Input value={ruleForm.rule_code} onChange={(e) => setRuleForm({ ...ruleForm, rule_code: e.target.value })} placeholder="F1-01" /></div>
            <div><Label>설비코드 * (쉼표 구분)</Label><Input value={ruleForm.equipment_codes} onChange={(e) => setRuleForm({ ...ruleForm, equipment_codes: e.target.value })} placeholder="01, 02, 03" /></div>
            <div>
              <Label>조건 타입</Label>
              <select value={ruleForm.condition_type} onChange={(e) => setRuleForm({ ...ruleForm, condition_type: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm">
                {CONDITION_TYPES.map((t) => <option key={t} value={t}>{conditionLabel(t)}</option>)}
              </select>
            </div>
            <div><Label>필요인원</Label><Input type="number" step="0.5" value={ruleForm.required_headcount} onChange={(e) => setRuleForm({ ...ruleForm, required_headcount: e.target.value })} /></div>

            {/* 조건 타입별 입력 필드 */}
            {ruleForm.condition_type === 'PRODUCT_MATCH' && (
              <div className="md:col-span-2">
                <Label>제품 키워드 (쉼표 구분)</Label>
                <Input value={ruleForm.product_keywords}
                  onChange={(e) => setRuleForm({ ...ruleForm, product_keywords: e.target.value })}
                  placeholder="테일러, 946  또는  진로, 4.0" />
                <p className="text-muted-foreground mt-1 text-xs">제품명에 모든 키워드가 포함될 때 적용</p>
              </div>
            )}
            {ruleForm.condition_type === 'SHIFT_MATCH' && (
              <>
                <div>
                  <Label>주간 인원</Label>
                  <Input type="number" step="0.5" value={ruleForm.shift_day_count}
                    onChange={(e) => setRuleForm({ ...ruleForm, shift_day_count: e.target.value })} />
                </div>
                <div>
                  <Label>야간 인원</Label>
                  <Input type="number" step="0.5" value={ruleForm.shift_night_count}
                    onChange={(e) => setRuleForm({ ...ruleForm, shift_night_count: e.target.value })} />
                </div>
              </>
            )}
            {ruleForm.condition_type === 'SET_OPERATION' && (
              <div>
                <Label>세트 타입</Label>
                <select value={ruleForm.set_type}
                  onChange={(e) => setRuleForm({ ...ruleForm, set_type: e.target.value })}
                  className="w-full rounded-md border px-3 py-2 text-sm">
                  <option value="any">하나라도 가동 시 (any)</option>
                  <option value="all">모두 가동 시 (all)</option>
                </select>
              </div>
            )}
            {ruleForm.condition_type === 'COUNT_RANGE' && (
              <>
                <div>
                  <Label>최소 가동 대수</Label>
                  <Input type="number" value={ruleForm.count_min}
                    onChange={(e) => setRuleForm({ ...ruleForm, count_min: e.target.value })} />
                </div>
                <div>
                  <Label>최대 가동 대수</Label>
                  <Input type="number" value={ruleForm.count_max}
                    onChange={(e) => setRuleForm({ ...ruleForm, count_max: e.target.value })}
                    placeholder="빈칸=제한없음" />
                </div>
              </>
            )}

            <div className="md:col-span-2"><Label>설명</Label><Input value={ruleForm.description} onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })} /></div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={ruleForm.is_additional} onChange={(e) => setRuleForm({ ...ruleForm, is_additional: e.target.checked })} />
              추가인원 (조합 규칙)
            </label>
          </div>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={handleSaveRule} disabled={saving}>{saving ? '저장 중...' : editingRuleId ? '수정' : '추가'}</Button>
            <Button size="sm" variant="outline" onClick={() => setShowRuleForm(false)}>취소</Button>
          </div>
        </Card>
      )}

      {/* 포장박스 규칙 폼 */}
      {showPkgForm && (
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">{editingPkgId ? '포장박스 규칙 수정' : '포장박스 규칙 추가'}</h3>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>최소 박스수</Label><Input type="number" value={pkgForm.min_boxes} onChange={(e) => setPkgForm({ ...pkgForm, min_boxes: e.target.value })} /></div>
            <div><Label>최대 박스수 (빈칸=무한)</Label><Input type="number" value={pkgForm.max_boxes} onChange={(e) => setPkgForm({ ...pkgForm, max_boxes: e.target.value })} /></div>
            <div><Label>추가인원</Label><Input type="number" value={pkgForm.additional_headcount} onChange={(e) => setPkgForm({ ...pkgForm, additional_headcount: e.target.value })} /></div>
          </div>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={handleSavePkg} disabled={saving}>{saving ? '저장 중...' : editingPkgId ? '수정' : '추가'}</Button>
            <Button size="sm" variant="outline" onClick={() => setShowPkgForm(false)}>취소</Button>
          </div>
        </Card>
      )}

      {/* 기본 규칙 */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
          <h2 className="font-semibold">설비별 기본 인원 규칙</h2>
          <Button size="sm" variant="outline" onClick={() => openAddRule(false)}>+ 규칙 추가</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="px-4 py-2.5 text-left font-medium">규칙코드</th>
                <th className="px-4 py-2.5 text-left font-medium">설비</th>
                <th className="px-4 py-2.5 text-left font-medium">조건</th>
                <th className="px-4 py-2.5 text-right font-medium">필요인원</th>
                <th className="px-4 py-2.5 text-left font-medium">설명</th>
                <th className="px-4 py-2.5 text-center font-medium">관리</th>
              </tr>
            </thead>
            <tbody>
              {baseRules.map((rule) => renderRuleRow(rule, false))}
              {baseRules.length === 0 && <tr><td colSpan={6} className="text-muted-foreground px-4 py-6 text-center">등록된 규칙이 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 조합 추가 규칙 */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b bg-orange-50 px-4 py-3">
          <h2 className="font-semibold">설비 조합 추가 인원</h2>
          <Button size="sm" variant="outline" onClick={() => openAddRule(true)}>+ 조합 규칙 추가</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="px-4 py-2.5 text-left font-medium">규칙코드</th>
                <th className="px-4 py-2.5 text-left font-medium">설비</th>
                <th className="px-4 py-2.5 text-left font-medium">조건</th>
                <th className="px-4 py-2.5 text-right font-medium">추가인원</th>
                <th className="px-4 py-2.5 text-left font-medium">설명</th>
                <th className="px-4 py-2.5 text-center font-medium">관리</th>
              </tr>
            </thead>
            <tbody>
              {additionalRules.map((rule) => renderRuleRow(rule, true))}
              {additionalRules.length === 0 && <tr><td colSpan={6} className="text-muted-foreground px-4 py-6 text-center">등록된 조합 규칙이 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 포장박스 규칙 */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b bg-blue-50 px-4 py-3">
          <h2 className="font-semibold">포장박스 추가인원 규칙</h2>
          <Button size="sm" variant="outline" onClick={openAddPkg}>+ 포장 규칙 추가</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="px-4 py-2.5 text-left font-medium">12h 박스수 범위</th>
                <th className="px-4 py-2.5 text-right font-medium">추가인원</th>
                <th className="px-4 py-2.5 text-center font-medium">관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredPackaging.map((rule) => (
                <tr key={rule.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono">{rule.min_boxes} ~ {rule.max_boxes ?? '∞'} 박스</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-blue-600">+{rule.additional_headcount}명</td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex justify-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEditPkg(rule)}>수정</Button>
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeletePkg(rule.id)}>삭제</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPackaging.length === 0 && <tr><td colSpan={3} className="text-muted-foreground px-4 py-6 text-center">등록된 포장 규칙이 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
