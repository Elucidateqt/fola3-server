const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcrypt')
const db = require('../models')
const User = db.user
const Role = db.role
const CardSet = db.cardset
const { validationResult } = require('express-validator')
const registry = require('../lib/registry')
const redis = registry.getService("redis")

const logger = registry.getService('logger').child({ component: 'authController'})

const ACCESS_TOKEN_LIFETIME = process.env.ACCESS_TOKEN_LIFETIME || 60
const REFRESH_TOKEN_LIFETIME = process.env.REFRESH_TOKEN_LIFETIME || 86400

const signUp = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return
    }
    try {
        const roleId = await Role.getRoleIdByName("user")
        const user = await User.createUser(uuidv4(), req.body.username, req.body.email, bcrypt.hashSync(req.body.password,10), [roleId])
        //create personal cardset for new users
        const userCardSet = await db.cardset.createCardSet(uuidv4(), `${req.body.username}'s Set`, "", false, user._id)
        logger.log("info", `User ${user.username} created successfully!`)
        res.status(204).send({ "message": "userCreated", "user": user})
    }catch(err){
        res.status(500).send({ "message": err })
    }
};


const signIn = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try{
        const user = await User.getUserByEmail(req.body.email)
        if (!user) {
            return res.status(404).send({ message: "User Not found." });
        }
    
        const passwordValid = await bcrypt.compare(
            req.body.password,
            user.password
        )
    
        if (!passwordValid) {
            return res.status(401).send({
              accessToken: null,
              message: "Invalid Password!"
            });
        }
        const accessToken = await generateAccessToken(user.uuid, parseInt(ACCESS_TOKEN_LIFETIME))
        const refreshToken = await generateRefreshToken(user.uuid, parseInt(REFRESH_TOKEN_LIFETIME))
        res.set('Cache-Control', 'no-store')
        res.json({
            "message": "loginSuccessful",
            "refresh_token": refreshToken,
            "token_type": "Bearer",
            "expires_in": ACCESS_TOKEN_LIFETIME,
            "access_token": accessToken
        });
        logger.log('info',`User ${user.username} logged in`)
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

const signOut = async (req, res) => {
    try{
        const authHeader = req.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]
        if(token == null){
            return res.sendStatus(401)
        }
        jwt.verify(token,process.env.REFRESH_TOKEN_SECRET, async (err, data) => {
            if(err){
                logger.log("error", err)
                return res.sendStatus(403)
            }
            logger.log('debug', `Logout user ${data.uuid} with jti ${data.jti}`)
            await redis.del(`sessions:${data.uuid}:${data.jti}`)
            logger.log("info", `User ${data.uuid} signed out`)
            res.sendStatus(204)
        })
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

const refreshAccessToken = async (req, res) => {
    try{
        const authHeader = req.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]
        if(token == null || token === undefined){
            return res.sendStatus(401)
        }
        jwt.verify(token,process.env.REFRESH_TOKEN_SECRET, async (err, data) => {
            if(err){
                logger.error(`Error verifying token in controllers.auth: \n ${err}`)
                return res.sendStatus(403)
            }
            await redis.del(`sessions:${data.uuid}:${data.jti}`)
            const accessToken = await generateAccessToken(data.uuid, parseInt(ACCESS_TOKEN_LIFETIME))
            const refreshToken = await generateRefreshToken(data.uuid, parseInt(REFRESH_TOKEN_LIFETIME))
            logger.log('info', `Tokens refreshed by user ${data.uuid}`)
            res.set('Cache-Control', 'no-store')
            res.json({
                "refresh_token": refreshToken,
                "token_type": "Bearer",
                "expires_in": process.env.ACCESS_TOKEN_LIFETIME,
                "access_token": accessToken
            })
        })
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

/**
 * creates a signed refresh-token with the configured secret
 * @param {String} userId - the uuid to be encoded in the token
 * @param {Number} ttl - the tokens lifetime
 * @returns {Object} the resulting token
 */
const generateRefreshToken = async (userId, ttl) => {
    try {
        const tokenId = uuidv4()
        const refreshToken = jwt.sign({
            "jti": tokenId,
            "exp": Math.floor(Date.now() / 1000) + ttl,
            "uuid": userId}, process.env.REFRESH_TOKEN_SECRET)
        await redis.set(`sessions:${userId}:${tokenId}`, JSON.stringify(refreshToken),
            {
                EX: ttl
            }
        )
        return refreshToken
    } catch (err) {
        throw new Error(`Error generating refreshtoken for user ${userId}: ${err}`)
    }
}

/**
 * creates a signed access-token based on data provided
 * @param {String} uuid - the uuid to encode in the token
 * @param {Number} ttl  - the lifetime for the token
 * @returns {Object} the signed token
 */
const generateAccessToken = async (uuid, ttl) => {
    try{
        const ttlExists = ttl !== undefined 
        const tokenPayload =  ({
            //conditional inclusion of ttl into object, if a ttl was provided
            ...ttlExists && { exp: Math.floor(Date.now() / 1000) + ttl },
            "uuid": uuid
          });
        return jwt.sign(tokenPayload, process.env.ACCESS_TOKEN_SECRET)
    }catch(err){
        throw new Error(`Error generating accesstoken for user ${uuid}`)
    }
}

module.exports = { signUp, signIn, signOut, refreshAccessToken, generateAccessToken }