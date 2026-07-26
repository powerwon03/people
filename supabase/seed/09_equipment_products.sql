-- ============================================
-- 설비-제품 연결 시드 데이터
-- Excel 생산배대 기반 주요 설비별 생산 가능 제품
-- ============================================

-- 1공장 01호 (AOKI) - 쌈장, 김치 등
INSERT INTO saehan_equipment_products (equipment_id, product_id, is_default)
SELECT 'e0100000-0000-0000-0000-000000000001', id, name = '대상 쌈장 450ML'
FROM saehan_products WHERE name IN ('대상 쌈장 450ML', '대상 김치 300ML', '새한 3.6L', '새한 5.0L')
ON CONFLICT DO NOTHING;

-- 1공장 02호 (AOKI)
INSERT INTO saehan_equipment_products (equipment_id, product_id, is_default)
SELECT 'e0200000-0000-0000-0000-000000000002', id, name = '대상 쌈장 450ML'
FROM saehan_products WHERE name IN ('대상 쌈장 450ML', '대상 김치 300ML', '대상 양념장 840ML')
ON CONFLICT DO NOTHING;

-- 1공장 03호 (AOKI)
INSERT INTO saehan_equipment_products (equipment_id, product_id, is_default)
SELECT 'e0300000-0000-0000-0000-000000000003', id, false
FROM saehan_products WHERE name IN ('대상 김치 300ML', '대상 양념장 840ML')
ON CONFLICT DO NOTHING;

-- 1공장 04~07호 (DPH, PF 등)
INSERT INTO saehan_equipment_products (equipment_id, product_id, is_default)
SELECT 'e0400000-0000-0000-0000-000000000004', id, false
FROM saehan_products WHERE name IN ('대상 양념장 840ML', '소금 180ML')
ON CONFLICT DO NOTHING;

INSERT INTO saehan_equipment_products (equipment_id, product_id, is_default)
SELECT 'e0500000-0000-0000-0000-000000000005', id, false
FROM saehan_products WHERE name IN ('소금 180ML', '소주 200ML')
ON CONFLICT DO NOTHING;

INSERT INTO saehan_equipment_products (equipment_id, product_id, is_default)
SELECT 'e0600000-0000-0000-0000-000000000006', id, false
FROM saehan_products WHERE name IN ('소주 200ML', '대상 양념장 840ML')
ON CONFLICT DO NOTHING;

INSERT INTO saehan_equipment_products (equipment_id, product_id, is_default)
SELECT 'e0700000-0000-0000-0000-000000000007', id, false
FROM saehan_products WHERE name IN ('유지류 900ML')
ON CONFLICT DO NOTHING;

-- 1공장 08~09호 (DPH 세트)
INSERT INTO saehan_equipment_products (equipment_id, product_id, is_default)
SELECT 'e0800000-0000-0000-0000-000000000008', id, false
FROM saehan_products WHERE name IN ('소금 180ML', '소주 200ML')
ON CONFLICT DO NOTHING;

INSERT INTO saehan_equipment_products (equipment_id, product_id, is_default)
SELECT 'e0900000-0000-0000-0000-000000000009', id, false
FROM saehan_products WHERE name IN ('소주 200ML')
ON CONFLICT DO NOTHING;

-- 1공장 13호 (PF) - 유지류
INSERT INTO saehan_equipment_products (equipment_id, product_id, is_default)
SELECT 'e0d00000-0000-0000-0000-000000000013', id, true
FROM saehan_products WHERE name IN ('유지류 900ML')
ON CONFLICT DO NOTHING;

-- 1공장 15호 (PB2) - 뽀로로
INSERT INTO saehan_equipment_products (equipment_id, product_id, is_default)
SELECT 'e0f00000-0000-0000-0000-000000000015', id, true
FROM saehan_products WHERE name IN ('뽀로로 235ML')
ON CONFLICT DO NOTHING;

-- 1공장 16호 (PB1) - 테일러
INSERT INTO saehan_equipment_products (equipment_id, product_id, is_default)
SELECT 'e1000000-0000-0000-0000-000000000016', id, false
FROM saehan_products WHERE name IN ('테일러 946ML UV', '테일러 1.89L UV', '호프 1.5L [ALC 40g]')
ON CONFLICT DO NOTHING;

-- 2공장 S1호 - 테일러, 진로 (인원산출 핵심 설비)
INSERT INTO saehan_equipment_products (equipment_id, product_id, is_default)
SELECT 'e5100000-0000-0000-0000-000000000026', id, false
FROM saehan_products WHERE name IN ('테일러 946ML UV', '테일러 1.89L UV', '진로 2.7L 20%', '진로 2.7L 25%', '진로 4.0L', '진로 4.0L [200]')
ON CONFLICT DO NOTHING;

-- 2공장 S2호 - CJ
INSERT INTO saehan_equipment_products (equipment_id, product_id, is_default)
SELECT 'e5200000-0000-0000-0000-000000000027', id, true
FROM saehan_products WHERE name IN ('CJ 1.2L')
ON CONFLICT DO NOTHING;

-- 2공장 S3호 - 미작
INSERT INTO saehan_equipment_products (equipment_id, product_id, is_default)
SELECT 'e5300000-0000-0000-0000-000000000028', id, true
FROM saehan_products WHERE name IN ('미작 830ML')
ON CONFLICT DO NOTHING;

-- 2공장 S4호 - 간장, 참기름 (참기름 1.5 = 2명 규칙)
INSERT INTO saehan_equipment_products (equipment_id, product_id, is_default)
SELECT 'e5400000-0000-0000-0000-000000000029', id, false
FROM saehan_products WHERE name IN ('간장 1.8L', '참기름 1.5L', '참기름 1.5 CL')
ON CONFLICT DO NOTHING;

-- 2공장 S5호 - 미림
INSERT INTO saehan_equipment_products (equipment_id, product_id, is_default)
SELECT 'e5500000-0000-0000-0000-000000000030', id, true
FROM saehan_products WHERE name IN ('미림 1.8L')
ON CONFLICT DO NOTHING;

-- 2공장 S6호 - 탁주
INSERT INTO saehan_equipment_products (equipment_id, product_id, is_default)
SELECT 'e5600000-0000-0000-0000-000000000031', id, true
FROM saehan_products WHERE name IN ('탁주 1.7L')
ON CONFLICT DO NOTHING;

-- 2공장 S7호 - 소주
INSERT INTO saehan_equipment_products (equipment_id, product_id, is_default)
SELECT 'e5700000-0000-0000-0000-000000000032', id, false
FROM saehan_products WHERE name IN ('소주 1.8L', '소주 2.7L R [105G]')
ON CONFLICT DO NOTHING;
