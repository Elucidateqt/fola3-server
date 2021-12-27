const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const authWare = middleware.auth
const permissionMiddleware = middleware.permission
const controller = require('../controllers/permissions')
const { body, param } = require('express-validator');

router.get('/', authWare.authenticateToken, authWare.authenticatePermission("PERMISSIONS:VIEW"), controller.getAllPermissions)

router.post('/', authWare.authenticateToken, authWare.authenticatePermission("PERMISSIONS:CREATE"), body('name').exists().isString(), permissionMiddleware.preventDuplicatePermission, controller.createPermission)

router.delete('/:permissionId', authWare.authenticateToken, authWare.authenticatePermission("PERMISSIONS:DELETE"), controller.deletePermission)

module.exports = router