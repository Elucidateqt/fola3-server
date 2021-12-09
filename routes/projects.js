const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const authMiddleware = middleware.auth
const projectMiddleware = middleware.project
const controller = require('../controllers/projects')

router.get('/', authMiddleware.authenticateToken, authMiddleware.authenticatePermission('PROJECTS:VIEW'), controller.getAllProjects)

router.get('/my', authMiddleware.authenticateToken, controller.getProjectsWithUser)

router.get('/:projectId', authMiddleware.authenticateToken, projectMiddleware.loadProject, projectMiddleware.canViewProject, controller.getProject)

router.post('/', authMiddleware.authenticateToken, authMiddleware.authenticatePermission("PROJECT:CREATE"), controller.createProject)

router.delete('/:projectId', authMiddleware.authenticateToken, authMiddleware.authenticateProjectPermission('PROJECT:DELETE'), controller.deleteProject)

router.put('/:projectId/description', authMiddleware.authenticateToken, projectMiddleware.loadProject, authMiddleware.authenticateProjectPermission('PROJECT:MANAGE'), controller.setProjectDescription)

router.put('/:projectId/name', authMiddleware.authenticateToken, projectMiddleware.loadProject, authMiddleware.authenticateProjectPermission('PROJECT:MANAGE'), controller.setProjectName)

router.post('/:projectId/users', authMiddleware.authenticateToken, projectMiddleware.loadProject, authMiddleware.authenticateProjectPermission('PROJECT:MANAGE'), controller.addMembers)

router.delete('/:projectId/users', authMiddleware.authenticateToken, projectMiddleware.loadProject, authMiddleware.authenticateProjectPermission('PROJECT:MANAGE'), controller.removeMemembers)

router.delete('/:projectId/users/me', authMiddleware.authenticateToken, projectMiddleware.loadProject,  projectMiddleware.isUserInProject, controller.leaveProject )

module.exports = router