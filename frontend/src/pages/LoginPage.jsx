import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import useStore from '../store/useStore';
import { connectSocket } from '../socket/socketClient';
import './LoginPage.css';

export default function LoginPage() {
  const [params]     = useSearchParams();
  const [isRegister, setIsRegister] = useState(params.get('mode') === 'register');
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState('');
  const [loading, setLoading] = useState(false);

  const { setAuth } = useStore();
  const navigate    = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrorField('');
    setLoading(true);

    try {
      const url = isRegister ? '/api/auth/register' : '/api/auth/login';
      const { data } = await axios.post(url, form);

      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      setAuth(data.user, data.token);
      connectSocket(data.token);
      navigate('/lobby');
    } catch (err) {
      const data = err.response?.data;
      setError(data?.message || '오류가 발생했습니다.');
      setErrorField(data?.field || '');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box fade-in">
        <button className="back-btn" onClick={() => navigate('/')}>← 메인으로</button>

        <div className="login-logo">🎲</div>
        <h2>{isRegister ? '회원가입' : '로그인'}</h2>
        <p className="login-sub">Casino Royal에 오신 것을 환영합니다</p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>사용자명</label>
            <input
              type="text"
              placeholder="사용자명 입력"
              value={form.username}
              onChange={(e) => {
                setForm({ ...form, username: e.target.value });
                if (errorField === 'username') { setError(''); setErrorField(''); }
              }}
              className={errorField === 'username' ? 'input-error' : ''}
              required
              autoFocus
            />
          </div>
          <div className="field">
            <label>비밀번호</label>
            <input
              type="password"
              placeholder="비밀번호 입력"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button type="submit" className="btn btn-gold login-submit" disabled={loading}>
            {loading ? '처리 중...' : (isRegister ? '회원가입' : '로그인')}
          </button>
        </form>

        <button className="toggle-btn" onClick={() => { setIsRegister(!isRegister); setError(''); }}>
          {isRegister ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
        </button>

        {isRegister && (
          <p className="bonus-msg">🎁 신규 가입 시 <strong>100,000 크레딧</strong> 지급!</p>
        )}
      </div>
    </div>
  );
}
