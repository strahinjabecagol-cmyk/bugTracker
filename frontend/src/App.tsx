import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import BugList from './pages/BugList';
import BugDetail from './pages/BugDetail';
import BugForm from './pages/BugForm';
import ProjectList from './pages/ProjectList';
import UserList from './pages/UserList';
import BoardView from './pages/BoardView';
import { ProjectProvider } from './context/ProjectContext';

export default function App() {
  return (
    <BrowserRouter>
      <ProjectProvider>
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<BugList />} />
            <Route path="/bugs/new" element={<BugForm />} />
            <Route path="/bugs/:id" element={<BugDetail />} />
            <Route path="/board" element={<BoardView />} />
          <Route path="/projects" element={<ProjectList />} />
            <Route path="/users" element={<UserList />} />
          </Routes>
        </main>
      </ProjectProvider>
    </BrowserRouter>
  );
}
