-- ============================================
-- 설비-제품 연결 테이블 (다대다)
-- 어떤 설비에서 어떤 제품을 생산할 수 있는지 관리
-- ============================================

CREATE TABLE saehan_equipment_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES saehan_equipment(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES saehan_products(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(equipment_id, product_id)
);

CREATE INDEX idx_saehan_eq_products_equipment ON saehan_equipment_products(equipment_id);
CREATE INDEX idx_saehan_eq_products_product ON saehan_equipment_products(product_id);

ALTER TABLE saehan_equipment_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_eq_products" ON saehan_equipment_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_eq_products" ON saehan_equipment_products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_delete_eq_products" ON saehan_equipment_products FOR DELETE TO authenticated USING (true);
