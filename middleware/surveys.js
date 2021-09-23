const db = require('../models')
const Project = db.project
const Survey = db.survey
const User = db.user

const helpers = require('../helpers')

const MAX_NAME_LENGTH = 140
const MAX_DESCRIPTION_LENGTH = 140

checkSurveyData = (req, res, next) => {
    let now = new Date()
    if((req.body.description && !helpers.isOfType(req.body.description, 'string')) ||
    (req.body.name && !helpers.isOfType(req.body.name, 'string')) ||
    //Date.parse returns NaN for invalid date-strings
    (req.body.startDate && isNaN(Date.parse(req.body.startDate))) ||
    (req.body.endDate && isNaN(Date.parse(req.body.startDate))) ||
    (req.body.collectFreeformFeedback && !helpers.isOfType(req.collectFreeformFeedback, 'boolean'))){
        return res.sendStatus(400)
    }   
    if(req.body.description && req.body.description.length > MAX_DESCRIPTION_LENGTH){
        return res.status(400).send({ "message": "description too long"})
    }
    if(req.body.name && req.body.name.length > MAX_NAME_LENGTH){
        return res.status(400).send({ "message": "name too long" })
    }
    if(req.body.startDate &&  req.body.startDate.valueOf() < now.getTime()){
        return res.status(400).send({ "message": "start-date must be in the future"})
    }
    if(req.body.endDate && req.body.endDate.valueOf() < now.getTime()){
        return res.status(400).send({ "message": "end-date must be in the future" })
    }
    if(req.body.startDate && req.body.endDate && req.body.startDate.valueOf() >= req.body.endDate.valueOf()){
        return res.status(400).send({ "message": "start-date must be before end-date" })
    }
    next()
}




canUserEditSurvey = (req, res, next) => {
    console.log('my awesome survey middleware')
}

module.exports = {
    checkSurveyData
}