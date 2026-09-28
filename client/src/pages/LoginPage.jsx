import React from 'react';
import Login from '../components/Login.jsx';

export default function LoginPage({ onLogin }) {
  return (
    <Login
      onLogin={onLogin}
    />
  );
}