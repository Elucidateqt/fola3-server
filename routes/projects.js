const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const authMiddleware = middleware.auth
const projectMiddleware = middleware.project
const controller = require('../controllers/projects')

//TODO: hydrate request with project when checking projectId
router.get('/', authMiddleware.authenticateToken, authMiddleware.authenticatePermission('PROJECTS:VIEW'), controller.getAllProjects)

router.get('/my', authMiddleware.authenticateToken, controller.getProjectsWithUser)

router.get('/:projectId', authMiddleware.authenticateToken, projectMiddleware.isProjectUuidValid, projectMiddleware.canViewProject, controller.getProject)

router.post('/', authMiddleware.authenticateToken, authMiddleware.authenticatePermission("PROJECT:CREATE"), controller.createProject)

router.delete('/:projectId', authMiddleware.authenticateToken, authMiddleware.authenticateProjectPermission('PROJECT:DELETE'), controller.deleteProject)

router.put('/:projectId/description', authMiddleware.authenticateToken, projectMiddleware.isProjectUuidValid, authMiddleware.authenticateProjectPermission('PROJECT:MANAGE'), controller.setProjectDescription)

router.put('/:projectId/name', authMiddleware.authenticateToken, projectMiddleware.isProjectUuidValid, authMiddleware.authenticateProjectPermission('PROJECT:MANAGE'), controller.setProjectName)

router.post('/:projectId/users', authMiddleware.authenticateToken, projectMiddleware.isProjectUuidValid, authMiddleware.authenticateProjectPermission('PROJECT:MANAGE'), controller.addMembers)

//TODO: fix this
router.delete('/:projectId/users', authMiddleware.authenticateToken, projectMiddleware.isProjectUuidValid, authMiddleware.authenticateProjectPermission('PROJECT:MANAGE'), controller.removeMemembers)

router.delete('/:projectId/users/me', authMiddleware.authenticateToken, projectMiddleware.isProjectUuidValid,  projectMiddleware.isUserInProject, controller.leaveProject )

module.exports = router