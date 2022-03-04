const db = require('../models')
const Board = db.board
const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ component: 'Board Middleware'})
const { validationResult } = require('express-validator')


exports.loadBoard = async (req, res, next) => {
    console.log("loading board")
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try{
        const board = await Board.getBoardByUuid(req.params.boardId)
        if(!board){
            return res.sendStatus(404)
        }
        req.locals.board = board
        console.log("board loaded")
        next()
    }catch(err){
        logger.log('error', err)
        return res.sendStatus(500)
    }
}

exports.isUserBoardMember = async (req, res, next) => {
    try{
        if(await Board.isUserBoardMember(req.locals.user.uuid, req.params.boardId)){
            return next()
        }
        return res.status(403)
    }catch(err){
        logger.log('error', err)
        return res.sendStatus(500)
    }
}

exports.canViewBoard = async (req, res, next) => {
    try{
        if(req.locals.board.members.some(member => member.uuid === req.locals.user.uuid) || req.locals.user.permissions.includes('BOARDS:VIEW')){
            return next()
        }
        return res.sendStatus(403)
    }catch(err){
        logger.log('error', err)
        return res.sendStatus(500)
    }
}