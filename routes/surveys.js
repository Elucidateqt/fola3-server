const express = require('express')
const router = express.Router()
const authMiddleware =  require('../middleware/auth')
const surveyWare = require('../middleware/surveys')
const controller = require('../controllers/surveys')

//TO-DO: getSurvey puts survey in req-object --> dostuf

router.post('/', authMiddleware.authenticateToken, surveyWare.checkSurveyData, controller.createSurvey)

router.get('/:surveyId', controller.getSurveyByUuid)

/*router.delete('/:surveyId', authMiddleware.authenticateToken, projectWare.canUserAdminstrateProject, controller.deleteSurvey)

router.put('/:surveyId/startDate', authMiddleware.authenticateToken, projectWare.canUserAdminstrateProject, controller.setSurveyStartDate)

router.put('/:surveyId/endDate', authMiddleware.authenticateToken, projectWare.canUserAdminstrateProject, controller.setSurveyEndDate)

router.put('/:surveyId/name', authMiddleware.authenticateToken, projectWare.canUserAdminstrateProject, controller.setSurveyTitle)

router.post('/:surveyId/features', authMiddleware.authenticateToken, projectWare.canUserAdminstrateProject, controller.addFeature)

router.delete('/:surveyId/features', authMiddleware.authenticateToken, projectWare.canUserAdminstrateProject, controller.deleteFeature)*/

module.exports = router