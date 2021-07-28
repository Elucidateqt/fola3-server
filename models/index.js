const mongoose = require('mongoose')
mongoose.Promise = global.Promise

const db = {}

db.mongoose = mongoose

db.user = require('./user')
db.role = require('./role')

db.ROLES = ["user", "moderator", "admin", "super admin"]

db.refreshTokens = []

module.exports = db