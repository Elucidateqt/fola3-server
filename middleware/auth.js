const express = require('express')
const jwt = require('jsonwebtoken')
const db = require('../models')
const Board = db.board
const Role = db.role
const User = db.user
const Permission = db.permission
const controller = require('../controllers/auth')
const registry = require('./../lib/registry')
const logger = registry.getService('logger').child({ component: "Auth Middleware" })

exports.authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if(token == null){
      return res.sendStatus(401)
    }
    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET, async (err, data) => {
      if(err){
          logger.log('error', `Error verifying token: \n ${err}`)
          return res.sendStatus(403)
      }
      if(!req.locals){
        req.locals = {}
      }
      try {
        const user = await User.getUserByUuid(data.uuid)
        if(user === null){
          logger.error('Error verifying token: User no longer exists')
          return res.sendStatus(403)
        }
        req.locals.user = user
        req.locals.user.useragent = req.get('user-agent')
        req.locals.user.effectivePermissions = user.permissions.filter(permission => !user.revokedPermissions.some(revokedPermission => revokedPermission._id === permission._id))
        next()
      }
      catch (err) {
        logger.log("error", `Error loading bearer in middleware: ${err}`)
        return res.sendStatus(500)
      }
    })
}

exports.authenticatePermission = (permissionName) => {
  return (req,res,next) => {
    if(!req.locals.user){
      logger.log("error", `No user found while authenticating permission`)
      return res.sendStatus(500)
    }
    if(!req.locals.user.effectivePermissions.some(permission => permission.name === permissionName)){
      return res.sendStatus(401)
    }
    next()
  }
}

exports.authenticateBoardPermission = (permissionName) => {
  return async (req, res, next) => {
    const globalPermissions = req.locals.user.permissions
    let boardPermissions = []
    const boardRoles = await Board.getUserRolesInBoard(req.locals.user.uuid, req.params.boardId)
    await Promise.all(boardRoles.map(async (rolename) => {
      boardPermissions = boardPermissions.concat(await Role.getRolePermissions(rolename))
    }))
    if(!req.locals.user.effectivePermissions.some(permission => permission.name === permissionName)){
      return res.sendStatus(401)
    }
    next()
  }
}

exports.userHasAllRoles = async (roleIds, { req }) => {
  const roles = await Role.getRolesByUuidList(roleIds)
  req.targetRoles = roles
  const roleNames = roles.map(role => {return role.name})
  const hasAllRoles = roleNames.every(roleName => req.locals.user.roles.some(role => role.name === roleName))
  if(!hasAllRoles){
    throw new Error(`You can't set roles you don't have.`)
  }
  return true
}

exports.userHasAllPermissions = async (permissions, { req }) => {
  const hasAllPermissions = permissions.every(permissionName => req.locals.user.effectivePermissions.some(permission => permission.name === permissionName))
  if(!hasAllPermissions){
    throw new Error(`You can't set Permissions you don't have.`)
  }
  return true
}