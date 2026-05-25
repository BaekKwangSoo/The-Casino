-- ══════════════════════════════════════════
--  Casino DB 초기화 스크립트
-- ══════════════════════════════════════════

-- 유저 테이블
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  username    VARCHAR(30) UNIQUE NOT NULL,
  password    VARCHAR(100) NOT NULL,
  balance     NUMERIC(15,2) DEFAULT 10000.00,  -- 초기 지급 크레딧
  total_bet   NUMERIC(15,2) DEFAULT 0,
  total_win   NUMERIC(15,2) DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW(),
  last_login  TIMESTAMP DEFAULT NOW()
);

-- 게임 라운드 테이블
CREATE TABLE IF NOT EXISTS game_rounds (
  id          SERIAL PRIMARY KEY,
  game_type   VARCHAR(20) NOT NULL DEFAULT 'sicbo',
  dice1       SMALLINT,
  dice2       SMALLINT,
  dice3       SMALLINT,
  total_sum   SMALLINT,
  started_at  TIMESTAMP DEFAULT NOW(),
  ended_at    TIMESTAMP
);

-- 베팅 내역 테이블
CREATE TABLE IF NOT EXISTS bets (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  round_id    INTEGER REFERENCES game_rounds(id) ON DELETE CASCADE,
  bet_type    VARCHAR(30) NOT NULL,   -- big, small, odd, even, triple_any, ...
  bet_value   VARCHAR(20),            -- 특정 숫자/조합값 (nullable)
  amount      NUMERIC(10,2) NOT NULL,
  payout      NUMERIC(10,2),          -- 당첨금 (null = 미정산)
  is_win      BOOLEAN,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 트랜잭션 내역 테이블
CREATE TABLE IF NOT EXISTS transactions (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type            VARCHAR(20) NOT NULL,  -- 'bet', 'win', 'deposit'
  amount          NUMERIC(10,2) NOT NULL,
  balance_after   NUMERIC(15,2) NOT NULL,
  description     TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_bets_user_id    ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_round_id   ON bets(round_id);
CREATE INDEX IF NOT EXISTS idx_trans_user_id   ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_rounds_type     ON game_rounds(game_type);

-- 테스트 계정 (개발용)
INSERT INTO users (username, password, balance)
VALUES ('guest', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 10000)
ON CONFLICT (username) DO NOTHING;
-- guest 비밀번호: password
