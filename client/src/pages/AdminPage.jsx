import React from 'react';
import AdminDashboard from '../components/AdminDashboard.jsx';

export default function AdminPage({
  player,
  onLogout
}) {
  return (
    <AdminDashboard
      admin={player}
      onLogout={onLogout}
    />
  );
}