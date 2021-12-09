const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const authWare =  middleware.auth
const userWare =  middleware.user
const controller  = require('../controllers/users')

router.post('/', authWare.authenticateToken, authWare.authenticatePermission("USERS:CREATE"), userWare.checkSignUpData, userWare.checkDuplicateUsernameOrEmail, controller.createUser)

//TODO: check for unkown roles in body
router.put('/:userId', authWare.authenticateToken, authWare.authenticatePermission("USERS:UPDATE:PROFILE"), controller.updateUser)

router.put('/:userId/password', authWare.authenticateToken, authWare.authenticatePermission("USERS:UPDATE:PASSWORD"), controller.updatePassword)

router.put('/:userId/roles', authWare.authenticateToken, authWare.authenticatePermission("USERS:UPDATE:ROLES"), controller.updateUserRoles)

router.get('/', authWare.authenticateToken, authWare.authenticatePermission("USERS:VIEW"), controller.getAllUsers)

//TODO: add cascading delete for projects
router.delete('/:userId', authWare.authenticateToken, authWare.authenticatePermission("USERS:DELETE"), controller.deleteUser)

module.exports = router