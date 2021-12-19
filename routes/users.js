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
body('username').exists().isString().isLength({min: 3, max: 16}).isAlpha().custom(userWare.checkDuplicateUsername),
controller.createUser)

router.put('/:userId/profile', authWare.authenticateToken, authWare.authenticatePermission("USERS:UPDATE:PROFILE"), 
param('userId').trim().isUUID().withMessage('must be valid UUID'),
body('username').exists().isString().trim().isLength({min: 3, max: 16}).isAlpha(),
body('email').exists().isString().trim().isEmail().normalizeEmail(),
controller.updateUser)

router.put('/:userId/password', authWare.authenticateToken, authWare.authenticatePermission("USERS:UPDATE:PASSWORD"),
param('userId').trim().isUUID().withMessage('must be valid UUID'),
body('password').exists().isString().trim().isLength({min: 5}),
controller.updatePassword)

router.put('/:userId/roles', authWare.authenticateToken, authWare.authenticatePermission("USERS:UPDATE:ROLES"),
param('userId').trim().isUUID().withMessage('must be valid UUID'),
body('roles').exists().isArray().custom(authWare.userHasAllRoles),
controller.updateUserRoles)

//TODO: add pagination
router.get('/', authWare.authenticateToken, authWare.authenticatePermission("USERS:VIEW"), controller.getAllUsers)

//TODO: add cascading delete for projects
router.delete('/:userId', authWare.authenticateToken, authWare.authenticatePermission("USERS:DELETE"),
param('userId').trim().isUUID().withMessage('must be valid UUID'),
controller.deleteUser)

module.exports = router