const mongoose = require('mongoose');
const db = require('.');

const Project = new mongoose.model(
    "Project",
    new mongoose.Schema({
        uuid: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        description: String,
        members: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                },
                roles: [{
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Role"
                }]
            }
        ]
    })
)

const createProject = async (uuid, name, description, creatorId, creatorRoleIds) => {
    try{
        console.log("creatorRoleIds: ", creatorRoleIds)
        const project = await new Project({
            "uuid": uuid,
            "name": name,
            "description": description,
            "members": [{user: creatorId, roles: creatorRoleIds }]
        }).save();
        //TODO: emit event
        return {
            "_id" : project._id,
            "uuid" : project.uuid,
            "name" : project.name,
            "description" : project.description,
            "members": [{"uuid": creatorId, "roles": creatorRoleIds }]
        }
    }catch(err){
        throw new Error(`Error creating project in DB: ${err}`)
    }

}


const getProjectByUuid = async (uuid) => {
    try{
        const result  = await Project.aggregate([
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
                "projectid": { $first: "$_id" },
                "projectuuid": {$first: "$uuid"},
                "projectname": { $first: "$name" },
                "projectdescription": { $first: "$description" },
                "projectroles": {$push: "$member.roledoc.name"},
                "username": { $first: "$member.userdoc.username"},
                "uuid": { $first: "$member.userdoc.uuid"},
            }},
            {$group: {
                "_id": "$projectid",
                "uuid": {$first: "$projectuuid"},
                "name": {$first: "$projectname"},
                "description": {$first: "$projectdescription"},
                "members": {
                    $push: {
                        "username": "$username",
                        "uuid": "$uuid",
                        "projectroles": "$projectroles"
                    }
                }
            }},
            {$project: {
                "_id": 0
            }}
        ]).exec()
        console.log("result:", result)
        if(result.length === 0){
            return null
        }
        return result
    }catch(err){
        throw new Error(`Error loading Project with UUID ${uuid} from DB: \n ${err}`)
    }
}

const getAllProjects = async () => {
    try{
        const projects  = await Project.aggregate([
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
                "_id": 0
            }}
        ]).exec()
        return projects
    }catch(err){
        throw new Error(`Error loading all projects from DB: \n ${err}`)
    }
}

const getAllProjectsWithUser = async (userId) => {
    try{
        const projectList = Project.aggregate([
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
                "_id": 0
            }}
        ]).exec()
        return projectList

    }catch(err){
        throw new Error(`Error loading all Projects for User ${userId} from DB: \n ${err}`)
    }
}

const updateProjectDescription  = async (uuid, description) => {
    try{
        const results = await Project.updateOne({
            "uuid": uuid
        },
        [
            {$set: {"description": description}}
        ],
        {upsert: false})
        return results[0]
    }catch(err){
        throw new Error(`Error updating description for project with UUID ${uuid}: \n ${err}`)
    }
}

const updateProjectName = async (uuid, name) => {
    try{
        const result = await Project.updateOne({
            "uuid": uuid
        },
        [
            {$set: {"name": name}}
        ],
        {upsert: false})
        return result[0]
    }catch(err){
        throw new Error(`Error updating name for project with UUID ${uuid}: \n ${err}`)
    }
}

const deleteProject = async (uuid) => {
    await Project.deleteOne({ "uuid": uuid }).exec()
}


/*
UTILITY FUNCTIONS
*/

const addMembersToProject = async(projectUuid, members) => {
    try{
        await Project.updateOne({uuid: projectUuid},
            {$push: {"members": {$each: members}}}
        ).exec()
    }catch(err){
        throw new Error(`Error adding members to project: ${err}`)
    }
}

const removeMembersFromProject = async (projectUuid, memberIds) => {
    try{
        await Project.updateOne({
            uuid: projectUuid
        },
        {$pull: {"members": {"user": {$in: memberIds}}}})
        .exec()
    }catch(err){
        throw new Error(`Error removing members from project: ${err}`)
    }
}

const hasUserRoleInProject = async (userUuid, projectUuid) => {
    try{
        const results = await Project.aggregate([
            { $match: { "uuid": projectUuid } },
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
        throw new Error(`Error checking ProjectRole for user-id ${uuid} in Project ${projectUuid}`)
    }
}

const getUsersInProject = async (uuid)  => {
    try{
        const results = await Project.aggregate([
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
        throw new Error(`Error loading users for project with uuid ${uuid}: \n ${err}`)
    }
}

const isUserInProject = async (userUuid, projectUuid) => {
    try{
        const users = await getUsersInProject(projectUuid)
        if(!users){
            return false
        }
        return users.some(user => user.uuid === userUuid)
    }catch(err){
        throw new Error(`Error checking if user ${uuid} is in project ${projectUuid}: \n ${err}`)
    }
}

module.exports = { createProject, getProjectByUuid, getAllProjects, getAllProjectsWithUser, updateProjectDescription, updateProjectName, deleteProject, getUsersInProject, hasUserRoleInProject, addMembersToProject, removeMembersFromProject, isUserInProject }