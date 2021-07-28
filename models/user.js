const mongoose = require('mongoose')


const User = mongoose.model(
    "User",
    new mongoose.Schema({
        uuid: {
            type: String,
            required: true
        },
        username: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        password: {
            type: String,
            required: true
        },
        role: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Role"
        }
    })
)

module.exports = User