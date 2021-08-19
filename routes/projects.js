const express = require('express')
const router = express.Router()
const authMiddleware =  require('../middleware/auth')
const projectWare = require('../middleware/projects')
const controller = require('../controllers/projects')


router.get('/', authMiddleware.authenticateToken, controller.getMultipleProjects)

router.get('/:projectId', authMiddleware.authenticateToken, projectWare.canViewProject, controller.getProject)

router.post('/', authMiddleware.authenticateToken, controller.createProject)

router.delete('/:projectId', authMiddleware.authenticateToken, projectWare.canUserAdminstrateProject, controller.deleteProject)

router.put('/:projectId/description', authMiddleware.authenticateToken, projectWare.canUserAdminstrateProject, controller.setProjectDescription)

router.put('/:projectId/name', authMiddleware.authenticateToken, projectWare.canUserAdminstrateProject, controller.setProjectName)

router.post('/:projectId/users', authMiddleware.authenticateToken, projectWare.canUserAdminstrateProject, controller.addMembers)

router.delete('/:projectId/users', authMiddleware.authenticateToken, projectWare.canUserAdminstrateProject, controller.removeMemembers)



router.delete('/:projectId', authMiddleware.authenticateToken, projectWare.canUserAdminstrateProject, (req, res) => {
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