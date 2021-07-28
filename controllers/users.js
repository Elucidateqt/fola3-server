const db = require('../models')
const User = db.user
const Role = db.role

exports.getAllUsers =  (req, res) => {
    User.find()
    .populate("role", "-__v")
    .exec((err, users) => {
        if(err){
            res.status(500).send({ message: err })
            return
        }
        let userList = []
        users.forEach(user => userList.push({uuid: user.uuid, username: user.username, email: user.email, role: user.role.name}))
        res.send(userList)
    })
}