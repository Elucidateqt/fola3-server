const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const authWare = middleware.auth
const controller = require('../controllers/bugreports')
const { body, param } = require('express-validator');

router.post('/', authWare.authenticateToken, authWare.authenticatePermission('BUGREPORT:CREATE'),
body('report').exists().isString().trim().isLength({min: 10, max: 512}).escape(),
controller.createBugreport)

router.get('/', authWare.authenticateToken, authWare.authenticatePermission('BUGREPORTS:READ'), controller.getAllBugreports)

router.get('/:reportId', authWare.authenticateToken, authWare.authenticatePermission('BUGREPORTS:READ'),
param('reportId').trim().isUUID().withMessage('must be valid UUID'),
controller.getBugreport)

router.delete('/:reportId', authWare.authenticateToken, authWare.authenticatePermission('BUGREPORT:DELETE'),
param('reportId').trim().isUUID().withMessage('must be valid UUID'),
controller.deleteBugreport)

module.exports = router