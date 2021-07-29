const mongoose = require('mongoose')
mongoose.Promise = global.Promise

const db = {}

db.mongoose = mongoose

db.user = require('./user')
db.role = require('./role')
db.project = require('./project')
db.projectRole = require('./projectRole')

db.ROLES = ["user", "moderator", "admin", "super admin"]

db.PROJECT_ROLES = ["admin", "assistant", "observer"]

db.refreshTokens = []

module.exports = db