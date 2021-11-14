const express = require('express')
const router = express.Router()
const db = require('../models')
const middleware = require('../middleware')
const authWare = middleware.auth
const userWare = middleware.user
const controller = require('../controllers/auth')
const PermissionController = require('../controllers/permissions')

router.post('/signup', userWare.checkSignUpData, userWare.checkDuplicateUsernameOrEmail, controller.signUp)

router.post('/login', userWare.checkLogInData, controller.signIn)

router.post('/refreshToken', controller.refreshAccessToken)

router.delete('/logout', authWare.authenticateToken, controller.signOut)

module.exports = router