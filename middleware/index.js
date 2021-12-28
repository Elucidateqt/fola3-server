const middleware = {}
middleware.auth = require('./auth')
middleware.user= require('./user')
middleware.project = require('./projects')
middleware.permission = require('./permissions')
middleware.role = require('./roles')

module.exports = middleware