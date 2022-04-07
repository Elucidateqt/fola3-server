const mongoose = require('mongoose');
const Crypto = require('crypto')

function createRandomString(bytes = 8) {  
  return Crypto
    .randomBytes(bytes)
    .toString('base64')
    .replace('/', '')
    .slice(0, bytes)
}

const Board = new mongoose.model(
    "Board",
    new mongoose.Schema({
        uuid: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        boardState: [[Object]],
        description: String,
        inviteCode: String,
        members: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                },
                roles: [{
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Role"
                }],
                cards: [Object]
            }
        ]
    },
    { timestamps: true })
)

const createBoard = async (uuid, name, description, creatorId, creatorRoleIds, creatorCards) => {
    try{
        const board = await new Board({
            "uuid": uuid,
            "name": name,
            "description": description,
            "inviteCode": createRandomString(8),
            "members": [{user: creatorId, roles: creatorRoleIds, cards: creatorCards }]
        }).save();
        return {
            "_id" : board._id,
            "uuid" : board.uuid,
            "name" : board.name,
            "inviteCode": board.inviteCode,
            "description" : board.description,
            "members": [{"uuid": creatorId, "roles": creatorRoleIds, "cards": creatorCards }],
            "createdAt": board.createdAt,
            "updatedAt": board.updatedAt
        }
    }catch(err){
        throw new Error(`Error creating board in DB: ${err}`)
    }

}


const getBoardByUuid = async (uuid) => {
    try{
        const result  = await Board.aggregate([
            {$match: {"uuid": uuid} },
            {$unwind: '$members'},
            {$lookup: {
                from: 'users',
                localField: 'members.user',
                foreignField: '_id',
                as: 'member.userdoc'
            }},
            {$unwind: '$member.userdoc'},
            {$unwind: '$members.roles'},
            {$lookup: {
                from: 'roles',
                localField: 'members.roles',
                foreignField: '_id',
                as: 'member.roledoc'
            }},
            {$unwind: '$member.roledoc'},
            {$group: {
                "_id": "$member.userdoc._id",
                "boardid": { $first: "$_id" },
                "boarduuid": {$first: "$uuid"},
                "boardname": { $first: "$name" },
                "boardInviteCode": { $first: "$inviteCode"},
                "boarddescription": { $first: "$description" },
                "boardState": {$first: "$boardState"},
                "boardroles": {$push: "$member.roledoc.name"},
                "username": { $first: "$member.userdoc.username"},
                "cards": {$first: "$members.cards"},
                "uuid": { $first: "$member.userdoc.uuid"},
                "boardCreatedAt": { $first: "$createdAt"},
                "boardUpdatedAt": { $first: "$updatedAt"},
            }},
            {$group: {
                "_id": "$boardid",
                "uuid": {$first: "$boarduuid"},
                "name": {$first: "$boardname"},
                "description": {$first: "$boarddescription"},
                "inviteCode": { $first: "$boardInviteCode"},
                "createdAt": {$first: "$boardCreatedAt"},
                "updatedAt": {$first: "$boardUpdatedAt"},
                "boardState": {$first: "$boardState"},
                "members": {
                    $push: {
                        "username": "$username",
                        "uuid": "$uuid",
                        "boardroles": "$boardroles",
                        "cards": "$cards"
                    }
                },
            }},
            {$project: {
                "_id": 0
            }}
        ]).exec()
        if(result.length === 0){
            return null
        }
        return result[0]
    }catch(err){
        throw new Error(`Error loading Board with UUID ${uuid} from DB: \n ${err}`)
    }
}

const getAllBoards = async () => {
    try{
        const boards  = await Board.aggregate([
            {$match: {} },
            {$unwind: '$members'},
            {$lookup: {
                from: 'users',
                localField: 'members.user',
                foreignField: '_id',
                as: 'members.user'
            }},
            {$unwind: '$members.user'},
            {$group: {
                "_id": "$_id",
                "uuid": { "$first": "$uuid" },
                "name": { "$first": "$name" },
                "description": { "$first": "$description" },
                "inviteCode": { "$first": "$inviteCode" },
                "createdAt": { "$first": "$createdAt" },
                "updatedAt": { "$first": "$updatedAt" },
                "members": {
                    "$push": {
                        "uuid": "$members.user.uuid",
                        "username": "$members.user.username",
                        "role": "$members.role"
                    }
                }
            }},
            {$project: {
                "_id": 0
            }}
        ]).exec()
        return boards
    }catch(err){
        throw new Error(`Error loading all boards from DB: \n ${err}`)
    }
}

const getAllBoardsWithUser = async (userId, limit, offset) => {
    try{
        const boardList = Board.aggregate([
            {$match: {"members": { "$elemMatch": {user: userId}}} },
            {$unwind: '$members'},
            {$lookup: {
                from: 'users',
                localField: 'members.user',
                foreignField: '_id',
                as: 'members.user'
            }},
            {$unwind: '$members.user'},
            {$group: {
                "_id": "$_id",
                "uuid": { "$first": "$uuid" },
                "name": { "$first": "$name" },
                "description": { "$first": "$description" },
                "inviteCode": { "$first": "$inviteCode" },
                "createdAt": { "$first": "$createdAt" },
                "updatedAt": { "$first": "$updatedAt" },
                "members": {
                    "$push": {
                        "uuid": "$members.user.uuid",
                        "username": "$members.user.username",
                        "role": "$members.role"
                    }
                }
            }},
            {$sort: {updatedAt: -1}},
            {$skip: offset},
            {$limit: limit},
            {$project: {
                "_id": 0
            }}
        ]).exec()
        return boardList

    }catch(err){
        throw new Error(`Error loading all Boards for User ${userId} from DB: \n ${err}`)
    }
}

