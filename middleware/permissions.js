const express = require('express')
const db = require('../models')
const Permission = db.permission
const { validationResult } = require('express-validator');

const preventDuplicatePermission = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const permissionExists = Permission.permissionExists(req.body.name)
    if(permissionExists){
        return res.status(400).send({ 'message': 'Error: permission already exists' })
    }
    next()

}

module.exports = { preventDuplicatePermission }