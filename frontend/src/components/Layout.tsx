import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/opportunities', label: 'Opportunities', end: false },
  { to: '/saved', label: 'Saved', end: false },
  { to: '/checklist', label: 'Checklist', end: false },
  { to: '/notifications', label: 'Notifications', end: false },
  { to: '/profile', label: 'Profile', end: false },
];

export function Layout({ children }: { children: ReactNode }): JSX.Element {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">NewStart</div>
        <nav className="nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="user-box">
          <span className="user-name">{user?.firstName}</span>
          <button
            className="btn btn-ghost"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Log out
          </button>
        </div>
      </header>
      <main className="content">{children}</main>
      <footer className="footer">
        Development build — general relocation guidance only, not legal or immigration advice.
      </footer>
    </div>
  );
}
