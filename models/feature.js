const mongoose = require('mongoose')

const Feature = new mongoose.model(
    "Feature",
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
        questionPositive: {
            type: String,
            required: true
        },
        questionNegative: {
            type: String,
            required: true
        }
    })
)

module.exports = Feature