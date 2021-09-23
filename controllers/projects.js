db = require('../models')
const { v4: uuidv4 } = require('uuid')
const helpers = require('../lib/helpers')
const User = db.user
const Project = db.project
const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ component: 'projectController' })

exports.createProject = async (req, res) => {
    let projectName = req.body.projectName || 'New Project',
        projectDescription = req.body.description || 'Description missing'
    try{
        const user = await User.getUserByUuid(req.user.uuid)
        if(!user){
            return res.status(500).send({ "message": "UserNotFound" })
        }
        const project = await Project.createProject(uuidv4(), projectName, projectDescription, user._id)
        delete project._id
        project.members[0].uuid = req.user.uuid
        project.members[0].username = req.user.username
        logger.log('info', `Project with uuid ${project.uuid} created by user ${req.user.uuid}`)
        return res.status(200).send({ "message": "projectCreated", "project": project})
    }catch(err){
        logger.log('error', err)
        return res.status(500).send({ "message": err })
    }
}

exports.deleteProject = async (req, res) => {
    try{
        if(!helpers.isValidUuid(req.params.projectId)){
            return res.status(400).send({ "message": "projectUuidInvalid" })
        }
        await Project.deleteProject(req.params.projectId)
        logger.log('error', `Deleted project ${req.params.projectId} from DB`)
        return res.sendStatus(200)
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.getMultipleProjects = async (req, res) => {
    try{
        if(req.user.role === db.ROLES.SUPER_ADMIN || req.user.role === db.ROLES.ADMIN){
            const projectList = await Project.getAllProjects()
            logger.log('info', `Loaded all projects from DB`)
            return res.status(200).send({ "message": "projectsLoaded", "projectList": projectList })
        }else{
            const user = await User.getUserByUuid(req.user.uuid)
            const projectList = await Project.getAllProjectsWithUser(user._id)
            logger.log('info', `Loaded multiple projects from DB.`)
            return res.status(200).send({ "message": "projectsLoaded", "projectList": projectList })
        }
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.getProject = async (req, res) => {
    try{
        const project = await Project.getProjectByUuid(req.params.projectId)
        if(!project){
            return res.sendStatus(404)
        }
        logger.log('info', `lodaded Project ${project.uuid} from DB`)
        return res.status(200).send({ "message": "projectLoaded", "project": project})   
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.setProjectDescription = async (req, res) => {
    if(req.body.description && typeof(req.body.description === 'string') && req.body.description.length <= 156){
        try{
            await Project.updateProjectDescription(req.params.projectId, req.body.description)
            logger.log('info', `updated description of project ${req.params.projectId}`)
            res.sendStatus(200)
        }catch(err){
            logger.log('error', err)
            res.sendStatus(500)
        }
    }else{
        res.sendStatus(400)
    }
}

exports.setProjectName = async (req, res) => {
    if(req.body.name && typeof(req.body.name === 'string') && req.body.name.length <= 40){
        try{
            await Project.updateProjectName(req.params.projectId, req.body.name)
            logger.log('info', `Updated description of project ${req.params.projectId}`)
            res.sendStatus(200)
        }catch(err){
            logger.log('error', err)
            res.sendStatus(500)
        }
    }else{
        res.sendStatus(400)
    }

}

exports.addMembers = async (req, res) => {
    if(req.body.users){
        let uniqueMembers = {},
            emailList = [],
            insertSet = []
        //sanitize input (no duplicate values)
        req.body.users.forEach(user => {
            if(!uniqueMembers.hasOwnProperty(user.email)){
                uniqueMembers[user.email] = {}
                uniqueMembers[user.email].role = user.role
                emailList.push(user.email)
            }
        })
        try{
            const currMembers = await Project.getUsersInProject(req.params.projectId)
            //filter all users out that already are members
            emailList = emailList.filter(email => !currMembers.some(member => member.email === email))
            const newMembers = await User.getUsersByEmail(emailList)
            if(newMembers.length === 0){
                //maybe some special response in the future?
            }
            newMembers.forEach(user => insertSet.push({user: user._id, role: uniqueMembers[user.email].role}))
            await Project.addMembersToProject(req.params.projectId, insertSet)
            logger.log('info', `Added ${newMembers.length} users to project ${req.params.projectId}`)
            return res.status(200).send({ "message": "membersAdded" })
        }catch(err){
            logger.log('error', err)
            return res.sendStatus(500)
        }
    }else{
        return res.sendStatus(400)
    }
}

exports.removeMemembers = async (req, res) => {
    if(req.body.users){
        //admin can't delete themselves to guarantee atleast 1 admin per project
        if(req.body.users.some(email => email === req.user.email)){
            logger.log('warn', `User ${req.user.uuid} tried to remove himself from project ${req.params.projectId}`)
            return res.status(400).send({ "message": "cantDeleteSelf" })
        }
        //get user IDs, remove from array with $pull $in
        let userIds = []
        const users = await User.getUsersByEmail(req.body.users)
        users.forEach(user => userIds.push(user._id))
        await Project.removeMembersFromProject(req.params.projectId, userIds)
        logger.log('info', `removed ${userIds.length} members from project ${req.params.projectId}`)
        return res.sendStatus(204)
    }else{
        logger.log('warn', `no users in request-body to remove from project ${req.params.projectId}`)
        return res.sendStatus(400)
    }
}

exports.leaveProject = async (req, res) => {
    try{
        const project = await Project.getProjectByUuid(req.params.projectId)
        if(!project){
            return res.status(404).send({ "message": "projectNotFound" })
        }
        //reject if the project would be left without any admins
        if(project.members.filter(user => user.role === "admin" && user.uuid != req.user.uuid).length === 0){
            logger.log('warn', `User ${req.user.uuid} not permitted to leave. Last admin left`)
            return res.status(405).send({ "message": "lastAdminLeft" })
        }
        const user = await User.getUserByUuid(req.user.uuid)
        await Project.removeMembersFromProject(req.params.projectId, [ user._id ])
        logger.log('info', `User ${req.user.uuid} left project ${req.params.projectId}`)
        return res.sendStatus(200)
    }catch(err){
        logger.log('error', err)
        return res.sendStatus(500)
    }
}