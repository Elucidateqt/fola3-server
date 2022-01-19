const db = require('../models')
const Project = db.project
const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ component: 'Project Middleware'})
const { validationResult } = require('express-validator')


exports.loadProject = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try{
        const project = await Project.getProjectByUuid(req.params.projectId)
        if(!project){
            return res.sendStatus(404)
        }
        req.locals.project = project
        next()
    }catch(err){
        logger.log('error', err)
        return res.sendStatus(500)
    }
}

exports.isUserInProject = async (req, res, next) => {
    try{
        if(await Project.isUserInProject(req.locals.user.uuid, req.params.projectId)){
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
        if(req.locals.project.members.some(member => member.uuid === req.locals.user.uuid) || req.locals.user.permissions.includes('PROJECTS:VIEW')){
            return next()
        }
        return res.sendStatus(403)
    }catch(err){
        logger.log('error', err)
        return res.sendStatus(500)
    }
}