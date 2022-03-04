const middleware = {}
middleware.auth = require('./auth')
middleware.user= require('./user')
middleware.board = require('./boards')
middleware.permission = require('./permissions')
middleware.role = require('./roles')

module.exports = middleware