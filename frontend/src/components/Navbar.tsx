import { NavLink, useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { projects, selectedProjectId, setSelectedProjectId } = useProject();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <span className="navbar-brand">Bug Tracker</span>
      <div className="navbar-project-selector">
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div className="navbar-links">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>Bugs</NavLink>
        <NavLink to="/board" className={({ isActive }) => isActive ? 'active' : ''}>Board</NavLink>
        <NavLink to="/bugs/new" className={({ isActive }) => isActive ? 'active' : ''}>New Bug</NavLink>
        <NavLink to="/projects" className={({ isActive }) => isActive ? 'active' : ''}>Projects</NavLink>
        <NavLink to="/users" className={({ isActive }) => isActive ? 'active' : ''}>Users</NavLink>
      </div>
      <div className="navbar-user">
        <span className="navbar-user-name">{user?.name}</span>
        <span className={`badge badge-role badge-${user?.role}`}>{user?.role}</span>
        <button className="btn btn-logout" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}
