import { createContext, useContext, useEffect, useState } from 'react';
import { getProjects } from '../api';
import type { Project } from '../types';

interface ProjectContextValue {
  projects: Project[];
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
}

const ProjectContext = createContext<ProjectContextValue>({
  projects: [],
  selectedProjectId: '',
  setSelectedProjectId: () => {},
});

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectIdState] = useState<string>(
    () => localStorage.getItem('selectedProjectId') ?? ''
  );

  useEffect(() => {
    getProjects().then(setProjects).catch(() => {});
  }, []);

  function setSelectedProjectId(id: string) {
    setSelectedProjectIdState(id);
    localStorage.setItem('selectedProjectId', id);
  }

  return (
    <ProjectContext.Provider value={{ projects, selectedProjectId, setSelectedProjectId }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  return useContext(ProjectContext);
}
