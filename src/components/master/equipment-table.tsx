'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type EquipmentRow = {
  id: string;
  code: string;
  name: string | null;
  type: string | null;
  stage: string | null;
  air_usage_33k: number;
  air_usage_25k: number;
  air_usage_37k: number;
  is_active: boolean;
  factory_id: string;
  factory: { name: string } | null;
};

type Factory = { id: string; name: string };
type ProductOption = { id: string; name: string; volume_ml: number | null };
type LinkedProduct = { id: string; product_id: string; is_default: boolean; product: { id: string; name: string; volume_ml: number | null; box_count_12h: number | null } | null };
type Props = { equipment: EquipmentRow[]; factories: Factory[]; products: ProductOption[] };

type FormData = {
  code: string;
  name: string;
  type: string;
  stage: string;
  factory_id: string;
  air_usage_33k: string;
  air_usage_25k: string;
};

export function EquipmentTable({ equipment, factories, products }: Props): React.ReactElement {
  const router = useRouter();
  const [selectedFactory, setSelectedFactory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({
    code: '', name: '', type: '', stage: '',
    factory_id: factories[0]?.id ?? '',
    air_usage_33k: '0', air_usage_25k: '0',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // 생산 가능 제품 관리
  const [productPanelId, setProductPanelId] = useState<string | null>(null);
  const [linkedProducts, setLinkedProducts] = useState<LinkedProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  async function openProductPanel(eqId: string): Promise<void> {
    setProductPanelId(eqId);
    setLoadingProducts(true);
    setProductSearch('');
    try {
      const res = await fetch(`/api/equipment-products?equipment_id=${eqId}`);
      const data = await res.json();
      setLinkedProducts(data);
    } catch { setLinkedProducts([]); }
    finally { setLoadingProducts(false); }
  }

  async function handleLinkProduct(productId: string): Promise<void> {
    if (!productPanelId) return;
    await fetch('/api/equipment-products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipment_id: productPanelId, product_id: productId }),
    });
    openProductPanel(productPanelId);
  }

  async function handleUnlinkProduct(id: string): Promise<void> {
    await fetch(`/api/equipment-products?id=${id}`, { method: 'DELETE' });
    if (productPanelId) openProductPanel(productPanelId);
  }

  const linkedProductIds = new Set(linkedProducts.map((lp) => lp.product_id));
  const availableProducts = products.filter((p) =>
    !linkedProductIds.has(p.id) &&
    (!productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()))
  );

  const filtered = equipment.filter((eq) => {
    if (selectedFactory !== 'all' && eq.factory_id !== selectedFactory) return false;
    if (search) {
      const q = search.toLowerCase();
      return eq.code.toLowerCase().includes(q) || (eq.name?.toLowerCase().includes(q) ?? false) || (eq.type?.toLowerCase().includes(q) ?? false);
    }
    return true;
  });

  const totalAir33k = filtered.filter((eq) => eq.is_active).reduce((s, eq) => s + (eq.air_usage_33k ?? 0), 0);
  const totalAir25k = filtered.filter((eq) => eq.is_active).reduce((s, eq) => s + (eq.air_usage_25k ?? 0), 0);

  function openAdd(): void {
    setEditingId(null);
    setForm({ code: '', name: '', type: '', stage: '', factory_id: factories[0]?.id ?? '', air_usage_33k: '0', air_usage_25k: '0' });
    setError('');
    setShowForm(true);
  }

  function openEdit(eq: EquipmentRow): void {
    setEditingId(eq.id);
    setForm({
      code: eq.code, name: eq.name ?? '', type: eq.type ?? '', stage: eq.stage ?? '',
      factory_id: eq.factory_id,
      air_usage_33k: String(eq.air_usage_33k ?? 0), air_usage_25k: String(eq.air_usage_25k ?? 0),
    });
    setError('');
    setShowForm(true);
  }

  async function handleSave(): Promise<void> {
    if (!form.code.trim()) { setError('코드를 입력하세요.'); return; }
    setSaving(true); setError('');
    const body = {
      ...(editingId ? { id: editingId } : {}),
      code: form.code.trim(), name: form.name.trim() || null, type: form.type.trim() || null,
      stage: form.stage.trim() || null, factory_id: form.factory_id,
      air_usage_33k: parseFloat(form.air_usage_33k) || 0,
      air_usage_25k: parseFloat(form.air_usage_25k) || 0,
    };
    try {
      const res = await fetch('/api/equipment', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const err = await res.json(); setError(err.error ?? '저장 실패'); return; }
      setShowForm(false);
      router.refresh();
    } catch { setError('저장 중 오류'); } finally { setSaving(false); }
  }

  async function handleDelete(id: string, code: string): Promise<void> {
    if (!confirm(`설비 "${code}"를 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/equipment?id=${id}`, { method: 'DELETE' });
      if (res.ok) router.refresh();
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setSelectedFactory('all')} className={cn('rounded-md px-3 py-1.5 text-sm font-medium', selectedFactory === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
          전체 ({equipment.length})
        </button>
        {factories.map((f) => (
          <button key={f.id} onClick={() => setSelectedFactory(f.id)} className={cn('rounded-md px-3 py-1.5 text-sm font-medium', selectedFactory === f.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
            {f.name} ({equipment.filter((eq) => eq.factory_id === f.id).length})
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <Input placeholder="설비코드/이름/타입 검색..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <div className="text-muted-foreground text-sm">33k {totalAir33k.toFixed(1)}㎥ | 25k {totalAir25k.toFixed(1)}㎥</div>
        <Button size="sm" onClick={openAdd} className="ml-auto">+ 설비 추가</Button>
      </div>

      {showForm && (
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">{editingId ? '설비 수정' : '설비 추가'}</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div><Label>코드 *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
            <div><Label>설비명</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>타입</Label><Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="AOKI, DPH, PF, PB..." /></div>
            <div><Label>스테이지</Label><Input value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} placeholder="1STAGE, 2STAGE, PE, 캡..." /></div>
            <div>
              <Label>공장</Label>
              <select value={form.factory_id} onChange={(e) => setForm({ ...form, factory_id: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm">
                {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div><Label>33k (㎥/min)</Label><Input type="number" step="0.1" value={form.air_usage_33k} onChange={(e) => setForm({ ...form, air_usage_33k: e.target.value })} /></div>
            <div><Label>25k (㎥/min)</Label><Input type="number" step="0.1" value={form.air_usage_25k} onChange={(e) => setForm({ ...form, air_usage_25k: e.target.value })} /></div>
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
                <th className="px-3 sm:px-4 py-3 text-left font-medium">코드</th>
                <th className="px-3 sm:px-4 py-3 text-left font-medium hidden sm:table-cell">설비명</th>
                <th className="px-3 sm:px-4 py-3 text-left font-medium">타입</th>
                <th className="px-3 sm:px-4 py-3 text-left font-medium hidden md:table-cell">공장</th>
                <th className="px-3 sm:px-4 py-3 text-right font-medium hidden md:table-cell">33k</th>
                <th className="px-3 sm:px-4 py-3 text-right font-medium hidden md:table-cell">25k</th>
                <th className="px-3 sm:px-4 py-3 text-center font-medium">상태</th>
                <th className="px-3 sm:px-4 py-3 text-center font-medium">관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((eq) => (
                <tr key={eq.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-3 sm:px-4 py-3 font-mono font-medium">{eq.code}</td>
                  <td className="px-3 sm:px-4 py-3 hidden sm:table-cell">{eq.name ?? '-'}</td>
                  <td className="px-3 sm:px-4 py-3">{eq.type ?? '-'}</td>
                  <td className="px-3 sm:px-4 py-3 hidden md:table-cell">{eq.factory?.name ?? '-'}</td>
                  <td className="px-3 sm:px-4 py-3 text-right font-mono hidden md:table-cell">{eq.air_usage_33k > 0 ? eq.air_usage_33k.toFixed(1) : '-'}</td>
                  <td className="px-3 sm:px-4 py-3 text-right font-mono hidden md:table-cell">{eq.air_usage_25k > 0 ? eq.air_usage_25k.toFixed(1) : '-'}</td>
                  <td className="px-3 sm:px-4 py-3 text-center"><Badge variant={eq.is_active ? 'default' : 'secondary'}>{eq.is_active ? '가동' : '비가동'}</Badge></td>
                  <td className="px-3 sm:px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openProductPanel(eq.id)}>제품</Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(eq)}>수정</Button>
                      <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(eq.id, eq.code)}>삭제</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="text-muted-foreground px-4 py-8 text-center">검색 결과가 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 생산 가능 제품 관리 패널 */}
      {productPanelId && (() => {
        const eq = equipment.find((e) => e.id === productPanelId);
        if (!eq) return null;

        return (
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">
                설비 <span className="font-mono">{eq.code}</span> - 생산 가능 제품
              </h3>
              <Button size="sm" variant="ghost" onClick={() => setProductPanelId(null)}>닫기</Button>
            </div>

            {loadingProducts ? (
              <p className="text-muted-foreground text-sm">로딩...</p>
            ) : (
              <div className="space-y-3">
                {/* 연결된 제품 목록 */}
                {linkedProducts.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {linkedProducts.map((lp) => (
                      <Badge key={lp.id} variant="secondary" className="gap-1 py-1 pl-2 pr-1">
                        {lp.product?.name ?? '?'}
                        {lp.product?.volume_ml && <span className="text-muted-foreground">({lp.product.volume_ml}ml)</span>}
                        <button
                          onClick={() => handleUnlinkProduct(lp.id)}
                          className="ml-1 rounded-full p-0.5 hover:bg-gray-300"
                        >
                          ✕
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">연결된 제품이 없습니다.</p>
                )}

                {/* 제품 추가 */}
                <div>
                  <Input
                    placeholder="제품명 검색하여 추가..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="mb-2 max-w-sm"
                  />
                  {productSearch && availableProducts.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded border">
                      {availableProducts.slice(0, 10).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => { handleLinkProduct(p.id); setProductSearch(''); }}
                          className="block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                        >
                          {p.name}
                          {p.volume_ml && <span className="text-muted-foreground ml-1">({p.volume_ml}ml)</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {productSearch && availableProducts.length === 0 && (
                    <p className="text-muted-foreground text-xs">일치하는 제품이 없습니다.</p>
                  )}
                </div>
              </div>
            )}
          </Card>
        );
      })()}
    </div>
  );
}
