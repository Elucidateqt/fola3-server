const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const authMiddleware = middleware.auth
const cardSetMiddleware = middleware.cardset
const cardMiddleware = middleware.card
const controller = require('../controllers/cardsets')
const { body, param, query } = require('express-validator')

router.post('/', authMiddleware.authenticateToken, authMiddleware.authenticatePermission('API:CARDSETS:MANAGE'),
body('owner').exists().trim().custom(cardSetMiddleware.isOwnerParamValid),
body('public').optional().isBoolean(),
body("name").optional().isString().trim().isLength({min: 3, max: 128}).withMessage('Must be between 3 and 128 characters long.').isAlpha('en-US', {ignore: ' '}).withMessage('No special characters allowed.'),
body('cards.*').optional().isUUID(),
body('iconUrl').optional().isURL(),
controller.createCardSet)


router.get('/', authMiddleware.authenticateToken,
query('owner').exists().trim().custom(cardSetMiddleware.isOwnerParamValid),
query('public').optional().isBoolean(),
controller.getCardSets)

//every user gets a personal cardset for created cards on account creation
router.get('/my', authMiddleware.authenticateToken, controller.getBearerCardSets)

router.get('/:setId', authMiddleware.authenticateToken, 
param('setId').trim().isUUID().withMessage('must be valid UUID'),
cardSetMiddleware.loadCardSet,
cardSetMiddleware.isOwnerOrManager, controller.getCardSetByUuid)

router.post('/:setId', authMiddleware.authenticateToken, 
param('setId').trim().isUUID().withMessage('must be valid UUID'),
cardSetMiddleware.loadCardSet,
cardSetMiddleware.isOwnerOrManager, controller.updateCardSet)

router.delete('/:setId', authMiddleware.authenticateToken, authMiddleware.authenticatePermission('API:CARDSETS:MANAGE'),
param('setId').trim().isUUID().withMessage('must be valid UUID'),
controller.deleteCardSet)

module.exports = router