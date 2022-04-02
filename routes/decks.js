const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const authMiddleware = middleware.auth
const deckMiddleware = middleware.deck
const controller = require('../controllers/decks')
const { body, param, query } = require('express-validator')

router.post('/my', authMiddleware.authenticateToken,
body('owner').exists().trim().custom(deckMiddleware.isOwnerParamValid),
body('public').optional().isBoolean(),
body("name").optional().isString().trim().isLength({min: 3, max: 128}).withMessage('Must be between 3 and 128 characters long.').isAlpha('en-US', {ignore: ' '}).withMessage('No special characters allowed.'),
body('cards.*').optional().isUUID(),
controller.createBearerDeck)

router.post('/', authMiddleware.authenticateToken, authMiddleware.authenticatePermission('API:DECKS:MANAGE_PUBLIC'),
body('owner').exists().trim().custom(deckMiddleware.isOwnerParamValid),
body('public').optional().isBoolean(),
body("name").optional().isString().trim().isLength({min: 3, max: 128}).withMessage('Must be between 3 and 128 characters long.').isAlpha('en-US', {ignore: ' '}).withMessage('No special characters allowed.'),
body('cards.*').optional().isUUID(),
controller.createDeck)


router.get('/', authMiddleware.authenticateToken,
query('owner').exists().trim().custom(deckMiddleware.isOwnerParamValid),
query('public').optional().isBoolean(),
controller.getDecks)

//every user gets a personal cardset for created cards on account creation
router.get('/my', authMiddleware.authenticateToken, controller.getBearerDecks)

router.get('/:deckId', authMiddleware.authenticateToken, 
param('deckId').trim().isUUID().withMessage('deck.id_invalid'),
deckMiddleware.loadDeck,
deckMiddleware.isOwnerOrManager, controller.returnDeck)

router.put('/:deckId', authMiddleware.authenticateToken, 
param('deckId').trim().isUUID().withMessage('deck.id_invalid'),
body("name").exists().isString().trim().isLength({min: 3, max: 128}).withMessage('Must be between 3 and 128 characters long.').isAlpha('en-US', {ignore: ' '}).withMessage('No special characters allowed.'),
body("owner").isString().trim().isUUID().withMessage('deck.owner_invalid'),
body("cards.*").isString().trim().isUUID().withMessage('deck.cards_invalid'),
deckMiddleware.loadDeck,
deckMiddleware.isOwnerOrManager, controller.updateDeck)

router.delete('/:deckId', authMiddleware.authenticateToken,
param('deckId').trim().isUUID().withMessage('deck.id_invalid'),
deckMiddleware.loadDeck,
deckMiddleware.isOwnerOrManager,
controller.deleteDeck)

module.exports = router