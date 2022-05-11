db = require('../models')
const { v4: uuidv4 } = require('uuid')
const User = db.user
const Board = db.board
const Role = db.role
const Permission = db.permission
const Deck = db.deck
const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ component: 'boardController' })
const { validationResult } = require('express-validator')

exports.createBoard = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return
    }
    let boardName = req.body.name || 'New Board',
        boardDescription = req.body.description || 'Description missing'
    try{
        const user = await User.getUserByUuid(req.locals.user.uuid)
        if(!user){
            res.status(500).send({ "message": "UserNotFound" })
            return
        }
        const roles = await Role.getBoardRoles()
        const roleNames = []
        const roleIds = []
        roles.forEach((role) => {
            roleIds.push(role._id)
            roleNames.push(role.name)
        })
        
        const board = await Board.createBoard(uuidv4(), boardName, boardDescription, user._id, roleIds)
        delete board._id

        logger.log('info', `Board with uuid ${board.uuid} created by user ${req.locals.user.uuid}`)
        res.status(200).send({ "message": "boardCreated", "board": board})
    }catch(err){
        logger.log('error', err)
        res.status(500).send({ "message": err })
    }
}

exports.deleteBoard = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return
    }
    try{
        await Board.deleteBoard(req.params.boardId)
        logger.log('error', `Deleted board ${req.params.boardId} from DB`)
        res.sendStatus(200)
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.getAllBoards = async (req, res, next) => {
    try{
        const boardList = await Board.getAllBoards()
        logger.log('info', `Loaded all boards from DB`)
        res.status(200).send({ "message": "boardsLoaded", "boardList": boardList })
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.getBoardsWithUser = async (req, res, next) => {
    try{
        //return all boards if no offset or limit specified
        const offset = req.query.offset || 0
        const limit = req.query.limit || 20
        const boardList = await Board.getAllBoardsWithUser(req.locals.user._id, parseInt(limit), parseInt(offset))
        for(i = 0; i < boardList.length; i++ ){
            let board = boardList[i]
            let cleanedMembers = {}
            for(j = 0; j < board.members.length; j++){
                let member = board.members[j]
                let roles = []
                let permissions = []
                let memberRoles = await Role.getRolesByIds(member.roles.flat())
                memberRoles.forEach(memberRole => {
                    if(!roles.some(role => role.uuid === memberRole.uuid)){
                        roles.push({"name": memberRole.name, "uuid": memberRole.uuid})
                    }
                    memberRole.permissions.forEach(currPermission => {
                        if(!permissions.includes(currPermission.name)){
                            permissions.push(currPermission.name)
                        }
                    })
                })
                member.roles = roles
                member.permissions = permissions
                member.uuid = member.uuid[0]
                member.username = member.username[0]
                delete member.__v
                delete member._id
                cleanedMembers[member.uuid] = member
            }
            board.members = cleanedMembers
        }
        logger.log('info', `Loaded boards with User ${req.locals.user.uuid} from DB.`)
        res.status(200).send({"boardList": boardList })
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.returnBoard = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return
    }
    try{
        logger.log('info', `lodaded Board ${req.locals.board.uuid} from DB`)
        res.status(200).send({ "message": "boardLoaded", "board": req.locals.board})   
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.setBoardDescription = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return
    }
    try{
        await Board.updateBoardDescription(req.params.boardId, req.body.description)
        logger.log('info', `updated description of board ${req.params.boardId}`)
        res.sendStatus(200)
        
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
        
    }
}

exports.setBoardName = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return 
    }
    try{
        await Board.updateBoardName(req.params.boardId, req.body.name)
        logger.log('info', `Updated description of board ${req.params.boardId}`)
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
        const board = await Board.createNewInviteCode(req.params.boardId)
        res.json({ inviteCode: board.inviteCode})
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
    const isBearerInBoard = req.locals.board.members.some(member => {
        return member.uuid === req.locals.user.uuid
    })
    if(isBearerInBoard){
        return res.sendStatus(204)
    }
    if(req.query.inv !== req.locals.board.inviteCode){
        res.status(403).json({ error: 'invite.invalid'})
        return
    }
    try{
        const roles = await Role.getBoardRolesByNameList(['boardMember'])

        await Board.addMembersToBoard(req.params.boardId, [{ user: req.locals.user._id, roles: [roles[0]._id], cards: [] }])
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
            const roles = await Role.getBoardRolesByNameList(user.roles)
            uniqueMembers[user.uuid].roleIds = roles.map(role => {return role._id})
            userUuids.push(user.uuid)
        }
    }))
    try{
        const currMembers = await Board.getUsersInBoard(req.params.boardId)
        //filter all users out that already are members
        userUuids = userUuids.filter(uuid => !currMembers.some(member => member.uuid === uuid))
        const newMembers = await User.getUsersByUuids(userUuids)
        if(newMembers.length === 0){
            //maybe some special response in the future if no new members remain?
        }
        newMembers.forEach(user => insertSet.push({user: user._id, roles: uniqueMembers[user.uuid].roleIds}))
        await Board.addMembersToBoard(req.params.boardId, insertSet)
        logger.log('info', `Added ${newMembers.length} users to board ${req.params.boardId}`)
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
        //admin can't delete themselves to guarantee atleast 1 admin per board
        if(req.body.users.some(uuid => uuid === req.locals.user.uuid)){
            logger.log('warn', `User ${req.locals.user.uuid} tried to remove himself from board ${req.params.boardId}`)
            res.status(400).send({ "message": "cantDeleteSelf" })
            return 
        }
        let userIds = []
        const users = await User.getUsersByUuids(req.body.users)
        users.forEach(user => userIds.push(user._id))
        await Board.removeMembersFromBoard(req.params.boardId, userIds)
        logger.log('info', `removed ${userIds.length} members from board ${req.params.boardId}`)
        res.sendStatus(204)
        
    } catch (err) {
        logger.log('error', err)
        res.sendStatus(500)
        
    }
}

exports.leaveBoard = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return 
    }
    try{
        const board = await Board.getBoardByUuid(req.params.boardId)
        if(!board){
            res.status(404).send({ "message": "boardNotFound" })
            return 
        }
        //reject if the board would be left without any admins
        if(board.members.filter(user => user.roles.some(role => role.name === 'boardAdmin') && user.uuid != req.locals.user.uuid).length === 0){
            logger.log('warn', `User ${req.locals.user.uuid} not permitted to leave. Last admin left`)
            return res.status(405).send({ "message": "lastAdminLeft" })
        }
        const user = await User.getUserByUuid(req.locals.user.uuid)
        await Board.removeMembersFromBoard(req.params.boardId, [ user._id ])
        logger.log('info', `User ${req.locals.user.uuid} left board ${req.params.boardId}`)
        res.sendStatus(200)
        
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
        
    }
}