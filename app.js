require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')
const db = require('./models')
const userRoute = require('./routes/users')
const authRoute = require("./routes/auth")
const projectRoute = require('./routes/projects')
const authController = require('./controllers/auth')
const Port = process.env.PORT || 8081
const SuperAdminName = process.env.ADMIN_ACC_USERNAME
const SuperAdminPw = process.env.ADMIN_ACC_PW
const SuperAdminMail = process.env.ADMIN_MAIL
const http = require('http')

db.mongoose
    .connect('mongodb://localhost/kano-surveyer', {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(()=> {
        console.log("Successfully connected to mongoDB.")
        initializeDB()    
    })
    .catch((err) => {
        console.error("Error connecting to MongoDB", err)
        process.exit()
    })

const Role = db.role
const User = db.user

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended: true}))


app.get('/health', function (req, res) {
    res.send();
})

app.use("/auth", authRoute)
app.use("/users", userRoute)
//app.use("/projects", projectRoute)

server = http.createServer(app)
server.listen(Port, () => {
    console.log(`Server running on Port ${Port}`)
})


function initializeDB() {
    //check if site wide roles exist in db and add them otherwise
    Role.estimatedDocumentCount((err, count) => {
      if (!err && count === 0) {
        db.ROLES.forEach(roleName => {
            new Role({
                name: roleName
            }).save(err => {
                if(err){
                    console.error(`Error creating Role "${roleName}" during DB-Init: ${err}`)
                }
                console.log(`Added role ${roleName} to roles collection.`)
            })
        })
      }
    });
    //check if any Users exist and add super admin otherwise
    User.estimatedDocumentCount((err, count) => {
        if(!err && count === 0){
            authController.createUser(SuperAdminName, SuperAdminMail, SuperAdminPw, 'super admin', (err, user) => {
                if(err){
                    console.error('Error creating Super Admin during DB-Init.')
                }
                console.log('Successfully created Super Admin account.')
            })
        }
    })
  }