import { useEffect } from 'react';
import { useParams, Outlet } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';

const ProjectLoader = () => {
  const { projectId: urlProjectId } = useParams();
  const { fetchProjectData, projectId, loading } = useProject();

  useEffect(() => {
    if (urlProjectId && urlProjectId !== projectId) {
      fetchProjectData(urlProjectId);
    }
  }, [urlProjectId, projectId, fetchProjectData]);

  return <Outlet />;
};

export default ProjectLoader;
