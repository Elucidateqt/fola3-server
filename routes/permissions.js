const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const authWare = middleware.auth
const controller = require('../controllers/permissions')

router.get('/', authWare.authenticateToken, authWare.authenticatePermission("PERMISSIONS:VIEW"), controller.getAllPermissions)

//TODO: prevent duplicates
router.post('/', authWare.authenticateToken, authWare.authenticatePermission("PERMISSIONS:CREATE"), controller.createPermission)

router.delete('/:permissionName', authWare.authenticateToken, authWare.authenticatePermission("PERMISSIONS:DELETE"), controller.deletePermission)

module.exports = router