const express = require('express');
const router = express.Router();
const { 
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  getProjectHistory,
  runProjectSync
} = require('../controllers/project.controller');
const { protect } = require('../utils/auth.middleware');

// All routes are protected
router.use(protect);

router.post('/', createProject);
router.get('/', getProjects);
router.get('/:id', getProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);
router.get('/:id/history', getProjectHistory);
router.post('/:id/sync', runProjectSync);
router.post('/:id/scan', runProjectSync); // Alias for backward compatibility

module.exports = router;
