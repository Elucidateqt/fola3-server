const db = require('../models')
const Project = db.project
const Role = db.Role
const helpers = require('../lib/helpers')
const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ component: 'Project Middleware'})


exports.loadProject = async (req, res, next) => {
    try{
        if(!helpers.isValidUuid(req.params.projectId)){
            return res.status(400).send({ "message": "projectUuidInvalid" })
        }
        const project = await Project.getProjectByUuid(req.params.projectId)
        if(!project){
            return res.sendStatus(404)
        }
        req.project = project
        next()
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
        if(req.project.members.some(member => member.uuid === req.user.uuid) || req.user.permissions.includes('PROJECTS:VIEW')){
            return next()
        }
        return res.sendStatus(403)
    }catch(err){
        logger.log('error', err)
        return res.sendStatus(500)
    }
}