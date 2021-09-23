const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const authWare =  middleware.auth
const userWare =  middleware.user
const controller  = require('../controllers/users')
const db = require('../models')

router.post('/', authWare.authenticateToken, authWare.authenticateRoles([ db.ROLES.ADMIN, db.ROLES.SUPER_ADMIN ]), userWare.checkSignUpData, userWare.checkDuplicateUsernameOrEmail, controller.createUser)

router.get('/', authWare.authenticateToken, authWare.authenticateRoles([ db.ROLES.ADMIN, db.ROLES.SUPER_ADMIN ]), controller.getAllUsers)

module.exports = router