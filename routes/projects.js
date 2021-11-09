const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const authMiddleware = middleware.auth
const projectMiddleware = middleware.project
const controller = require('../controllers/projects')


router.get('/', authMiddleware.authenticateToken, authMiddleware.authenticatePermissions(['PROJECTS:VIEW']), controller.getAllProjects)

router.get('/my', authMiddleware.authenticateToken, controller.getProjectsWithUser)

router.get('/:projectId', authMiddleware.authenticateToken, projectMiddleware.isProjectUuidValid, projectMiddleware.canViewProject, controller.getProject)

router.post('/', authMiddleware.authenticateToken, authMiddleware.authenticatePermissions([ "PROJECTS:CREATE" ]), controller.createProject)

router.delete('/:projectId', authMiddleware.authenticateToken, authMiddleware.authenticatePermissions([ 'PROJECTS:DELETE' ]), controller.deleteProject)

router.put('/:projectId/description', authMiddleware.authenticateToken, projectMiddleware.isProjectUuidValid, authMiddleware.authenticatePermissions([ 'PROJECTS:MANAGE' ]), controller.setProjectDescription)

router.put('/:projectId/name', authMiddleware.authenticateToken, projectMiddleware.isProjectUuidValid, authMiddleware.authenticatePermissions([ 'PROJECTS:MANAGE' ]), controller.setProjectName)

router.post('/:projectId/users', authMiddleware.authenticateToken, projectMiddleware.isProjectUuidValid, authMiddleware.authenticatePermissions([ 'PROJECTS:MANAGE' ]), controller.addMembers)

router.delete('/:projectId/users', authMiddleware.authenticateToken, projectMiddleware.isProjectUuidValid, authMiddleware.authenticatePermissions([ 'PROJECTS:MANAGE' ]), controller.removeMemembers)

router.delete('/:projectId/users/me', authMiddleware.authenticateToken, projectMiddleware.isProjectUuidValid,  projectMiddleware.isUserInProject, controller.leaveProject )

module.exports = router