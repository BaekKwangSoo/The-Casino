const router   = require('express').Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../config/database');

// ── 회원가입 ───────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: '사용자명과 비밀번호를 입력하세요.' });
    }
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ message: '사용자명은 3-20자여야 합니다.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: '비밀번호는 6자 이상이어야 합니다.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (username, password) VALUES ($1, $2)
       RETURNING id, username, balance`,
      [username, hashed],
    );

    const user  = result.rows[0];
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
    );

    res.json({ token, user: { id: user.id, username: user.username, balance: user.balance } });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ message: '이미 사용 중인 사용자명입니다.' });
    }
    console.error('[Auth] 회원가입 오류:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ── 로그인 ─────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await db.query(
      `UPDATE users SET last_login=NOW()
       WHERE username=$1
       RETURNING id, username, password, balance`,
      [username],
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ message: '사용자명 또는 비밀번호가 틀렸습니다.' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ message: '사용자명 또는 비밀번호가 틀렸습니다.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, balance: parseFloat(user.balance) },
    });
  } catch (err) {
    console.error('[Auth] 로그인 오류:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ── 토큰 검증 & 유저 정보 ─────────────────────────────────
router.get('/me', require('../middleware/auth'), async (req, res) => {
  const result = await db.query(
    `SELECT id, username, balance, total_bet, total_win, created_at FROM users WHERE id=$1`,
    [req.user.id],
  );
  if (!result.rows[0]) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
  res.json({ user: result.rows[0] });
});

module.exports = router;
