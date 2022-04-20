const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const authWare = middleware.auth
const controller = require('../controllers/bugreports')
const { body, param } = require('express-validator');

router.post('/', authWare.authenticateToken, authWare.authenticatePermission('API:BUGREPORT:CREATE'),
body('route').exists().isString().trim().escape(),
body('summary').exists().isString().trim().isLength({min: 10, max: 128}).isAlpha('de-DE', {ignore: ' '}).withMessage('No special characters allowed.'),
body('description').exists().isString().trim().isLength({min: 10, max: 512}).isAlpha('de-DE', {ignore: ' '}).withMessage('No special characters allowed.'),
controller.createBugreport)

router.get('/', authWare.authenticateToken, authWare.authenticatePermission('API:BUGREPORTS:READ'), controller.getAllBugreports)

router.get('/:reportId', authWare.authenticateToken, authWare.authenticatePermission('API:BUGREPORTS:READ'),
param('reportId').trim().isUUID().withMessage('must be valid UUID'),
controller.getBugreport)

router.delete('/:reportId', authWare.authenticateToken, authWare.authenticatePermission('API:BUGREPORT:DELETE'),
param('reportId').trim().isUUID().withMessage('must be valid UUID'),
controller.deleteBugreport)

module.exports = router