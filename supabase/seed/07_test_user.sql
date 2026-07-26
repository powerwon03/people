-- ============================================
-- 테스트 사용자 생성
-- Supabase Auth에 사용자 추가 + user_profiles 매핑
--
-- 주의: 이 SQL은 Supabase SQL Editor에서 실행
-- auth.users 테이블에 직접 INSERT하는 방식
-- ============================================

-- 관리자 계정 생성
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'admin@saehan.co.kr',
  crypt('saehan1234!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"관리자"}',
  false,
  'authenticated',
  'authenticated',
  ''
) ON CONFLICT (id) DO NOTHING;

-- auth.identities 추가 (Supabase Auth 필수)
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  provider,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'admin@saehan.co.kr',
  'email',
  '{"sub":"a0000000-0000-0000-0000-000000000001","email":"admin@saehan.co.kr"}',
  now(),
  now(),
  now()
) ON CONFLICT (provider_id, provider) DO NOTHING;

-- 관리자 프로필
INSERT INTO saehan_user_profiles (id, role, permissions)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'admin',
  '{read,write,manage}'
) ON CONFLICT (id) DO NOTHING;
