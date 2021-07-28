const express = require('express')
const router = express.Router()
const authWare =  require('../middleware/auth')
const controller  = require('../controllers/users')

router.get('/view/all', authWare.authenticateToken, authWare.isAtleastModerator, controller.getAllUsers)

module.exports = router