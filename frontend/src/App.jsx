import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';

import useStore from './store/useStore';
import { connectSocket, disconnectSocket } from './socket/socketClient';

import MainPage    from './pages/MainPage';
import LoginPage   from './pages/LoginPage';
import LobbyPage   from './pages/LobbyPage';
import SicBoPage   from './pages/SicBoPage';
import Notifications from './components/common/Notifications';

// axios 기본 설정
const API = import.meta.env.VITE_API_URL || '';
axios.defaults.baseURL = API;

export default function App() {
  const { token, setAuth, logout, addNotification } = useStore();

  // 토큰 있으면 유저 정보 복원
  useEffect(() => {
    if (!token) return;
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    axios.get('/api/auth/me')
      .then((res) => {
        setAuth(res.data.user, token);
        connectSocket(token);
      })
      .catch(() => {
        logout();
      });
  }, []);

  return (
    <>
      <Notifications />
      <Routes>
        <Route path="/"        element={<MainPage />} />
        <Route path="/login"   element={<LoginPage />} />
        <Route path="/lobby"   element={<RequireAuth><LobbyPage /></RequireAuth>} />
        <Route path="/game/sicbo" element={<RequireAuth><SicBoPage /></RequireAuth>} />
        <Route path="*"        element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function RequireAuth({ children }) {
  const token = useStore((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
}
