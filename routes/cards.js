const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const authMiddleware = middleware.auth
const cardMiddleware = middleware.card
const cardsetMiddleware = middleware.cardset
const controller = require('../controllers/cards')
const { body, param, query } = require('express-validator')

router.get('/', authMiddleware.authenticateToken,
query('sets').optional().isString().custom(cardsetMiddleware.checkQueryCardsets),
query('type').optional().isString().trim().isIn(['LET', 'interaction', 'what']),
query('interactionSubjectLeft').optional().isString().trim().isIn(['teacher', 'student', 'material']),
query('interactionSubjectRight').optional().isString().trim().isIn(['teacher', 'student', 'material']),
query('interactionDirection').optional().isString().trim().isIn(['leftToRight', 'rightToLeft', 'both']),
query('limit').optional().isNumeric(),
query('offset').optional().isNumeric(),
query('sort').optional().isString(),
query('dir').optional().isString(),
controller.getCards)

router.get('/:cardId', authMiddleware.authenticateToken, param('cardId').trim().isUUID().withMessage('must be valid UUID'), cardMiddleware.loadCard, controller.getCard)

router.post('/', authMiddleware.authenticateToken, authMiddleware.authenticateBoardPermission('API:CARDS:CREATE'),
body('name').optional().isString().trim().isLength({min: 3, max: 128}).withMessage('Must be between 3 and 128 characters long.').isAlphanumeric('en-US', {ignore: ' '}).withMessage('No special characters allowed.'),
body('description').optional().isString().trim().isLength({min: 3, max: 256}).withMessage('Must be between 3 and 256 characters long.').matches(/^[A-Za-z0-9 \/.()\-\n,':!&]+$/).withMessage('No special characters allowed.'),
body('type').optional().isString().trim().isIn(['LET', 'interaction', 'what']),
body('imageUrl').optional().trim().isURL(),
body('externalLink').optional().trim().isURL(),
body('interactionSubjectLeft').optional().isString().trim().isIn(['teacher', 'student', 'material']),
body('interactionSubjectRight').optional().isString().trim().isIn(['teacher', 'student', 'material']),
body('interactionDirection').optional().isString().trim().isIn(['leftToRight', 'rightToLeft', 'both']),
body('LTEsensors.*').optional().trim().isString().isLength({min: 3, max: 64}).withMessage('Must be between 3 and 64 characters long.').isAlpha('en-US', {ignore: ' '}).withMessage('No special characters allowed.'),
body('requiredSensors.*').optional().trim().isString().isLength({min: 3, max: 64}).withMessage('Must be between 3 and 64 characters long.').isAlpha('en-US', {ignore: ' '}).withMessage('No special characters allowed.'),
controller.createCard)

router.delete('/:cardId', authMiddleware.authenticateToken, param('cardId').trim().isUUID().withMessage('must be valid UUID'), cardMiddleware.loadCard, cardMiddleware.isOwnerOrManager, controller.deleteCard)

router.put('/:cardId', authMiddleware.authenticateToken, param('cardId').trim().isUUID().withMessage('must be valid UUID'),
body('cardset').optional().isString().trim().isUUID().withMessage('must be valid UUID'),
body('name').optional().isString().trim().isLength({min: 3, max: 128}).withMessage('Must be between 3 and 128 characters long.').isAlphanumeric('en-US', {ignore: ' '}).withMessage('No special characters allowed.'),
body('description').optional().isString().trim().isLength({min: 3, max: 256}).withMessage('Must be between 3 and 256 characters long.').matches(/^[A-Za-z0-9 \/.()\-\n,':!&]+$/).withMessage('No special characters allowed.'),
body('type').optional().isString().trim().isIn(['LET', 'interaction', 'what']),
body('imageUrl').optional().trim().isURL(),
body('externalLink').optional().trim().isURL(),
body('interactionSubjectLeft').optional().isString().trim().isIn(['teacher', 'student', 'material']),
body('interactionSubjectRight').optional().isString().trim().isIn(['teacher', 'student', 'material']),
body('interactionDirection').optional().isString().trim().isIn(['leftToRight', 'rightToLeft', 'both']),
body('LTEsensors.*').optional().trim().isString().isLength({min: 3, max: 64}).withMessage('Must be between 3 and 64 characters long.').isAlpha('en-US', {ignore: ' '}).withMessage('No special characters allowed.'),
body('requiredSensors.*').optional().trim().isString().isLength({min: 3, max: 64}).withMessage('Must be between 3 and 64 characters long.').isAlpha('en-US', {ignore: ' '}).withMessage('No special characters allowed.'),
cardMiddleware.loadCard,
cardMiddleware.isOwnerOrManager,
controller.updateCard)



module.exports = router