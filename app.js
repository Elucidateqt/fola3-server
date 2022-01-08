require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
mongoose.Promise = global.Promise
const Port = process.env.PORT || 8081
const SuperAdminName = process.env.ADMIN_ACC_USERNAME
const SuperAdminPw = process.env.ADMIN_ACC_PW
const SuperAdminMail = process.env.ADMIN_MAIL
const REDIS_HOST = process.env.REDIS_HOST || 'localhost'
const REDIS_PORT = process.env.REDIS_PORT || 6379
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || null
const MONGO_HOST = process.env.MONGO_HOST || 'localhost'
const MONGO_PORT = process.env.MONGO_PORT || 27017
const MONGO_DATABASE = process.env.MONGO_DATABASE
const MONGO_USER = process.env.MONGO_USER || null
const MONGO_PASSWORD = process.env.MONGO_PASSWORD || null
const redis = require('redis')
const http = require('http')

const registry = require('./lib/registry')
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, prettyPrint } = format;



const initializeLogger = async () => {
    const console = new transports.Console({level: 'info'})
    const errorFile = new transports.File({level: 'error', filename: 'logs/errors.log'})
    const logger = createLogger({
        level: 'debug',
        format: combine(
            timestamp(),
            prettyPrint()
            ),
            transports: [
            console,
            errorFile
        ],
        exceptionHandlers: [
            console
        ]
    })
    
    registry.registerLogger(logger)
    const myLogger = await registry.getService('logger').child({ component: 'app'})
    return myLogger
}

const connectRedis = async () =>{
    try {
        const client = redis.createClient({
            host: REDIS_HOST,
            port: REDIS_PORT,
            password: REDIS_PASSWORD
        })
        await client.connect()
        const myRedis = registry.registerRedis(client)
        return myRedis
    } catch (err) {
        throw new Error(`Error connecting to Redis: \n ${err}`)
    }
    
}

const connectMongoDB = async () => {
    try {
        await mongoose.connect(`mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_DATABASE}`,
        {
            user: MONGO_USER,
            pwd: MONGO_PASSWORD
        })
    } catch (err) {
        throw new Error(`Error connecting to MongoDB: \n ${err}`)
    }
}




(async () => {
    try {
        
        const logger = await initializeLogger()
        await connectMongoDB()
        logger.log("info", `Successfully connected to MongoDB at ${MONGO_HOST}:${MONGO_PORT}/${MONGO_DATABASE}`)
        await connectRedis()
        logger.log("info", `Successfully connected to Redis at ${REDIS_HOST}:${REDIS_PORT}`)
        const db = require('./models')
        db.initialize(SuperAdminName, SuperAdminMail, SuperAdminPw) 
        const httpEvents = registry.createEventChannel('http')
        
        
        
        /*httpEvents.on('httpRequestReceived', (method, url, params, body, timestamp) => {
            myLogger.log('info', `HTTP Event received: ${method}, ${url}, params: ${params}, body: ${body}, timestamp: ${timestamp}`)
        })*/
        
        //routes and db after logger-creation, so they can load it
        const authRoute = require("./routes/auth")
        const userRoute = require('./routes/users')
        const projectRoute = require('./routes/projects')
        const roleRoute = require('./routes/roles')
        const permissionRoute = require('./routes/permissions')
        const bugreportRoute = require('./routes/bugreports')
        
        
        app.use(cors())
        app.use(express.json())
        app.use(express.urlencoded({extended: true}))
        
        
        //TODO: just for testing. remove
        const fireHttpEvent = (req, res, next) => {
            const method = req.method
            const url = req.url
            const timestamp = new Date()
            const body = req.body
            const params = req.params
            httpEvents.emit('httpRequestReceived', method, url, params, body, timestamp)
            logger.log('http', `request received: method: ${method} url: ${url} timestamp: ${timestamp}`)
            next()
        }
        app.use(fireHttpEvent)
        
        
        app.get('/health', function (req, res) {
            res.sendStatus(204);
        })
        
        app.use("/auth", authRoute)
        app.use("/roles", roleRoute)
        app.use("/permissions", permissionRoute)
        app.use("/users", userRoute)
        app.use("/projects", projectRoute)
        app.use("/bugreports", bugreportRoute)
        
        
        
        
        server = http.createServer(app)
        server.listen(Port, () => {
            logger.log('info', `Server running on Port ${Port}`)
        })
    } catch (err) {
        console.log(`error: \n ${err}`)
        process.exit()
        
    }

})()
