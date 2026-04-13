-- Realtime 구독 설정

-- 1. 세션 업데이트 (현재 곡, 템포 변경)
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;

-- 2. 세션 참여자 (참여자 목록, 온라인 상태)
ALTER PUBLICATION supabase_realtime ADD TABLE session_participants;

-- 3. 악보 잠금 (Pessimistic Lock 상태)
ALTER PUBLICATION supabase_realtime ADD TABLE sheet_locks;

-- 4. 드로잉 데이터 (실시간 협업)
ALTER PUBLICATION supabase_realtime ADD TABLE drawing_shapes;
ALTER PUBLICATION supabase_realtime ADD TABLE drawing_layers;

-- 5. 팀 정보 변경
ALTER PUBLICATION supabase_realtime ADD TABLE team_members;
