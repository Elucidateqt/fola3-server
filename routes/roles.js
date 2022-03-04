const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const authWare = middleware.auth
const roleWare = middleware.role
const controller = require('../controllers/roles')
const { body, param } = require('express-validator')


router.get('/', authWare.authenticateToken, authWare.authenticatePermission("ROLES:VIEW"),  controller.getAllRoles)

router.post('/', authWare.authenticateToken, authWare.authenticatePermission("ROLES:CREATE"),
body('name').exists().isString().trim().custom(roleWare.isNewRole),
body('scope').exists().isString().trim().isIn(["global", "board"]),
body('permissions').exists().isArray().custom(authWare.userHasAllPermissions),
body('permissions.*').isUUID(),
controller.createRole)

router.put('/:roleId', authWare.authenticateToken, authWare.authenticatePermission("ROLES:UPDATE"),
param('roleId').trim().isUUID().custom(roleWare.roleExists),
body('name').exists().isString().trim(),
body('scope').exists().isString().trim().isIn(["global", "board"]),
body('permissions').exists().isArray().isLength({min: 1}).custom(authWare.userHasAllPermissions),
body('permissions.*').isUUID(),
controller.updateRole)

router.delete('/:roleId', authWare.authenticateToken, authWare.authenticatePermission("ROLES:DELETE"), param('roleId').trim().isUUID(), controller.deleteRole)

module.exports = router