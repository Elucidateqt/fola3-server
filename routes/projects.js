const express = require('express')
const router = express.Router()
const authMiddleware =  require('../middleware/auth')


router.get('/', authMiddleware.authenticateToken, async (req, res) => {
    if(req.user.role === 'Super Admin' || req.user.role === 'Admin'){
        projectManager.getAllProjects()
        .then(rows => res.send(rows))
        .catch(err => res.sendStatus(500))
    }else{
        projectManager.getProjectsOfUser(req.user.uuid)
        .then(rows => res.send(rows))
        .catch(err => {
            console.error("Error loading user Projects from DB:", err)
            res.sendStatus(500)
        })
    }
})

router.post('/create', authMiddleware.authenticateToken, async (req, res) => {
    let projectName = req.body.projectName || 'New Project',
        projectDescription = req.body.description || 'Description missing'
    projectManager.addProject(req.user.uuid, projectName, projectDescription)
    .then(() => {return res.sendStatus(201)})
    .catch((err) => {
        console.error("error creating project in DB", err)
        return res.sendStatus(500)})
})


router.post('/delete', authMiddleware.authenticateToken, async (req, res) => {
    res.sendStatus(405)
})

router.post('/addUser', authMiddleware.authenticateToken, async (req, res) => {
    if(req.body.projectUuid && req.body.userUuid){
        const projectRole = await projectManager.getUserRoleInProject(req.user.uuid, req.body.projectUuid).catch(err => {
            console.error("error getting user role in project:", err)
            return res.sendStatus(500)
        })
        if(projectRole && projectRole === 'Admin'){
            projectManager.addUserToProject(req.body.userUuid, req.body.projectUuid)
            .then(() => {return res.sendStatus(201)})
            .catch((err) => {
                if(err.errno === 1062){
                    console.error("error adding user to project: already member")
                    return res.sendStatus(409)
                }
                console.error("error adding user to project:", err)
                return res.sendStatus(500)
            })
        }else{
            return res.sendStatus(403)
        }
    }else{
        return res.sendStatus(400)
    }
})

module.exports = router