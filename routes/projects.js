const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const authMiddleware = middleware.auth
const projectMiddleware = middleware.project
const controller = require('../controllers/projects')
const { body, param, query } = require('express-validator')

router.get('/', authMiddleware.authenticateToken, authMiddleware.authenticatePermission('PROJECTS:VIEW'), controller.getAllProjects)

router.get('/my', authMiddleware.authenticateToken,
query('limit').optional().isNumeric(),
query('offset').optional().isNumeric(),
controller.getProjectsWithUser)

router.get('/:projectId', authMiddleware.authenticateToken, param('projectId').trim().isUUID().withMessage('must be valid UUID'), projectMiddleware.loadProject, projectMiddleware.canViewProject, controller.returnProject)

router.post('/', authMiddleware.authenticateToken, authMiddleware.authenticatePermission("PROJECT:CREATE"),
body('name').exists().isString().trim().isLength({min: 3, max: 128}).withMessage('Must be between 3 and 128 characters long.').isAlpha('de-DE', {ignore: ' '}).withMessage('No special characters allowed.'),
body('description').exists().isString().trim().isLength({min: 3, max: 256}).withMessage('Must be between 3 and 256 characters long.').isAlpha('de-DE', {ignore: ' '}).withMessage('No special characters allowed.'),
controller.createProject)

router.delete('/:projectId', authMiddleware.authenticateToken, param('projectId').trim().isUUID().withMessage('must be valid UUID'), authMiddleware.authenticateProjectPermission('PROJECT:DELETE'), controller.deleteProject)

router.put('/:projectId/description', authMiddleware.authenticateToken, param('projectId').trim().isUUID().withMessage('must be valid UUID'),
body('description').exists().isString().trim().isLength({min: 3, max: 256}).withMessage('Must be between 3 and 256 characters long.').isAlpha('de-DE', {ignore: ' '}).withMessage('No special characters allowed.'),
projectMiddleware.loadProject, authMiddleware.authenticateProjectPermission('PROJECT:MANAGE'),
controller.setProjectDescription)

router.put('/:projectId/name', authMiddleware.authenticateToken,
param('projectId').trim().isUUID().withMessage('must be valid UUID'),
body('projectName').exists().isString().trim().isLength({min: 3, max: 128}).withMessage('Must be between 3 and 128 characters long.').isAlpha('de-DE', {ignore: ' '}).withMessage('No special characters allowed.'),
projectMiddleware.loadProject, authMiddleware.authenticateProjectPermission('PROJECT:MANAGE'),
controller.setProjectName)

router.post('/:projectId/users/me', authMiddleware.authenticateToken, param('projectId').trim().isUUID().withMessage('must be valid UUID'), query('inv').exists().trim(), projectMiddleware.loadProject, controller.joinWithCode)

router.post('/:projectId/users', authMiddleware.authenticateToken, param('projectId').trim().isUUID().withMessage('must be valid UUID'), projectMiddleware.loadProject, authMiddleware.authenticateProjectPermission('PROJECT:MANAGE'), controller.addMembers)

router.delete('/:projectId/users', authMiddleware.authenticateToken, param('projectId').trim().isUUID().withMessage('must be valid UUID'), projectMiddleware.loadProject, authMiddleware.authenticateProjectPermission('PROJECT:MANAGE'), controller.removeMemembers)


router.delete('/:projectId/users/me', authMiddleware.authenticateToken, param('projectId').trim().isUUID().withMessage('must be valid UUID'), projectMiddleware.isUserInProject, controller.leaveProject )

router.put('/:projectId/inviteCode', authMiddleware.authenticateToken, param('projectId').trim().isUUID().withMessage('must be valid UUID'), controller.createNewInviteCode)



module.exports = router