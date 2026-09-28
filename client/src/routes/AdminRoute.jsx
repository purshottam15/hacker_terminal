import React from 'react';
import { Navigate } from 'react-router-dom';

export default function AdminRoute({ player, children }) {
  if (!player) {
    return <Navigate to="/login" replace />;
  }

  if (player.role !== 'admin') {
    return <Navigate to="/game" replace />;
  }

  return children;
}