const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const authMiddleware = middleware.auth
const projectMiddleware = middleware.project
const controller = require('../controllers/projects')
const { body, param } = require('express-validator')

router.get('/', authMiddleware.authenticateToken, authMiddleware.authenticatePermission('PROJECTS:VIEW'), controller.getAllProjects)

router.get('/my', authMiddleware.authenticateToken, controller.getProjectsWithUser)

router.get('/:projectId', authMiddleware.authenticateToken, param('projectId').trim().isUUID().withMessage('must be valid UUID'), projectMiddleware.loadProject, projectMiddleware.canViewProject, controller.returnProject)

router.post('/', authMiddleware.authenticateToken, authMiddleware.authenticatePermission("PROJECT:CREATE"),
body('projectName').exists().isString().trim().isLength({min: 3, max: 16}).withMessage('Must be between 3 and 16 characters long.').isAlpha().withMessage('No special characters allowed.'),
body('description').exists().isString().trim().isLength({min: 3, max: 140}).withMessage('Must be between 3 and 140 characters long.').escape(),
controller.createProject)

router.delete('/:projectId', authMiddleware.authenticateToken, param('projectId').trim().isUUID().withMessage('must be valid UUID'), authMiddleware.authenticateProjectPermission('PROJECT:DELETE'), controller.deleteProject)

router.put('/:projectId/description', authMiddleware.authenticateToken, param('projectId').trim().isUUID().withMessage('must be valid UUID'),
body('description').exists().isString().trim().isLength({min: 3, max: 140}).withMessage('Must be between 3 and 140 characters long.').escape(),
projectMiddleware.loadProject, authMiddleware.authenticateProjectPermission('PROJECT:MANAGE'),
controller.setProjectDescription)

router.put('/:projectId/name', authMiddleware.authenticateToken,
param('projectId').trim().isUUID().withMessage('must be valid UUID'),
body('projectName').exists().isString().trim().isLength({min: 3, max: 16}).withMessage('Must be between 3 and 16 characters long.').isAlpha().withMessage('No special characters allowed.'),
projectMiddleware.loadProject, authMiddleware.authenticateProjectPermission('PROJECT:MANAGE'),
controller.setProjectName)

router.post('/:projectId/users', authMiddleware.authenticateToken, param('projectId').trim().isUUID().withMessage('must be valid UUID'), projectMiddleware.loadProject, authMiddleware.authenticateProjectPermission('PROJECT:MANAGE'), controller.addMembers)

router.delete('/:projectId/users', authMiddleware.authenticateToken, param('projectId').trim().isUUID().withMessage('must be valid UUID'), projectMiddleware.loadProject, authMiddleware.authenticateProjectPermission('PROJECT:MANAGE'), controller.removeMemembers)

router.delete('/:projectId/users/me', authMiddleware.authenticateToken, param('projectId').trim().isUUID().withMessage('must be valid UUID'), projectMiddleware.isUserInProject, controller.leaveProject )

module.exports = router