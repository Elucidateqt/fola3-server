const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const authMiddleware = middleware.auth
const boardMiddleware = middleware.board
const controller = require('../controllers/boards')
const { body, param, query } = require('express-validator')

router.get('/', authMiddleware.authenticateToken, authMiddleware.authenticatePermission('API:BOARDS:VIEW'), controller.getAllBoards)

router.get('/my', authMiddleware.authenticateToken,
query('limit').optional().isNumeric(),
query('offset').optional().isNumeric(),
controller.getBoardsWithUser)

router.get('/:boardId', authMiddleware.authenticateToken, param('boardId').trim().isUUID().withMessage('must be valid UUID'), boardMiddleware.loadBoard, boardMiddleware.canViewBoard, controller.returnBoard)

router.post('/', authMiddleware.authenticateToken, authMiddleware.authenticatePermission("API:BOARD:CREATE"),
body('name').exists().isString().trim().isLength({min: 3, max: 128}).withMessage('Must be between 3 and 128 characters long.').isAlpha('de-DE', {ignore: ' '}).withMessage('No special characters allowed.'),
body('description').exists().isString().trim().isLength({min: 3, max: 256}).withMessage('Must be between 3 and 256 characters long.').isAlpha('de-DE', {ignore: ' '}).withMessage('No special characters allowed.'),
controller.createBoard)

router.delete('/:boardId', authMiddleware.authenticateToken, param('boardId').trim().isUUID().withMessage('must be valid UUID'), authMiddleware.authenticateBoardPermission('BOARD:DELETE'), controller.deleteBoard)

router.put('/:boardId/description', authMiddleware.authenticateToken, param('boardId').trim().isUUID().withMessage('must be valid UUID'),
body('description').exists().isString().trim().isLength({min: 3, max: 256}).withMessage('Must be between 3 and 256 characters long.').isAlpha('de-DE', {ignore: ' '}).withMessage('No special characters allowed.'),
boardMiddleware.loadBoard, authMiddleware.authenticateBoardPermission('BOARD:MANAGE'),
controller.setBoardDescription)

router.put('/:boardId/name', authMiddleware.authenticateToken,
param('boardId').trim().isUUID().withMessage('must be valid UUID'),
body('boardName').exists().isString().trim().isLength({min: 3, max: 128}).withMessage('Must be between 3 and 128 characters long.').isAlpha('de-DE', {ignore: ' '}).withMessage('No special characters allowed.'),
boardMiddleware.loadBoard, authMiddleware.authenticateBoardPermission('BOARD:MANAGE'),
controller.setBoardName)

router.post('/:boardId/users/me', authMiddleware.authenticateToken, param('boardId').trim().isUUID().withMessage('must be valid UUID'), query('inv').exists().trim(), boardMiddleware.loadBoard, controller.joinWithCode)

router.post('/:boardId/users', authMiddleware.authenticateToken, param('boardId').trim().isUUID().withMessage('must be valid UUID'), boardMiddleware.loadBoard, authMiddleware.authenticateBoardPermission('BOARD:MANAGE'), controller.addMembers)

router.delete('/:boardId/users', authMiddleware.authenticateToken, param('boardId').trim().isUUID().withMessage('must be valid UUID'), boardMiddleware.loadBoard, authMiddleware.authenticateBoardPermission('BOARD:MANAGE'), controller.removeMemembers)


router.delete('/:boardId/users/me', authMiddleware.authenticateToken, param('boardId').trim().isUUID().withMessage('must be valid UUID'), boardMiddleware.isUserBoardMember, controller.leaveBoard )

router.put('/:boardId/inviteCode', authMiddleware.authenticateToken, param('boardId').trim().isUUID().withMessage('must be valid UUID'), controller.createNewInviteCode)



module.exports = router