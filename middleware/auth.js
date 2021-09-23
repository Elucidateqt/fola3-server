const express = require('express')
const jwt = require('jsonwebtoken')
const db = require('../models')
const User = db.user
const Role = db.role

exports.authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if(token == null) return res.sendStatus(401)

    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if(err){
            return res.sendStatus(403)
        }
        req.user = user
        next()
    })
}

exports.authenticateRoles = (rolenames) => {
  return (req,res,next) => {
    if(!rolenames.some(rolename => rolename === req.user.role)){
      return res.sendStatus(401)
    }
    next()
  }
}