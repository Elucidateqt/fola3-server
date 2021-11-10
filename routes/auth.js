const express = require('express')
const router = express.Router()
const db = require('../models')
const middleware = require('../middleware')
const authWare = middleware.auth
const userWare = middleware.user
const controller = require('../controllers/auth')
const PermissionController = require('../controllers/permission')

router.post('/signup', userWare.checkSignUpData, userWare.checkDuplicateUsernameOrEmail, controller.signUp)

router.post('/login', userWare.checkLogInData, controller.signIn)

router.post('/refreshToken', controller.refreshAccessToken)

router.delete('/logout', authWare.authenticateToken, controller.signOut)

router.get('/roles', authWare.authenticateToken, authWare.authenticatePermissions([ "ROLES:VIEW" ]),  controller.getRoles)

router.post('/roles', authWare.authenticateToken, authWare.authenticatePermissions([ "ROLES:CREATE" ]), controller.createRole)

//TODO: return 404 on unknown roleName and check if user has permissions to be added
router.put('/roles/:roleName', authWare.authenticateToken, authWare.authenticatePermissions([ "ROLES:UPDATE" ]), controller.updateRole)

router.delete('/roles/:roleName', authWare.authenticateToken, authWare.authenticatePermissions([ "ROLES:DELETE" ]), controller.deleteRole)

router.get('/permissions/', authWare.authenticateToken, authWare.authenticatePermissions([ "PERMISSIONS:VIEW" ]), PermissionController.getAllPermissions)

//TODO: prevent duplicates
router.post('/permissions/', authWare.authenticateToken, authWare.authenticatePermissions([ "PERMISSIONS:CREATE" ]), PermissionController.createPermission)

router.delete('/permissions/:permissionName', authWare.authenticateToken, authWare.authenticatePermissions([ "PERMISSIONS:DELETE" ]), PermissionController.deletePermission)

module.exports = router