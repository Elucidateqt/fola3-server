const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const authWare =  middleware.auth
const userWare =  middleware.user
const controller  = require('../controllers/users')

router.post('/', authWare.authenticateToken, authWare.authenticatePermissions([ "USERS:CREATE" ]), userWare.checkSignUpData, userWare.checkDuplicateUsernameOrEmail, controller.createUser)

//TODO: check for unkown roles in body
router.put('/:userId', authWare.authenticateToken, authWare.authenticatePermissions([ "USERS:UPDATE:PROFILE" ]), controller.updateUser)

router.put('/:userId/password', authWare.authenticateToken, authWare.authenticatePermissions([ "USERS:UPDATE:PASSWORD" ]), controller.updatePassword)

router.put('/:userId/roles', authWare.authenticateToken, authWare.authenticatePermissions([ "USERS:UPDATE:ROLES" ]), controller.updateUserRoles)

router.get('/', authWare.authenticateToken, authWare.authenticatePermissions([ "USERS:VIEW" ]), controller.getAllUsers)

//TODO: add cascading delete for projects
router.delete('/:userId', authWare.authenticateToken, authWare.authenticatePermissions([ "USERS:DELETE" ]), controller.deleteUser)

module.exports = router