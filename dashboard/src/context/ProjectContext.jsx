import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const ProjectContext = createContext();

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

export const ProjectProvider = ({ children }) => {
  const [projectId, setProjectId] = useState(null);
  const [project, setProject] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProjectData = useCallback(async (id) => {
    if (!id || id === 'new') return;
    setLoading(true);
    setError(null);
    try {
      const [projRes, histRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/history`)
      ]);
      setProject(projRes.data);
      setHistory(histRes.data);
      setProjectId(id);
    } catch (err) {
      console.error('Failed to fetch project data:', err);
      setError(err.message || 'Failed to load project');
      toast.error('Failed to load project details');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshData = useCallback(async (showLoading = false) => {
    if (projectId && projectId !== 'new') {
      if (showLoading) setLoading(true);
      try {
        const [projRes, histRes] = await Promise.all([
          api.get(`/projects/${projectId}`),
          api.get(`/projects/${projectId}/history`)
        ]);
        setProject(projRes.data);
        setHistory(histRes.data);
      } catch (err) {
        console.error('Failed to refresh project data:', err);
      } finally {
        if (showLoading) setLoading(false);
      }
    }
  }, [projectId]);

  // Auto-refresh logic:
  // 1. If no history yet (initial scan polling)
  // 2. If project is currently scanning in the background
  useEffect(() => {
    let interval;
    const needsPolling = projectId && (history.length === 0 || project?.isScanning);
    
    if (needsPolling) {
      // Initial delay to let the backend start if called immediately after a POST
      interval = setInterval(() => {
        // Only run if not already fetching to avoid stack-ups
        refreshData();
      }, 6000); // 6s polling for background scans
    }
    return () => { if (interval) clearInterval(interval); };
  }, [projectId, history.length, project?.isScanning, refreshData]);

  const value = {
    projectId,
    project,
    history,
    loading,
    error,
    fetchProjectData,
    refreshData,
    setProjectId
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};
