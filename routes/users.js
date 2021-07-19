const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const authMiddleware =  require('../middleware/auth')
const userManager = require('../database/users')


const mailPattern = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/


router.get('/', authMiddleware.authenticateToken, async (req, res) => {
    if(req.user.role === 'Super Admin' || req.user.role === 'Admin' ){
        userManager.getAllUsers()
        .then(results => {
            console.log("results")
            return res.send(results)
        })
        .catch(err => res.sendStatus(500))
    }else {
        return res.sendStatus(403)
    }
})

router.post('/create', async (req, res) => {
        if(req.body.email && req.body.username && req.body.password && mailPattern.test(req.body.email)){
            const hash = await bcrypt.hash(req.body.password, 10).catch(err => res.sendStatus(500))
            userManager.insertUser(req.body.username, hash, req.body.email)
            .then(userId => res.send(`Created user with id ${userId}`))
            .catch(err => {
                if(err.errno === 1062){
                    return res.status(500).send("User already exists")
                }else{
                    return res.sendStatus(500)
                }
            })              
        }else{
            res.sendStatus(400)
        }
})


router.post('/login', async (req, res) => {
    if(req.body.email && req.body.password && mailPattern.test(req.body.email)){
        userManager.getUser(req.body.email)
        .then(async  result => {
            if(result && await bcrypt.compare(req.body.password, result.password)){
                const user = {"uuid": result.uuid, "username": result.username, "role": result.role}
                const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET)
                return res.json({accessToken: accessToken})
            }else{
                return res.send(`incorrect email or password`)
            }
        })
        .catch(err => {
            return res.sendStatus(500)
        })
    }else{
        return res.status(400).send("missing email or password")
    }
})

module.exports = router