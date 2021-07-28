const express = require('express')
const router = express.Router()
const db = require('../models')
const {authWare, userWare} = require('../middleware')
const controller = require('../controllers/auth')


router.post('/signup', userWare.checkSignUpData, userWare.checkDuplicateUsernameOrEmail, controller.signUp)

router.post('/login', userWare.checkLogInData, controller.signIn)

router.post('/refreshToken', controller.refreshAccessToken)

router.delete('/logout', authWare.authenticateToken, controller.signOut)

module.exports = router