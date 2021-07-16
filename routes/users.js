const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const authMiddleware =  require('../middleware/auth')
const userManager = require('../database/users')


const mailPattern = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/


router.get('/', async (req, res) => {
    try{
        const users = await userManager.getAllUsers().catch(err => {
            console.error("error fetching users from DB", err)
        })
        console.log("users", users)
        res.json(users)
    }catch{
        res.sendStatus(500)
    }
})

router.post('/create', async (req, res) => {
    try{
        if(req.body.email && req.body.username && req.body.password && mailPattern.test(req.body.email)){
            const hash = await bcrypt.hash(req.body.password, 10)
            const userId = await userManager.insertUser(req.body.username, hash, req.body.email).catch(err => {
                if(err.errno === 1062){
                    return res.status(500).send("Email exists")
                }
            })
            res.send(`Created user with id ${userId}`)
        }else{
            res.status(400).send("Invalid email")
        }
    }catch{
        res.status(500).send("error creating user")
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