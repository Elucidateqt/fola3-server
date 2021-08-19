db = require('../models')
const { v4: uuidv4 } = require('uuid')
const User = db.user
const Project = db.project

exports.createProject = (req, res) => {
    let projectName = req.body.projectName || 'New Project',
        projectDescription = req.body.description || 'Description missing'
    User.findOne({
        uuid: req.user.uuid
    })
    .exec((err, user) => {
        if(err){
            res.status(500).send({ message: err })
            return
        }
        const project = new Project({
            uuid: uuidv4(),
            name: projectName,
            description: projectDescription,
            members: [{user: user._id, role: 'admin'}]
        });
        project.save(err => {
            if (err) {
                res.status(500).send({ message: err })
                return
            }
            res.send({message: 'Project created successfully.'})
        });
    })
}

exports.deleteProject = (req, res) => {
    Project.deleteOne({uuid: req.params.projectId})
    .exec((err, result) => {
        if(err){
            return res.status(500).send({ message: err })
        }
        console.log(`[Project Controller]: ${req.user.uuid} deleted project ${req.params.projectId}.`)
        res.sendStatus(200)
    })
}

exports.getMultipleProjects = (req, res) => {
    User.findOne({
        uuid: req.user.uuid
    })
    .populate('role', 'name')
    .exec((err, user) => {
        if(err){
            return res.status(500).send({message: err})
        }
        if(user.role.name === 'super admin' || user.role.name === 'admin'){
            Project.aggregate([
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
            ])
            .exec((err, projectList) => {
                if(err){
                    console.log('aggregation error', err)
                    return res.status(500).send({message: err})
                }
                console.log("aggregated", projectList)
                res.send({projects: projectList})
            })
        }else{
            User.findOne({
                uuid: req.user.uuid
            }).exec((err, user) => {
                if(err){
                    return res.status(500).send({ "message": err })
                }
                Project.aggregate([
                    {$match: {"members": { "$elemMatch": {user: user._id}}} },
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
                ])
                .exec((err, projectList) => {
                    if(err){
                        console.log('aggregation error', err)
                        return res.status(500).send({message: err})
                    }
                    console.log("aggregated user specific", projectList[0].members.role)
                    res.send({projects: projectList})
                })
            })
        }

    })
}

exports.getProject = (req, res) => {
    Project.aggregate([
        {$match: {uuid: req.params.projectId} },
        {$unwind: '$members'},
        {$match: { 'members.user': req.user._id}},
        {$lookup: {
            from: 'users',
            localField: 'members.user',
            foreignField: '_id',
            as: 'members.user'
        }},
        {$unwind: '$members.user'},
        {$project: {
            "_id": 0,
            "__v": 0,
            "members._id": 0,
            "members.role": 0,
            "members.user._id": 0,
            "members.user.password": 0,
            "members.user.role": 0,
            "members.user.__v": 0,
            "members.user.projectrole._id": 0,
            "members.user.projectrole.__v": 0
        }}
    ])
    .exec((err, project) => {
        if(err){
            return res.status(500).send({message: err})
        }
        res.send({project: project})
    })
}

exports.setProjectDescription = (req, res) => {
    if(req.body.description){
        Project.updateOne({
            uuid: req.params.projectId
        },
        [
            {$set: {description: req.body.description}}
        ],
        {upsert: false})
        .exec((err, result) => {
            if(err){
                return res.status(500).send({message: err})
            }
            res.sendStatus(200)
        })
    }else{
        res.sendStatus(401)
    }
}

exports.setProjectName = (req, res) => {
    if(req.body.name){
        Project.updateOne({
            uuid: req.params.projectId
        },
        [
            {$set: {name: req.body.name}}
        ],
        {upsert: false})
        .exec((err, result) => {
            if(err){
                return res.status(500).send({message: err})
            }
            res.sendStatus(200)
        })
    }else{
        res.sendStatus(401)
    }

}

exports.addMembers = (req, res) => {
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
        //first make sure, we don't add any duplicates
        Project.aggregate([
            {"$match":  { "uuid": req.params.projectId}},
            {"$unwind": "$members"},
            {"$lookup": {
                from: 'users',
                localField: 'members.user',
                foreignField: '_id',
                as: 'members.user'
            }},
            {"$group": {
                "_id": "$_id",
                "members": {
                    "$push": "$members.user.email"
                }
            }}
        ])
        .exec((err, projects) => {
            if(err){
                console.error("error getting project members: ", err)
                return res.status(500).send({ "message": err })
            }
            let currMembers = projects[0].members.flat()
            console.log("current memebers", currMembers)
            emailList = emailList.filter(email => !currMembers.includes(email))

            //get object-IDs of users and add them to members-array
            User.find({
                email: {$in: emailList}
            })
            .exec((err, users) => {
                if(err){
                    console.log("error loading players to add to project:", err)
                    return res.status(500).send({message: err})
                }
                users.forEach(user => insertSet.push({user: user._id, role: uniqueMembers[user.email].role}))
                Project.updateOne({uuid: req.params.projectId},
                    {$push: {members: {$each: insertSet}}}
                )
                .exec((err, result) => {
                    if(err){
                        return res.status(500).send({message: err})
                    }
                    res.sendStatus(200)
                })
            })
        })
    }else{
        return res.sendStatus(401)
    }
}

exports.removeMemembers = (req, res) => {
    if(req.body.users){
        //get user IDs, remove from array with $pull $in
        let userIds = []
        User.find({
            email: {$in: req.body.users}
        })
        .exec((err, users) => {
            if(err){
                return res.status(500).send({message: err})
            }
            users.forEach(user => userIds.push(user._id))
            Project.updateOne({
                uuid: req.params.projectId
            },
            {$pull: {"members": {"user": {$in: userIds}}}})
            .exec((err, result) => {
                if(err){
                    return res.status(500).send({message: err})
                }
                res.sendStatus(200)
            })
        })
    }else{
        return res.sendStatus(401)
    }
}