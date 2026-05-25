import React from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { disconnectSocket } from '../socket/socketClient';
import './MainPage.css';

export default function MainPage() {
  const navigate = useNavigate();
  const { user, logout } = useStore();

  const handleExit = () => {
    if (confirm('게임을 종료하시겠습니까?')) {
      disconnectSocket();
      logout();
      window.close();
    }
  };

  return (
    <div className="main-page">
      {/* 배경 파티클 */}
      <div className="bg-particles">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="particle" style={{ '--i': i }} />
        ))}
      </div>

      <div className="main-content fade-in">
        {/* 로고 */}
        <div className="logo-section">
          <div className="logo-icon">🎲</div>
          <h1 className="logo-title">Casino Royal</h1>
          <p className="logo-sub">최고의 카지노 경험을 즐기세요</p>
        </div>

        {/* 메뉴 */}
        <nav className="main-menu">
          {user ? (
            <>
              <div className="user-greeting">
                안녕하세요, <span className="gold">{user.username}</span>님!
                <span className="balance">💰 {Number(user.balance).toLocaleString()} 크레딧</span>
              </div>
              <button className="menu-btn primary" onClick={() => navigate('/lobby')}>
                🎮 게임 시작
              </button>
              <button className="menu-btn secondary" onClick={() => navigate('/lobby?tab=settings')}>
                ⚙️ 설정
              </button>
              <button className="menu-btn danger" onClick={handleExit}>
                🚪 게임 종료
              </button>
            </>
          ) : (
            <>
              <button className="menu-btn primary" onClick={() => navigate('/login')}>
                🎮 게임 시작
              </button>
              <button className="menu-btn secondary" onClick={() => navigate('/login?mode=register')}>
                📝 회원가입
              </button>
              <button className="menu-btn danger" onClick={handleExit}>
                🚪 종료
              </button>
            </>
          )}
        </nav>

        {/* 하단 장식 */}
        <div className="card-suits">
          {['♠', '♥', '♦', '♣'].map((s) => (
            <span key={s} className="suit">{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
