const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const authMiddleware = middleware.auth
const projectWare = middleware.project
const controller = require('../controllers/projects')
const surveyController = require('../controllers/surveys')


router.get('/', authMiddleware.authenticateToken, controller.getMultipleProjects)

router.get('/:projectId', authMiddleware.authenticateToken, projectWare.isProjectUuidValid, projectWare.canViewProject, controller.getProject)

router.post('/', authMiddleware.authenticateToken, controller.createProject)

router.delete('/:projectId', authMiddleware.authenticateToken, projectWare.canUserAdminstrateProject, controller.deleteProject)

router.put('/:projectId/description', authMiddleware.authenticateToken, projectWare.isProjectUuidValid, projectWare.canUserAdminstrateProject, controller.setProjectDescription)

router.put('/:projectId/name', authMiddleware.authenticateToken, projectWare.isProjectUuidValid, projectWare.canUserAdminstrateProject, controller.setProjectName)

router.post('/:projectId/users', authMiddleware.authenticateToken, projectWare.isProjectUuidValid, projectWare.canUserAdminstrateProject, controller.addMembers)

router.delete('/:projectId/users', authMiddleware.authenticateToken, projectWare.isProjectUuidValid, projectWare.canUserAdminstrateProject, controller.removeMemembers)

router.delete('/:projectId/users/me', authMiddleware.authenticateToken, projectWare.isProjectUuidValid,  projectWare.isUserInProject, controller.leaveProject )

router.post('/:projectId/surveys', authMiddleware.authenticateToken, projectWare.isProjectUuidValid, projectWare.canUserAdminstrateProject, surveyController.createSurvey)

module.exports = router