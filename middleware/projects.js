const db = require('../models')
const Project = db.project
const User = db.user
const helpers = require('../lib/helpers')
const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ component: 'Project Middleware'})


exports.isProjectUuidValid = async (req, res, next) => {
    try{
        if(helpers.isValidUuid(req.params.projectId)){
            return next()
        }

        return res.status(400).send({ "message": "projectUuidInvalid" })
    }catch(err){
        console.error(err)
        return res.sendStatus(500)
    }
}

exports.isUserInProject = async (req, res, next) => {
    try{
        if(await Project.isUserInProject(req.user.uuid, req.params.projectId)){
            return next()
        }
        return res.status(403)
    }catch(err){
        console.error(err)
        return res.sendStatus(500)
    }
}

exports.canViewProject = async (req, res, next) => {
    try{
        if(req.user.role === db.ROLES.ADMIN || req.user.role === db.ROLES.SUPER_ADMIN){
            return next()
        }
        await isUserInProject(req.user.uuid, req.params.projectId)
    }catch(err){
        return res.status(500).send({ "message": err })
    }
}

exports.canUserAdminstrateProject = async (req, res, next) => {
    const isProjectAdmin = await Project.hasUserRoleInProject(req.user.uuid, req.params.projectId, 'admin')
    if(req.user.role === db.ROLES.ADMIN || req.user.role === db.ROLES.SUPER_ADMIN || isProjectAdmin){
        return next()
    }
    return res.sendStatus(401)
}