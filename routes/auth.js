const express = require('express')
const router = express.Router()
const db = require('../models')
const middleware = require('../middleware')
const authWare = middleware.auth
const userWare = middleware.user
const controller = require('../controllers/auth')
const { body } = require('express-validator');

router.post('/signup', body('email').exists().isEmail().normalizeEmail(), body('password').exists().isLength({min: 5}), body('username').exists().isLength({min: 3, max: 16}), userWare.checkDuplicateUsernameOrEmail, controller.signUp)

router.post('/login', body('email').exists().isEmail().normalizeEmail(), body('password').exists().isLength({min: 5}), controller.signIn)

router.post('/refreshToken', controller.refreshAccessToken)

module.exports = router