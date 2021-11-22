const express = require('express')
const jwt = require('jsonwebtoken')
const db = require('../models')
const Project = db.project
const Role = db.role
const controller = require('../controllers/auth')

//TODO: test this
exports.createNewAccessToken = async (req, res, next) => {
  try{
    const token = await controller.generateAccessToken(req.user.uuid)
    res.body.accessToken = token
    next()
  }catch(err){
    logger.log(err)
    return res.sendStatus(500)
  }
}

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

exports.authenticatePermissions = (permissions) => {
  return async (req,res,next) => {
    //TODO: user has no projectRoles with permission "PROJECTS:MANAGE" in addMember route. Edit projectcontroller.getProject first to give new token to user with projectroles
    if(await Role.rolesContainPermissions(req.user.roles.concat(req.user.projectRoles), permissions)){
      return next()
    }
    return res.sendStatus(401)
  }
}

/*This function implements the rule "Users can only grant projectroles that they own themselves"- might be useful in the future
exports.canUserGrantRole = (res, req, next) => {
  let targetRoles = []
  req.body.user.forEach(user => targetRoles = targetRoles.concat(user.roles))
  if(targetRoles.every(targetRole => req.user.projectRoles.includes(targetRole))){
    return next()
  }
  return res.status(401).send({ "message": "roleGrantDenied" })
}*/