const middleware = {}
middleware.auth = require('./auth')
middleware.user= require('./user')
middleware.board = require('./boards')
middleware.permission = require('./permissions')
middleware.role = require('./roles')
middleware.card = require('./cards')
middleware.cardset = require('./cardsets')

module.exports = middleware