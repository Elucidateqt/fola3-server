const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const authWare =  middleware.auth
const userWare =  middleware.user
const controller  = require('../controllers/users')
const { body, param } = require('express-validator')

router.post('/', authWare.authenticateToken, authWare.authenticatePermission("USERS:CREATE"), 
body('email').exists().isEmail().normalizeEmail().custom(userWare.checkDuplicateEmail),
body('password').exists().isString().isLength({min: 5}),
body('username').exists().isString().isLength({min: 3, max: 16}).isAlpha('en-US', {ignore: ' '}).custom(userWare.checkDuplicateUsername),
controller.createUser)


router.put('/me/password', authWare.authenticateToken,
body('password').exists().isString().trim().isLength({min: 5}),
controller.updateBearerPassword)

router.put('/:userId/profile', authWare.authenticateToken, authWare.authenticatePermission("USERS:PROFILE:UPDATE"), 
param('userId').trim().isUUID().withMessage('must be valid UUID'),
body('username').exists().isString().trim().isLength({min: 3, max: 16}).isAlpha(),
body('email').exists().isString().trim().isEmail().normalizeEmail(),
controller.updateUser)

router.put('/:userId/password', authWare.authenticateToken, authWare.authenticatePermission("USERS:PASSWORD:UPDATE"),
param('userId').trim().isUUID().withMessage('must be valid UUID'),
body('password').exists().isString().trim().isLength({min: 5}),
controller.updatePassword)

router.put('/:userId/roles', authWare.authenticateToken, authWare.authenticatePermission("USERS:ROLES:UPDATE"),
param('userId').trim().isUUID().withMessage('must be valid UUID'),
body('roles').exists().isArray().isLength({min: 1}).custom(authWare.userHasAllRoles),
body('roles.*').isUUID(),
controller.updateUserRoles)

router.post('/:userId/permissionBlacklist', authWare.authenticateToken, authWare.authenticatePermission("USERS:PERMISSIONBLACKLIST:MANAGE"),
param('userId').trim().isUUID().withMessage('must be valid UUID'),
body('permissions').exists().isArray().isLength({min: 1}),
body('permissions.*').isUUID(),
controller.revokeUserPermissions)

router.put('/:userId/permissionBlacklist', authWare.authenticateToken, authWare.authenticatePermission("USERS:PERMISSIONBLACKLIST:MANAGE"),
param('userId').trim().isUUID().withMessage('must be valid UUID'),
body('permissions').exists().isArray().isLength({min: 1}),
body('permissions.*').isUUID(),
controller.setRevokedPermissions)

router.delete('/:userId/permissionBlacklist/:permissionId', authWare.authenticateToken, authWare.authenticatePermission("USERS:PERMISSIONBLACKLIST:MANAGE"),
param('userId').trim().isUUID().withMessage('must be valid UUID'),
param('permissionId').trim().isUUID().withMessage('must be valid UUID'),
controller.removeRevokedPermission)

//TODO: add pagination
router.get('/', authWare.authenticateToken, authWare.authenticatePermission("USERS:VIEW"), controller.getAllUsers)

router.get('/me', authWare.authenticateToken, controller.getTokenBearer)

router.get('/:userId', authWare.authenticateToken,
param('userId').trim().isUUID().withMessage('must be valid UUID'),
controller.getUser)


router.delete('/me', authWare.authenticateToken, controller.deleteTokenBearer)

//TODO: add cascading delete for projects
router.delete('/:userId', authWare.authenticateToken, authWare.authenticatePermission("USERS:DELETE"),
param('userId').trim().isUUID().withMessage('must be valid UUID'),
controller.deleteUser)




module.exports = router