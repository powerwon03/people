-- ============================================
-- 기존 잘못된 사용자 데이터 정리 후 재생성
-- Supabase SQL Editor에서 실행
-- ============================================

-- 기존 데이터 정리
DELETE FROM saehan_user_profiles WHERE id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM auth.identities WHERE user_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM auth.users WHERE id = 'a0000000-0000-0000-0000-000000000001';

-- 이메일 중복 확인 후 삭제
DELETE FROM auth.identities WHERE provider_id = 'admin@saehan.co.kr';
DELETE FROM auth.users WHERE email = 'admin@saehan.co.kr';
