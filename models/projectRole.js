const mongoose = require('mongoose')

const projectRole = mongoose.model(
    "ProjectRole",
    new mongoose.Schema({
        name: String
    })
)

module.exports = projectRole