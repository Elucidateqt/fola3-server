db = require('../models')
const { v4: uuidv4 } = require('uuid')
const User = db.user
const Project = db.project
const ProjectRole = db.projectRole

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
        ProjectRole.findOne({ name: 'admin' }, (err, role) => {
            if (err) {
                res.status(500).send({ message: err })
                return
            }
            console.log(`Project-Role: ${role} \n user: ${user}`)
            const project = new Project({
                uuid: uuidv4(),
                name: projectName,
                description: projectDescription,
                members: [{user: user._id, role: role._id}]
            });
            project.save(err => {
                if (err) {
                    res.status(500).send({ message: err })
                    return
                }
                res.send({message: 'Project created successfully.'})
            });
        });
    })
}