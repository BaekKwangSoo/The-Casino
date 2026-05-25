import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useStore from '../store/useStore';
import { disconnectSocket } from '../socket/socketClient';
import './LobbyPage.css';

const GAMES = [
  { id: 'sicbo',     name: '다이사이 (식보)', icon: '🎲', available: true,  desc: '3개의 주사위로 즐기는 실시간 멀티플레이어 게임', players: '~100명' },
  { id: 'baccarat',  name: '바카라',          icon: '🃏', available: false, desc: '뱅커와 플레이어 중 높은 패를 맞히는 카드 게임', players: '준비중' },
  { id: 'roulette',  name: '룰렛',            icon: '🎡', available: false, desc: '회전하는 바퀴 위의 볼이 멈추는 곳을 예측하세요', players: '준비중' },
  { id: 'blackjack', name: '블랙잭',          icon: '♠️', available: false, desc: '21을 넘지 않는 범위에서 딜러를 이겨보세요',     players: '준비중' },
  { id: 'slots',     name: '슬롯머신',        icon: '🎰', available: false, desc: '심볼을 맞춰 잭팟을 노려보세요',                players: '준비중' },
  { id: 'poker',     name: '포커',            icon: '🂡', available: false, desc: '최고의 패로 상대방을 이겨보세요',               players: '준비중' },
];

export default function LobbyPage() {
  const navigate   = useNavigate();
  const { user, logout, updateBalance } = useStore();
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    // 다이사이 현재 인원 조회
    axios.get('/api/game/sicbo/state')
      .then((res) => setLiveCount(res.data.playerCount || 0))
      .catch(() => {});

    // 잔액 최신화
    axios.get('/api/auth/me')
      .then((res) => updateBalance(res.data.user.balance))
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/');
  };

  return (
    <div className="lobby-page">
      {/* 헤더 */}
      <header className="lobby-header">
        <button className="logo-btn" onClick={() => navigate('/')}>🎲 Casino Royal</button>
        <div className="header-right">
          <span className="balance-display">💰 {Number(user?.balance || 0).toLocaleString()} CR</span>
          <span className="username">{user?.username}</span>
          <button className="btn btn-outline" onClick={handleLogout}>로그아웃</button>
        </div>
      </header>

      <main className="lobby-main">
        <h2 className="lobby-title">게임 선택</h2>
        <p className="lobby-sub">플레이할 게임을 선택하세요</p>

        <div className="games-grid">
          {GAMES.map((game) => (
            <div
              key={game.id}
              className={`game-card ${game.available ? 'available' : 'locked'}`}
              onClick={() => game.available && navigate(`/game/${game.id}`)}
            >
              <div className="game-icon">{game.icon}</div>
              <div className="game-info">
                <h3>{game.name}</h3>
                <p>{game.desc}</p>
                <div className="game-meta">
                  {game.available ? (
                    <span className="live-badge">
                      🟢 {game.id === 'sicbo' ? liveCount : 0}명 플레이 중
                    </span>
                  ) : (
                    <span className="coming-badge">🔒 {game.players}</span>
                  )}
                </div>
              </div>
              {game.available && (
                <button className="btn btn-gold play-btn">플레이</button>
              )}
              {!game.available && (
                <div className="lock-overlay">COMING SOON</div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
