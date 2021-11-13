const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const authWare = middleware.auth
const controller = require('../controllers/permissions')

router.get('/', authWare.authenticateToken, authWare.authenticatePermissions([ "PERMISSIONS:VIEW" ]), controller.getAllPermissions)

//TODO: prevent duplicates
router.post('/', authWare.authenticateToken, authWare.authenticatePermissions([ "PERMISSIONS:CREATE" ]), controller.createPermission)

router.delete('/:permissionName', authWare.authenticateToken, authWare.authenticatePermissions([ "PERMISSIONS:DELETE" ]), controller.deletePermission)