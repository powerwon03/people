'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type EmployeeRow = {
  id: string;
  name: string;
  department: string;
  shift_group: string;
  role: string;
  gender: string;
  affiliation: string;
  locker_number: string | null;
};

type Props = {
  employees: EmployeeRow[];
};

const DEPARTMENTS = ['생산1팀PET', '생산1팀PE', '생산2팀'] as const;
const SHIFT_GROUPS = ['A', 'B', 'C'] as const;
const ROLES = ['반장', 'OP', '운반포장', '검사원'] as const;
const AFFILIATIONS = ['새한', '세영', '다연', '피너'] as const;

type FormData = {
  name: string;
  department: string;
  shift_group: string;
  role: string;
  gender: string;
  affiliation: string;
  locker_number: string;
};

const EMPTY_FORM: FormData = {
  name: '',
  department: '생산1팀PET',
  shift_group: 'A',
  role: 'OP',
  gender: 'M',
  affiliation: '새한',
  locker_number: '',
};

export function EmployeeTable({ employees }: Props): React.ReactElement {
  const router = useRouter();
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [search, setSearch] = useState('');

  // CRUD 상태
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filtered = employees.filter((emp) => {
    if (selectedDept !== 'all' && emp.department !== selectedDept) return false;
    if (selectedGroup !== 'all' && emp.shift_group !== selectedGroup) return false;
    if (search) {
      const q = search.toLowerCase();
      return emp.name.toLowerCase().includes(q) || emp.affiliation.toLowerCase().includes(q);
    }
    return true;
  });

  function openAdd(): void {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  }

  function openEdit(emp: EmployeeRow): void {
    setEditingId(emp.id);
    setForm({
      name: emp.name,
      department: emp.department,
      shift_group: emp.shift_group,
      role: emp.role,
      gender: emp.gender,
      affiliation: emp.affiliation,
      locker_number: emp.locker_number ?? '',
    });
    setError('');
    setShowForm(true);
  }

  async function handleSave(): Promise<void> {
    if (!form.name.trim()) {
      setError('이름을 입력하세요.');
      return;
    }
    setSaving(true);
    setError('');

    const body = {
      ...(editingId ? { id: editingId } : {}),
      name: form.name.trim(),
      department: form.department,
      shift_group: form.shift_group,
      role: form.role,
      gender: form.gender,
      affiliation: form.affiliation,
      locker_number: form.locker_number.trim() || null,
    };

    try {
      const res = await fetch('/api/employees', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error ?? '저장 실패');
        return;
      }

      setShowForm(false);
      router.refresh();
    } catch {
      setError('저장 중 오류 발생');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string): Promise<void> {
    if (!confirm(`"${name}" 직원을 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/employees?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
      }
    } catch {
      // 에러 무시
    }
  }

  return (
    <div className="space-y-4">
      {/* 부서 필터 */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedDept('all')}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            selectedDept === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80',
          )}
        >
          전체 ({employees.length})
        </button>
        {DEPARTMENTS.map((dept) => {
          const count = employees.filter((e) => e.department === dept).length;
          return (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                selectedDept === dept ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {dept} ({count})
            </button>
          );
        })}
      </div>

      {/* 조 필터 + 검색 + 추가 버튼 */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-1">
          {['all', ...SHIFT_GROUPS].map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGroup(g)}
              className={cn(
                'rounded-md px-2.5 py-1 text-sm font-medium transition-colors',
                selectedGroup === g ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {g === 'all' ? '전체' : `${g}조`}
            </button>
          ))}
        </div>
        <Input
          placeholder="이름/소속 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <span className="text-muted-foreground text-sm">{filtered.length}명</span>
        <Button size="sm" onClick={openAdd} className="ml-auto">
          + 직원 추가
        </Button>
      </div>

      {/* 입력/수정 폼 */}
      {showForm && (
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">{editingId ? '직원 수정' : '직원 추가'}</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <Label>이름 *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>부서</Label>
              <select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <Label>조</Label>
              <select
                value={form.shift_group}
                onChange={(e) => setForm({ ...form, shift_group: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                {SHIFT_GROUPS.map((g) => <option key={g} value={g}>{g}조</option>)}
              </select>
            </div>
            <div>
              <Label>역할</Label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <Label>성별</Label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="M">남</option>
                <option value="F">여</option>
              </select>
            </div>
            <div>
              <Label>소속</Label>
              <select
                value={form.affiliation}
                onChange={(e) => setForm({ ...form, affiliation: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                {AFFILIATIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <Label>사물함 번호</Label>
              <Input value={form.locker_number} onChange={(e) => setForm({ ...form, locker_number: e.target.value })} />
            </div>
          </div>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? '저장 중...' : editingId ? '수정' : '추가'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
              취소
            </Button>
          </div>
        </Card>
      )}

      {/* 테이블 */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left font-medium">이름</th>
                <th className="px-4 py-3 text-left font-medium">부서</th>
                <th className="px-4 py-3 text-center font-medium">조</th>
                <th className="px-4 py-3 text-left font-medium">역할</th>
                <th className="px-4 py-3 text-center font-medium">성별</th>
                <th className="px-4 py-3 text-left font-medium">소속</th>
                <th className="px-4 py-3 text-center font-medium">사물함</th>
                <th className="px-4 py-3 text-center font-medium">관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => (
                <tr key={emp.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{emp.name}</td>
                  <td className="px-4 py-3">{emp.department}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="outline">{emp.shift_group}조</Badge>
                  </td>
                  <td className="px-4 py-3">{emp.role}</td>
                  <td className="px-4 py-3 text-center">{emp.gender === 'M' ? '남' : '여'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={emp.affiliation === '새한' ? 'default' : 'secondary'}>
                      {emp.affiliation}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center font-mono">{emp.locker_number ?? '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(emp)}>
                        수정
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(emp.id, emp.name)}
                      >
                        삭제
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-muted-foreground px-4 py-8 text-center">
                    검색 결과가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
