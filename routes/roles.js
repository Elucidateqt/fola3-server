const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const authWare = middleware.auth
const controller = require('../controllers/roles')


router.get('/', authWare.authenticateToken, authWare.authenticatePermission("ROLES:VIEW"),  controller.getAllRoles)

router.post('/', authWare.authenticateToken, authWare.authenticatePermission("ROLES:CREATE"), controller.createRole)

//TODO: return 404 on unknown roleName and check if user has permissions to be added
router.put('/:roleName', authWare.authenticateToken, authWare.authenticatePermission("ROLES:UPDATE"), controller.updateRole)

router.delete('/:roleName', authWare.authenticateToken, authWare.authenticatePermission("ROLES:DELETE"), controller.deleteRole)

module.exports = router