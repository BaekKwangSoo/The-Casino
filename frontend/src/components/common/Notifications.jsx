import React from 'react';
import useStore from '../../store/useStore';
import './Notifications.css';

export default function Notifications() {
  const notifications = useStore((s) => s.notifications);

  return (
    <div className="notifications">
      {notifications.map((n) => (
        <div key={n.id} className={`notification fade-in ${n.type}`}>
          {n.msg}
        </div>
      ))}
    </div>
  );
}
