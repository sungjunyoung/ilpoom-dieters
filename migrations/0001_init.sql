-- 일품 다이어트 추적기 초기 스키마
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  pin_salt TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  must_setup INTEGER NOT NULL DEFAULT 1,
  start_weight REAL,
  goal_weight REAL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE weights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL, -- YYYY-MM-DD
  weight REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (user_id, date)
);

-- 수정/삭제 이력 (수정 내역은 전체 공개)
CREATE TABLE weight_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('update', 'delete')),
  old_weight REAL NOT NULL,
  new_weight REAL,
  changed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE INDEX idx_weights_user_date ON weights(user_id, date);
CREATE INDEX idx_revisions_user ON weight_revisions(user_id, changed_at);
CREATE INDEX idx_comments_to ON comments(to_user_id, created_at);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- 초기 어드민 유저 (초기 패스워드: 0000, 최초 로그인 시 변경 강제)
INSERT INTO users (name, pin_hash, pin_salt, is_admin, must_setup)
VALUES (
  '관리자',
  'f2306ef8e77cfd10cb0236973305381837cad538da946da6d787806b7ea900d7',
  '99e69bd44f173019c7c2cfb70e866f46',
  1,
  1
);
