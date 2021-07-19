require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')
const userRoute = require('./routes/users')
const projectRoute = require('./routes/projects')
const Port = process.env.PORT || 8081
const http = require('http')

app.use(cors())
app.use(express.json())

app.get('/health', function (req, res) {
    res.send();
})

app.use("/users", userRoute)
app.use("/projects", projectRoute)

server = http.createServer(app)
server.listen(Port, "0.0.0.0", () => {
    "Server running on "
})