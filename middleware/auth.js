const express = require('express')
const jwt = require('jsonwebtoken')
const db = require('../models')
const Project = db.project
const Role = db.role
const User = db.user
const Permission = db.permission
const controller = require('../controllers/auth')

exports.authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if(token == null) return res.sendStatus(401)

    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET, async (err, data) => {
        if(err){
            return res.sendStatus(403)
        }
        if(!req.locals){
          req.locals = {}
        }
        const user = await User.getUserByUuid(data.uuid)
        if(user === null){
          return res.sendStatus(403)
        }
        req.locals.user = user
        next()
    })
}

exports.authenticatePermission = (permission) => {
  return async (req,res,next) => {
    let userPermissions = req.locals.user.permissions
    if(!req.locals.user.roles.includes("super admin")){
      userPermissions = req.locals.user.permissions.filter(permission => !req.locals.user.revokedPermissions.includes(permission))
    }
    if(userPermissions.includes(permission)){
      return next()
    }
    return res.sendStatus(401)
  }
}

exports.authenticateProjectPermission = (permission) => {
  return async (req, res, next) => {
    const globalPermissions = req.locals.user.permissions
    let projectPermissions = []
    const projectRoles = await Project.getUserRolesInProject(req.locals.user.uuid, req.params.projectId)
    await Promise.all(projectRoles.map(async (rolename) => {
      projectPermissions = projectPermissions.concat(await Role.getRolePermissions(rolename))
    }))
    let userPermissions = globalPermissions.concat(projectPermissions)
    if(!req.locals.user.roles.includes("super admin")){
      userPermissions = userPermissions.filter(permission => 
        !req.locals.user.revokedPermissions.includes(permission)
      )
    }
    if(userPermissions.includes(permission)){
      return res.sendStatus(401)
    }
    next()
  }
}

exports.userHasAllRoles = async (roleIds, { req }) => {
  const roles = await Role.getRolesByUuidList(roleIds)
  req.targetRoles = roles
  const roleNames = roles.map(role => {return role.name})
  const hasAllRoles = roleNames.every(role => req.locals.user.roles.includes(role))
  if(!hasAllRoles){
    throw new Error(`You can't set roles you don't have.`)
  }
  return true
}

exports.userHasAllPermissions = async (permissions, { req }) => {
  const perms = await Permission.getPermissionsByUuidList(permissions)
  req.targetPermissions = perms
  const permNames = [...new Set(perms.map(permission => {return permission.name}))]
  const hasAllPermissions = permNames.every(permission => req.locals.user.permissions.includes(permission))
  if(!hasAllPermissions){
    throw new Error(`You can't set Permissions you don't have.`)
  }
  return true
}

/*This function implements the rule "Users can only grant projectroles that they own themselves"- might be useful in the future
exports.canUserGrantRole = (res, req, next) => {
  let targetRoles = []
  req.body.user.forEach(user => targetRoles = targetRoles.concat(user.roles))
  if(targetRoles.every(targetRole => req.locals.user.projectRoles.includes(targetRole))){
    return next()
  }
  return res.status(401).send({ "message": "roleGrantDenied" })
}*/