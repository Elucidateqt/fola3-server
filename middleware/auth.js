const express = require('express')
const jwt = require('jsonwebtoken')
const db = require('../models')
const Project = db.project
const Role = db.role
const User = db.user
const controller = require('../controllers/auth')

exports.authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if(token == null) return res.sendStatus(401)

    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET, async (err, user) => {
        if(err){
            return res.sendStatus(403)
        }
        req.user = await User.getUserByUuid(user.uuid)
        next()
    })
}

exports.authenticatePermission = (permission) => {
  return async (req,res,next) => {
    if(req.user.permissions.includes(permission)){
      return next()
    }
    return res.sendStatus(401)
  }
}

exports.authenticateProjectPermission = (permission) => {
  return async (req, res, next) => {
    const globalPermissions = req.user.permissions
    let projectPermissions = []
    const projectRoles = await Project.getUserRolesInProject(req.user.uuid, req.params.projectId)
    await Promise.all(projectRoles.map(async (rolename) => {
      projectPermissions = projectPermissions.concat(await Role.getRolePermissions(rolename))
    }))
    if(!globalPermissions.concat(projectPermissions).includes(permission)){
      return res.sendStatus(401)
    }
    next()
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