const updateBoardDescription  = async (uuid, description) => {
    try{
        const results = await Board.updateOne({
            "uuid": uuid
        },
        [
            {$set: {"description": description}}
        ],
        {upsert: false})
        return results[0]
    }catch(err){
        throw new Error(`Error updating description for board with UUID ${uuid}: \n ${err}`)
    }
}

const updateBoardName = async (uuid, name) => {
    try{
        const result = await Board.updateOne({
            "uuid": uuid
        },
        [
            {$set: {"name": name}}
        ],
        {upsert: false})
        return result[0]
    }catch(err){
        throw new Error(`Error updating name for board with UUID ${uuid}: \n ${err}`)
    }
}

const createNewInviteCode = async (uuid) => {
    try{
        const result = await Board.findOneAndUpdate({
            "uuid": uuid
        },
        [
            {$set: {"inviteCode": createRandomString(8)}}
        ],
        {upsert: false})
        return result
    }catch(err){
        throw new Error(`Error creating new invite code for board with UUID ${uuid}: \n ${err}`)
    }
}

const deleteBoard = async (uuid) => {
    await Board.deleteOne({ "uuid": uuid }).exec()
}


/*
UTILITY FUNCTIONS
*/

const addMembersToBoard = async(boardUuid, members) => {
    try{
        await Board.updateOne({uuid: boardUuid},
            {$push: {"members": {$each: members}}}
        ).exec()
    }catch(err){
        throw new Error(`Error adding members to board: ${err}`)
    }
}

const removeMembersFromBoard = async (boardUuid, memberIds) => {
    try{
        await Board.updateOne({
            uuid: boardUuid
        },
        {$pull: {"members": {"user": {$in: memberIds}}}})
        .exec()
    }catch(err){
        throw new Error(`Error removing members from board: ${err}`)
    }
}

const getUserRolesInBoard = async (userUuid, boardUuid) => {
    try{
        const results = await Board.aggregate([
            { $match: { "uuid": boardUuid } },
            { $unwind: '$members'},
            {$lookup: {
                from: 'users',
                localField: 'members.user',
                foreignField: '_id',
                as: 'members.user'
            }},
            {$group: {
                "_id": "$_id",
                "members": {
                    "$push": {
                        "uuid": "$members.user.uuid",
                        "email": "$members.user.email",
                        "username": "$members.user.username",
                        "role": "$members.role"
                    }
                }
            }},
            {$match: {members: {$elemMatch: {uuid: userUuid}}}}
        ]).exec()   
        return results
    }catch(err){
        throw new Error(`Error in models.board.getUserRolesInBoard: \n ${err}`)
    }
}

const hasUserRoleInBoard = async (userUuid, boardUuid) => {
    try{
        const results = await Board.aggregate([
            { $match: { "uuid": boardUuid } },
            { $unwind: '$members'},
            {$lookup: {
                from: 'users',
                localField: 'members.user',
                foreignField: '_id',
                as: 'members.user'
            }},
            {$group: {
                "_id": "$_id",
                "members": {
                    "$push": {
                        "uuid": "$members.user.uuid",
                        "email": "$members.user.email",
                        "username": "$members.user.username",
                        "role": "$members.role"
                    }
                }
            }},
            {$match: {members: {$elemMatch: {uuid: userUuid}}}}
        ]).exec()   
        return results.length > 0
    }catch(err){
        throw new Error(`Error checking BoardRole for user-id ${uuid} in Board ${boardUuid}`)
    }
}

const getUsersInBoard = async (uuid)  => {
    try{
        const results = await Board.aggregate([
            {$match: {"uuid": uuid}},
            {$unwind: '$members'},
            {$lookup: {
                from: 'users',
                localField: 'members.user',
                foreignField: '_id',
                as: 'members.user'
            }},
            {$unwind: '$members.user'},
            {$group: {
                "_id": "$_id",
                "members": {
                    "$push": {
                        "uuid": "$members.user.uuid",
                        "email": "$members.user.email",
                        "username": "$members.user.username",
                        "role": "$members.role"
                    }
                }
            }},
            {$project: {
                "members": 1
            }}
        ]).exec()
        if(results.length === 0){
            return null
        }
        return results[0].members
    }catch(err){
        throw new Error(`Error loading users for board with uuid ${uuid}: \n ${err}`)
    }
}

const isUserBoardMember = async (userUuid, boardUuid) => {
    try{
        const users = await getUsersInBoard(boardUuid)
        if(!users){
            return false
        }
        return users.some(user => user.uuid === userUuid)
    }catch(err){
        throw new Error(`Error checking if user ${uuid} is in board ${boardUuid}: \n ${err}`)
    }
}

module.exports = { createBoard, getBoardByUuid, getAllBoards, getAllBoardsWithUser, updateBoardDescription, updateBoardName, createNewInviteCode, deleteBoard, getUsersInBoard, getUserRolesInBoard, hasUserRoleInBoard, addMembersToBoard, removeMembersFromBoard, isUserBoardMember }