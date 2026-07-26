'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

type ProductRow = {
  id: string;
  name: string;
  volume_ml: number | null;
  packaging_unit: string | null;
  packaging_unit_qty: number | null;
  daily_production_qty: number | null;
  daily_box_count: number | null;
  box_count_12h: number | null;
};

type Props = { products: ProductRow[] };

type FormData = {
  name: string;
  volume_ml: string;
  packaging_unit: string;
  packaging_unit_qty: string;
  daily_production_qty: string;
  daily_box_count: string;
  box_count_12h: string;
};

const EMPTY_FORM: FormData = {
  name: '', volume_ml: '', packaging_unit: '박스',
  packaging_unit_qty: '', daily_production_qty: '',
  daily_box_count: '', box_count_12h: '',
};

export function ProductTable({ products }: Props): React.ReactElement {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filtered = products.filter((p) => {
    if (!search) return true;
    return p.name.toLowerCase().includes(search.toLowerCase());
  });

  function openAdd(): void {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  }

  function openEdit(p: ProductRow): void {
    setEditingId(p.id);
    setForm({
      name: p.name,
      volume_ml: p.volume_ml?.toString() ?? '',
      packaging_unit: p.packaging_unit ?? '박스',
      packaging_unit_qty: p.packaging_unit_qty?.toString() ?? '',
      daily_production_qty: p.daily_production_qty?.toString() ?? '',
      daily_box_count: p.daily_box_count?.toString() ?? '',
      box_count_12h: p.box_count_12h?.toString() ?? '',
    });
    setError('');
    setShowForm(true);
  }

  async function handleSave(): Promise<void> {
    if (!form.name.trim()) { setError('제품명을 입력하세요.'); return; }
    setSaving(true); setError('');

    const body = {
      ...(editingId ? { id: editingId } : {}),
      name: form.name.trim(),
      volume_ml: parseInt(form.volume_ml) || null,
      packaging_unit: form.packaging_unit || null,
      packaging_unit_qty: parseInt(form.packaging_unit_qty) || null,
      daily_production_qty: parseInt(form.daily_production_qty) || null,
      daily_box_count: parseFloat(form.daily_box_count) || null,
      box_count_12h: parseFloat(form.box_count_12h) || null,
    };

    try {
      const res = await fetch('/api/products', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const err = await res.json(); setError(err.error ?? '저장 실패'); return; }
      setShowForm(false);
      router.refresh();
    } catch { setError('저장 중 오류'); } finally { setSaving(false); }
  }

  async function handleDelete(id: string, name: string): Promise<void> {
    if (!confirm(`"${name}" 제품을 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
      if (res.ok) router.refresh();
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input placeholder="제품명 검색..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <span className="text-muted-foreground text-sm">{filtered.length}종</span>
        <Button size="sm" onClick={openAdd} className="ml-auto">+ 제품 추가</Button>
      </div>

      {showForm && (
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">{editingId ? '제품 수정' : '제품 추가'}</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div><Label>제품명 *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>용량(ml)</Label><Input type="number" value={form.volume_ml} onChange={(e) => setForm({ ...form, volume_ml: e.target.value })} /></div>
            <div>
              <Label>포장단위</Label>
              <select value={form.packaging_unit} onChange={(e) => setForm({ ...form, packaging_unit: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm">
                <option value="박스">박스</option>
                <option value="파렛트">파렛트</option>
                <option value="필름">필름</option>
              </select>
            </div>
            <div><Label>포장수량</Label><Input type="number" value={form.packaging_unit_qty} onChange={(e) => setForm({ ...form, packaging_unit_qty: e.target.value })} /></div>
            <div><Label>일생산량</Label><Input type="number" value={form.daily_production_qty} onChange={(e) => setForm({ ...form, daily_production_qty: e.target.value })} /></div>
            <div><Label>일 박스수</Label><Input type="number" step="0.1" value={form.daily_box_count} onChange={(e) => setForm({ ...form, daily_box_count: e.target.value })} /></div>
            <div><Label>12h 박스수 *</Label><Input type="number" step="0.1" value={form.box_count_12h} onChange={(e) => setForm({ ...form, box_count_12h: e.target.value })} /></div>
          </div>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? '저장 중...' : editingId ? '수정' : '추가'}</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>취소</Button>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left font-medium">제품명</th>
                <th className="px-4 py-3 text-right font-medium">용량(ml)</th>
                <th className="px-4 py-3 text-left font-medium">포장단위</th>
                <th className="px-4 py-3 text-right font-medium">포장수량</th>
                <th className="px-4 py-3 text-right font-medium">일생산량</th>
                <th className="px-4 py-3 text-right font-medium">일 박스수</th>
                <th className="px-4 py-3 text-right font-medium">12h 박스수</th>
                <th className="px-4 py-3 text-center font-medium">관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-right font-mono">{p.volume_ml?.toLocaleString() ?? '-'}</td>
                  <td className="px-4 py-3">{p.packaging_unit ?? '-'}</td>
                  <td className="px-4 py-3 text-right font-mono">{p.packaging_unit_qty ?? '-'}</td>
                  <td className="px-4 py-3 text-right font-mono">{p.daily_production_qty?.toLocaleString() ?? '-'}</td>
                  <td className="px-4 py-3 text-right font-mono">{p.daily_box_count?.toFixed(1) ?? '-'}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{p.box_count_12h?.toFixed(1) ?? '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>수정</Button>
                      <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(p.id, p.name)}>삭제</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="text-muted-foreground px-4 py-8 text-center">검색 결과가 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
