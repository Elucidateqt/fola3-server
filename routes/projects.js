const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const authMiddleware =  require('../middleware/auth')
const userManager = require('../database/users')
const projectManager = require('../database/projects')


const mailPattern = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/


router.get('/', authMiddleware.authenticateToken, async (req, res) => {
    if(req.user.role === 'Super Admin' || req.user.role === 'Admin'){
        projectManager.getAllProjects()
        .then(rows => res.send(rows))
        .catch(err => res.sendStatus(500))
    }else{
        projectManager.getProjectsOfUser(req.user.uuid)
        .then(rows => res.send(rows))
        .catch(err => res.sendStatus(500))
    }
})

router.post('/create', authMiddleware.authenticateToken, async (req, res) => {
    if(req.body.projectName){
        projectManager.addProject(req.user.uuid, req.body.projectName)
        .then(() => res.sendStatus(201))
        .catch(() => res.sendStatus(500))
    }else{
        res.status(400).send('project-name missing')
    }
})


router.post('/login', async (req, res) => {
    try{
        if(req.body.email && req.body.password && mailPattern.test(req.body.email)){
            const result = await userManager.getUser(req.body.email).catch(err => {
                console.error("error logging user in", err)
            })
            console.log("login result", result)
            if(await bcrypt.compare(req.body.password, result.password)){
                const user = {"uuid": result.uuid, "username": result.username, "role": result.role}
                const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET)
                res.json({accessToken: accessToken})
            }else{
                res.send(`incorrect email or password`)
            }
            
        }else{
            res.status(400).send("missing email or password")
        }
    }catch{
        res.status(500).send("error logging in")
    }
})

module.exports = router