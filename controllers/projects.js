db = require('../models')
const { v4: uuidv4 } = require('uuid')
const User = db.user
const Project = db.project
const Role = db.role
const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ component: 'projectController' })
const { validationResult } = require('express-validator')

exports.createProject = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return
    }
    let projectName = req.body.name || 'New Project',
        projectDescription = req.body.description || 'Description missing'
    try{
        const user = await User.getUserByUuid(req.locals.user.uuid)
        if(!user){
            res.status(500).send({ "message": "UserNotFound" })
            return
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
        project.members[0].uuid = req.locals.user.uuid
        project.members[0].username = req.locals.user.username
        project.members[0].roles = roleNames
        logger.log('info', `Project with uuid ${project.uuid} created by user ${req.locals.user.uuid}`)
        res.status(200).send({ "message": "projectCreated", "project": project})
    }catch(err){
        logger.log('error', err)
        res.status(500).send({ "message": err })
    }
}

exports.deleteProject = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return
    }
    try{
        await Project.deleteProject(req.params.projectId)
        logger.log('error', `Deleted project ${req.params.projectId} from DB`)
        res.sendStatus(200)
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.getAllProjects = async (req, res, next) => {
    try{
        const projectList = await Project.getAllProjects()
        logger.log('info', `Loaded all projects from DB`)
        res.status(200).send({ "message": "projectsLoaded", "projectList": projectList })
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.getProjectsWithUser = async (req, res, next) => {
    try{
        //return all projects if no offset or limit specified
        const offset = req.query.offset || 0
        const limit = req.query.limit || Number.MAX_SAFE_INTEGER
        const projectList = await Project.getAllProjectsWithUser(req.locals.user._id, parseInt(limit), parseInt(offset))
        logger.log('info', `Loaded projects with User ${req.locals.user.uuid} from DB.`)
        res.status(200).send({ "message": "projectsLoaded", "projectList": projectList })
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.returnProject = async (req, res, next) => {
    try{
        logger.log('info', `lodaded Project ${req.locals.project.uuid} from DB`)
        res.status(200).send({ "message": "projectLoaded", "project": req.locals.project})   
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.setProjectDescription = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return
    }
    try{
        await Project.updateProjectDescription(req.params.projectId, req.body.description)
        logger.log('info', `updated description of project ${req.params.projectId}`)
        res.sendStatus(200)
        
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
        
    }
}

exports.setProjectName = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return 
    }
    try{
        await Project.updateProjectName(req.params.projectId, req.body.name)
        logger.log('info', `Updated description of project ${req.params.projectId}`)
        res.sendStatus(200)
        
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
        
    }
}

exports.createNewInviteCode = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return 
    }
    try {
        const project = await Project.createNewInviteCode(req.params.projectId)
        res.json({ inviteCode: project.inviteCode})
    } catch (err) {
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.joinWithCode = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return 
    }
    const isBearerInProject = req.locals.project.members.some(member => {
        return member.uuid === req.locals.user.uuid
    })
    if(isBearerInProject){
        res.status(400).send({ error: 'already_member'})
        return
    }
    if(req.query.inv !== req.locals.project.inviteCode){
        res.status(403).json({ error: 'invite.invalid'})
        return
    }
    try{
        const roles = await Role.getProjectRolesByNameList(['projectMember'])
        await Project.addMembersToProject(req.params.projectId, [{user: req.locals.user._id, roles: [roles[0]._id]}])
        res.sendStatus(204)
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.addMembers = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return 
    }
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
        res.sendStatus(204)
        
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
        
    }
}

exports.removeMemembers = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return 
    }
    try {
        //admin can't delete themselves to guarantee atleast 1 admin per project
        if(req.body.users.some(uuid => uuid === req.locals.user.uuid)){
            logger.log('warn', `User ${req.locals.user.uuid} tried to remove himself from project ${req.params.projectId}`)
            res.status(400).send({ "message": "cantDeleteSelf" })
            return 
        }
        let userIds = []
        const users = await User.getUsersByUuids(req.body.users)
        users.forEach(user => userIds.push(user._id))
        await Project.removeMembersFromProject(req.params.projectId, userIds)
        logger.log('info', `removed ${userIds.length} members from project ${req.params.projectId}`)
        res.sendStatus(204)
        
    } catch (err) {
        logger.log('error', err)
        res.sendStatus(500)
        
    }
}

exports.leaveProject = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return 
    }
    try{
        const project = await Project.getProjectByUuid(req.params.projectId)
        if(!project){
            res.status(404).send({ "message": "projectNotFound" })
            return 
        }
        //reject if the project would be left without any admins
        if(project.members.filter(user => user.projectroles.includes('projectAdmin') && user.uuid != req.locals.user.uuid).length === 0){
            logger.log('warn', `User ${req.locals.user.uuid} not permitted to leave. Last admin left`)
            return res.status(405).send({ "message": "lastAdminLeft" })
        }
        const user = await User.getUserByUuid(req.locals.user.uuid)
        await Project.removeMembersFromProject(req.params.projectId, [ user._id ])
        logger.log('info', `User ${req.locals.user.uuid} left project ${req.params.projectId}`)
        res.sendStatus(200)
        
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
        
    }
}