import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { projects, selectedProjectId, setSelectedProjectId } = useProject();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = selectedProjectId
    ? projects.find((p) => String(p.id) === selectedProjectId)?.name ?? 'All Projects'
    : 'All Projects';

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <span className="navbar-brand">Bug Tracker</span>
      <div className="navbar-project-selector" ref={dropdownRef}>
        <button className="project-dropdown-trigger" onClick={() => setDropdownOpen((o) => !o)}>
          <span>{selectedLabel}</span>
          <span className="project-dropdown-chevron">▾</span>
        </button>
        {dropdownOpen && (
          <div className="project-dropdown-menu">
            {[{ id: '', name: 'All Projects' }, ...projects].map((p) => (
              <div
                key={p.id}
                className={`project-dropdown-item${String(p.id) === selectedProjectId || (p.id === '' && !selectedProjectId) ? ' active' : ''}`}
                onClick={() => { setSelectedProjectId(String(p.id)); setDropdownOpen(false); }}
              >
                <span>{p.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="navbar-links">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}><span>Bugs</span></NavLink>
        <NavLink to="/board" className={({ isActive }) => isActive ? 'active' : ''}><span>Board</span></NavLink>
        <NavLink to="/bugs/new" className={({ isActive }) => isActive ? 'active' : ''}><span>New Item</span></NavLink>
        <NavLink to="/projects" className={({ isActive }) => isActive ? 'active' : ''}><span>Projects</span></NavLink>
        <NavLink to="/users" className={({ isActive }) => isActive ? 'active' : ''}><span>Users</span></NavLink>
      </div>
      <div className="navbar-user">
        <span className="navbar-user-name">{user?.name}</span>
        <span className={`badge badge-role badge-${user?.role}`}><span>{user?.role}</span></span>
        <button className="btn btn-logout" onClick={handleLogout}><span>Logout</span></button>
      </div>
    </nav>
  );
}
