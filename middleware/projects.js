const db = require('../models')
const Project = db.project
const User = db.user

exports.isUserInProject = (req, res, next) => {
    Project.findOne({
        uuid: req.params.projectId
    }).exec((err, project) => {
        if(err){
            res.status(500).send({ message: err })
            return
        }
        User.findOne({
            $and: [{uuid: req.user.uuid}, {_id: {$in: project.members}}]
        }).exec((err, user) => {
            if(err){
                res.status(500).send({ message: err })
                return
            }
            console.log("user in project?", user)

        })
    })
}

exports.canViewProject = (req, res, next) => {
    User.findOne({
        uuid: req.user.uuid
    })
    .populate("role", "-__v")
    .exec((err, user) => {
        if(err){
            return res.status(500).send({message: err})
        }
        console.log("canViewProject", user)
        next()
    })
}

exports.canUserAdminstrateProject = (req, res, next) => {
    User.findOne({
        uuid: req.user.uuid
    })
    .populate("role", "-__v")
    .exec((err, user) => {
        if(err){
            return res.status(500).send({message: err})
        }
        //page-wide super admin and admins always may administrate projects
        if(user.role.name === 'super admin' || user.role.name === 'admin'){
            return next()
        }else{
            Project.findOne({
                uuid: req.params.projectId,
                members: {$elemMatch: {user: user._id, role: 'admin'}}
            })
            .exec((err, project) => {
                if(err){
                    return res.status(500).send({message: err})
                }
                if(project){
                    return next()
                }
                return res.sendStatus(403)
            })
        }
    })
}