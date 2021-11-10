require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')
const Port = process.env.PORT || 8081
const SuperAdminName = process.env.ADMIN_ACC_USERNAME
const SuperAdminPw = process.env.ADMIN_ACC_PW
const SuperAdminMail = process.env.ADMIN_MAIL
const http = require('http')

const registry = require('./lib/registry')
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, prettyPrint } = format;
const console = new transports.Console()

const logger = createLogger({
    level: 'debug',
    format: combine(
        timestamp(),
        prettyPrint()
    ),
    transports: [
        console
    ],
    exceptionHandlers: [
        console
    ]
  })

registry.registerLogger(logger)
let myLogger = registry.getService('logger').child({ component: 'app'})
const httpEvents = registry.createEventChannel('http')

/*httpEvents.on('httpRequestReceived', (method, url, params, body, timestamp) => {
    myLogger.log('info', `HTTP Event received: ${method}, ${url}, params: ${params}, body: ${body}, timestamp: ${timestamp}`)
})*/

//routes and db after logger-creation, so they can load it
const authRoute = require("./routes/auth")
const userRoute = require('./routes/users')
const projectRoute = require('./routes/projects')

const db = require('./models')
db.mongoose
    .connect('mongodb://localhost/kano-surveyer', {})
    .then(()=> {
        myLogger.log('info', 'Successfully connected to mongoDB.')
        db.initialize(SuperAdminName, SuperAdminMail, SuperAdminPw)   
    })
    .catch((err) => {
        myLogger.log('error', `Error connecting to MongoDB: \n ${err}`)
        process.exit()
    })


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
    myLogger.log('http', `request received: method: ${method} url: ${url} timestamp: ${timestamp}`)
    next()
}
app.use(fireHttpEvent)


app.get('/health', function (req, res) {
    res.sendStatus(204);
})

app.use("/auth", authRoute)
app.use("/users", userRoute)
app.use("/projects", projectRoute)

server = http.createServer(app)
server.listen(Port, () => {
    myLogger.log('info', `Server running on Port ${Port}`)
})