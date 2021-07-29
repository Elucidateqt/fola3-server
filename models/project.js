const mongoose = require('mongoose')

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
                    ref: "User"
                },
                role: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "ProjectRole"
                }
            }
        ]
    })
)

module.exports = Project