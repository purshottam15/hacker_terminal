import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ player, children }) {
  const location = useLocation();

  if (!player) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (player.role !== 'participant') {
    return <Navigate to="/admin" replace />;
  }

  return children;
}