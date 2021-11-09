const db = require('../models')
const Project = db.project
const Role = db.Role
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
        logger.log('error', err)
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
        logger.log('error', err)
        return res.sendStatus(500)
    }
}

exports.canViewProject = async (req, res, next) => {
    try{
        if(await Project.isUserInProject(req.user.uuid, req.params.projectId) ||
        await Role.rolesContainPermissions(req.user.roles.concat(req.user.projectRoles), [ "PROJECTS:VIEW" ])){
            return next()
        }
        return res.sendStatus(403)
    }catch(err){
        logger.log('error', err)
        return res.sendStatus(500)
    }
}