const jwt = require('jsonwebtoken')
function generateAccessToken(user) {
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: process.env.ACCESS_TOKEN_LIFETIME})
}

module.exports = {generateAccessToken}