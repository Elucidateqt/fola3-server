const express = require('express')
const router = express.Router()
const db = require('../models')
const middleware = require('../middleware')
const authWare = middleware.auth
const userWare = middleware.user
const controller = require('../controllers/auth')
const { body } = require('express-validator');

router.post('/signup',
body('email').exists().isEmail().normalizeEmail().custom(userWare.checkDuplicateEmail),
body('password').exists().isString().trim().isLength({min: 5}).withMessage('Must be at least 5 characters long.'),
body('username').exists().trim().isLength({min: 3, max: 16}).withMessage('Must be between 3 and 16 characters long.').isAlpha().withMessage('No special characters allowed.').custom(userWare.checkDuplicateUsername), controller.signUp)

router.post('/login',
body('email').exists().isEmail().normalizeEmail(),
body('password').exists().isLength({min: 5}),
controller.signIn)

router.post('/refreshToken', controller.refreshAccessToken)

module.exports = router