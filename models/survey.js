const mongoose = require('mongoose')
const User = require('./user')

const Survey = new mongoose.model(
    "Survey",
    new mongoose.Schema({
        uuid: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        description: String,
        startDate: Date,
        endDate: Date,
        members: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User"
                },
                role: {
                    type: String,
                    required: true
                }
            }
        ],
        features: [{
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Feature"
                }],
        allowParticipantNote: Boolean
    })
)

const createSurvey = async (surveyData) => {
    try{
        const survey = new Survey({
            uuid: surveyData.uuid,
            name: surveyData.name,
            description: surveyData.description,
            members: surveyData.members,
            startDate: surveyData.startDate,
            endDate: surveyData.endDate,
            features: surveyData.features,
            allowParticipantNote: surveyData.participantNoteAllowed
        });
        await survey.save()
    }catch(err){
        throw new Error(`Error creating survey with uuid ${surveyData.uuid} from DB: ${err}`)
    }
}

const getSurveyByUuid = async (uuid) => {
    try{
        const result = await Survey.findOne({ uuid: uuid }).populate('features').exec()
        const survey = {
            uuid: result.uuid,
            name: result.name,
            description: result.description,
            startDate: result.startDate,
            endDate: result.endDate,
            features: result.features,
            allowParticipantNote: result.participantNoteAllowed
        }
        return survey
    } catch (err) {
        throw new Error(`Error loading survey with UUID ${uuid}: ${err}`)
    }
        
    }

module.exports = {
    createSurvey,
    getSurveyByUuid
}