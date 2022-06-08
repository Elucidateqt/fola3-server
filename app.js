require('dotenv').config()
const express = require('express')
const app = express()
const { Server } = require("socket.io");
const cors = require('cors')
const mongoose = require('mongoose')
mongoose.Promise = global.Promise
const Port = process.env.PORT || 8081
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:8080'
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


/**
 * creates the winston-instance for logging, adds it to the service-registry.
 * @returns the registered winston instance
 */
const initializeLogger = async () => {
    const console = new transports.Console({level: 'debug'})
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
            console,
            errorFile
        ]
    })
    
    registry.registerLogger(logger)
    const myLogger = await registry.getService('logger').child({ component: 'app'})
    return myLogger
}

/**
 * Initializes the prometheus registry and middleware that collects and stores
 * API-metrics that are served on /metrics
 * @returns 
 */
const initializeMonitoring = async () => {
    try {
        let tracker = {}
        const promClient = require('prom-client')
        const dataStore = new promClient.Registry()
        const promBundle = require("express-prom-bundle");
        const metricsMiddleware = promBundle({includeMethod: true, includePath: true, autoregister: false, promRegistry: dataStore});
        app.use(metricsMiddleware)
        tracker.client = promClient
        tracker.dataStore = dataStore
        const myTracker = registry.registerPrometheus(tracker)
        return myTracker
        
    } catch (err) {
        throw new Error(`Error initializing metrics tracker: \n ${err}`)
        
    }
}

/**
 * creates an instance of the redis client and connects it 
 * to a deployed Redis-instance.
 * @returns the registered promClient-instance
 */
const connectRedis = async () =>{
    try {
        const client = redis.createClient({
            url: `redis://${REDIS_HOST}:${REDIS_PORT}`
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
            pass: MONGO_PASSWORD
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
        const prometheusUser = await db.initialize()
        const httpEvents = registry.createEventChannel('http')

        const prometheus = await initializeMonitoring()
        const authController = require('./controllers/auth')
        const MetricsToken = await authController.generateAccessToken(prometheusUser.uuid)
        logger.log('info', `Use this Bearer token for your Prometheus instance to scrape metrics from the endpoint /metrics: \n ${MetricsToken}`)
        
        app.use(cors())
        app.use(express.json())
        app.use(express.urlencoded({extended: true}))
        
        //routes and db after logger-creation, so they can load it
        const authRoute = require("./routes/auth")
        const userRoute = require('./routes/users')
        const boardRoute = require('./routes/boards')
        const roleRoute = require('./routes/roles')
        const permissionRoute = require('./routes/permissions')
        const bugreportRoute = require('./routes/bugreports')
        const cardsetRoute = require('./routes/cardsets')
        const cardRoute = require('./routes/cards')
        const deckRoute = require('./routes/decks')

        
        const fireHttpEvent = (req, res, next) => {
            const method = req.method
            const url = req.url
            req.arrivedAt = new Date()
            const body = req.body
            const params = req.params
            httpEvents.emit('httpRequestReceived', method, url, params, body, req.arrivedAt)
            logger.log('http', `request received: method: ${method} url: ${url} timestamp: ${req.arrivedAt}`)
            next()
        }
        app.use(fireHttpEvent)
        
        
        app.get('/health', function (req, res) {
            res.sendStatus(204);
        })

        const middleware = require('./middleware')
        app.get('/metrics', middleware.auth.authenticateToken, middleware.auth.authenticatePermission('API:METRICS:READ'), async (req, res) => {
            const metrics = await prometheus.dataStore.metrics()
            res.set('Content-Type', prometheus.dataStore.contentType)
            res.end(metrics)
        })
        
        app.use("/auth", authRoute)
        app.use("/roles", roleRoute)
        app.use("/permissions", permissionRoute)
        app.use("/users", userRoute)
        app.use("/boards", boardRoute)
        app.use("/bugreports", bugreportRoute)
        app.use("/cardsets", cardsetRoute)
        app.use("/cards", cardRoute)
        app.use("/decks", deckRoute)

        const server = http.createServer(app)

        
        const socketio = new Server(server, {
            path: "/socket/",
            cors: {
                origin: CLIENT_URL,
                allowedHeaders: ["my-custom-header"],
                credentials: true
              }
          });

        const io = registry.registerSocketIO(socketio)

        const socketController = require('./controllers/socketio.js')
        socketController.initializeListeners()
        
        server.listen(Port, () => {
            logger.log('info', `Server running on Port ${Port}`)
        })

        // Graceful shutdown
        process.on('SIGTERM', () => {
            clearInterval(prometheus.client)
        
            server.close((err) => {
            if (err) {
                logger.log("error", err)
                process.exit(1)
            }
        
            process.exit(0)
            })
        })
    } catch (err) {
        console.error(err)
        process.exit(1)
        
    }

})()
