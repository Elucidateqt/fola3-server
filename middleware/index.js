const middleware = {}
middleware.auth = require('./auth')
middleware.user= require('./user')
middleware.project = require('./projects')

module.exports = middleware