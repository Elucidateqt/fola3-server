db = require('../models')
const { v4: uuidv4 } = require('uuid')
const helpers = require('../lib/helpers')
const User = db.user
const Project = db.project
const Role = db.role
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
        const roles = await Role.getProjectRoles()
        const roleNames = []
        const roleIds = []
        roles.forEach((role) => {
            roleIds.push(role._id)
            roleNames.push(role.name)
        })
        const project = await Project.createProject(uuidv4(), projectName, projectDescription, user._id, roleIds)
        delete project._id
        project.members[0].uuid = req.user.uuid
        project.members[0].username = req.user.username
        project.members[0].roles = roleNames
        logger.log('info', `Project with uuid ${project.uuid} created by user ${req.user.uuid}`)
        return res.status(200).send({ "message": "projectCreated", "project": project})
    }catch(err){
        logger.log('error', err)
        return res.status(500).send({ "message": err })
    }
}

exports.deleteProject = async (req, res) => {
    try{
        await Project.deleteProject(req.params.projectId)
        logger.log('error', `Deleted project ${req.params.projectId} from DB`)
        return res.sendStatus(200)
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.getAllProjects = async (req, res) => {
    try{
        const projectList = await Project.getAllProjects()
        logger.log('info', `Loaded all projects from DB`)
        return res.status(200).send({ "message": "projectsLoaded", "projectList": projectList })
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.getProjectsWithUser = async (req, res) => {
    try{
        const projectList = await Project.getAllProjectsWithUser(req.user._id)
        logger.log('info', `Loaded projects with User ${req.user.uuid} from DB.`)
        return res.status(200).send({ "message": "projectsLoaded", "projectList": projectList })
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

//TODO: reduce and format information returned
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
            userUuids = [],
            insertSet = []
        //sanitize input (no duplicate values)
        await Promise.all(req.body.users.map(async (user) => {
            if(!uniqueMembers.hasOwnProperty(user.uuid)){
                uniqueMembers[user.uuid] = {}
                const roles = await Role.getProjectRolesByNameList(user.roles)
                uniqueMembers[user.uuid].roleIds = roles.map(role => {return role._id})
                userUuids.push(user.uuid)
            }
        }))
        try{
            const currMembers = await Project.getUsersInProject(req.params.projectId)
            //filter all users out that already are members
            userUuids = userUuids.filter(uuid => !currMembers.some(member => member.uuid === uuid))
            const newMembers = await User.getUsersByUuids(userUuids)
            if(newMembers.length === 0){
                //maybe some special response in the future if no new members remain?
            }
            newMembers.forEach(user => insertSet.push({user: user._id, roles: uniqueMembers[user.uuid].roleIds}))
            await Project.addMembersToProject(req.params.projectId, insertSet)
            logger.log('info', `Added ${newMembers.length} users to project ${req.params.projectId}`)
            return res.sendStatus(204)
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
        if(req.body.users.some(uuid => uuid === req.user.uuid)){
            logger.log('warn', `User ${req.user.uuid} tried to remove himself from project ${req.params.projectId}`)
            return res.status(400).send({ "message": "cantDeleteSelf" })
        }
        //get user IDs, remove from array with $pull $in
        let userIds = []
        const users = await User.getUsersByUuids(req.body.users)
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
        if(project.members.filter(user => user.projectroles.includes('projectAdmin') && user.uuid != req.user.uuid).length === 0){
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