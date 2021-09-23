db = require('../models')
const Survey = db.survey
const User = db.user
const { v4: uuidv4 } = require('uuid')

createSurvey = async (req, res) => {
    try{
        const user = await User.getUserByUuid(req.user.uuid)
        const now = new Date()
        const survey = {
            uuid: uuidv4(),
            name: 'New Survey',
            description: 'New Survey Description',
            startDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            endDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
            features: [],
            members: [{user: user._id, role: 'admin'}],
            allowParticipantNote: req.body.participantNoteAllowed || false
        }
        await Survey.createSurvey(survey)
        res.sendStatus(204)
    }catch(err){
        console.error('error creating survey:',err)
        res.sendStatus(500)
    }
}

getSurveysInProject = async (req, res) => {
    
}

getAllSurveys = async (req, res) => {
    
}

getSurveyByUuid = async (req, res) => {
    try{
        survey = await Survey.getSurveyByUuid(req.params.surveyId)
        res.status(200).send({ "survey": survey })
    }catch (err){
        console.error(`error getting survey with uuid ${req.params.uuid}: ${err}`)
        res.sendStatus('500')
    }
}

module.exports = {
    createSurvey,
    getSurveyByUuid
}