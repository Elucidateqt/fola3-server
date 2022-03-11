const mongoose = require('mongoose')

const CardSchema = new mongoose.Schema(
    {
        "uuid": {
            type: String,
            required: true
        },
        "names": {
            "en-US": {
                type: String,
                required: true,
                default: "no name specified"
            },
            "de-DE": String
        },
        "descriptions": {
            "en-US": {
                type: String,
                required: true,
                default: "no description specified"
            },
            "de-DE": String
        },
        "cardType": {
            type: String,
            required: true
        },
        "interactionSubjectLeft": String,
        "interactionSubjectRight": String,
        "interactionDirection": String,
        "imageUrl": String,
        "knowledbaseUrl": String,
        "LTEsensors": [String],
        "requiredSensors": [String]
    },
    { timestamps: true }
)

CardSchema.pre('remove', async (doc) => {
    const card = this
    //remove role from all board-members if it's a board role
    if(card.scope === 'board'){
        await this.model.cardsets.update({ "cards": {$elemMatch: card._id}},
            {$pull: {"cards": card._id}},
        )
    }
    // TODO: remove card from all decks
});

const Card = mongoose.model(
    "Card",
    CardSchema
)


const createCard = async (config) => {
    try{
        const result = await new Card(config).save()
        const card = {
            "_id": result._id,
            "names": result.names,
            "descriptions": result.descriptions,
            "updatedAt": result.updatedAt,
            "createdAt": result.createdAt,
            "interactionSubjectLeft": result.interactionSubjectLeft,
            "interactionSubjectRight": result.interactionSubjectRight,
            "interactionDirection": result.interactionDirection,
            "imageUrl": result.imageUrl,
            "knowledbaseUrl": result.knowledbaseUrl,
            "LTEsensors": result.LTEsensors,
            "requiredSensors": result.requiredSensors
        }
        return card
    }catch(err){
        throw new Error(`Error while creating card ${config.names.enUS} in DB: \n ${err}`)
    }
}

const getCardByUuid = async (uuid) => {
    try {
        const card = await Card.findOne({uuid: uuid})
        return card
    } catch (err) {
        logger.error(`error loading card with uuid ${uuid} from DB: ${err}`)
    }
}

const getCards = async (options) => {
    let matchAggregator = {$match: {}},
    sortBy = options.sortBy || 'updatedAt',
    dir = options.sortDir === 'ASC' ? 1 : -1,
    limit = options.limit || 10,
    offset = options.offset || 0
    //build match aggregator dynamically based on provided options
    if(options.hasOwnProperty('cardIds') && options.cardIds.length > 0){
        matchAggregator._id = { $in: cardIds}
    }
    if(options.hasOwnProperty('type')){
        matchAggregator.cardType = options.type
    }
    if(options.hasOwnProperty('subjectLeft')){
        matchAggregator.subjectLeft = options.subjectLeft
    }
    if(options.hasOwnProperty('subjectRight')){
        matchAggregator.subjectRight = options.subjectRight
    }
    if(options.hasOwnProperty('interactionDirection')){
        matchAggregator.interactionDirection = options.interactionDirection
    }
    try{
        const cards = Card.aggregate([
            matchAggregator,
            {$sort: {[sortBy]: dir}},
            {$skip: offset},
            {$limit: limit},
            {$project: {
                "_id": 0
            }}
        ]).exec()
        return cards
    }catch(err){
        throw new Error(`Error loading cards from DB: \n ${err}`)
    }
}

const updateCard = async (uuid, config) => {
    try{
        const result = await Card.findOneAndUpdate({"uuid": uuid},{
            "names": config.names,
            "descriptions": config.descriptions,
            "interactionSubjectLeft": config.interactionSubjectLeft,
            "interactionSubjectRight": config.interactionSubjectRight,
            "interactionDirection": config.interactionDirection,
            "imageUrl": config.imageUrl,
            "knowledbaseUrl": config.knowledbaseUrl,
            "LTEsensors": config.LTEsensors,
            "requiredSensors": config.requiredSensors
        }).exec()
        const card = {
            "_id": result._id,
            "names": result.names,
            "descriptions": result.descriptions,
            "updatedAt": result.updatedAt,
            "createdAt": result.createdAt,
            "interactionSubjectLeft": result.interactionSubjectLeft,
            "interactionSubjectRight": result.interactionSubjectRight,
            "interactionDirection": result.interactionDirection,
            "imageUrl": result.imageUrl,
            "knowledbaseUrl": result.knowledbaseUrl,
            "LTEsensors": result.LTEsensors,
            "requiredSensors": result.requiredSensors
        }
        return card
    }catch(err){
        throw new Error(`Error updating card ${uuid} in DB: \n ${err}`)
    }
}

const getCardCount = async () => {
    try {
        const result = await Card.estimatedDocumentCount().exec()
        return result
    }catch(err){
        throw new Error(`Error while loading card count from DB: \n ${err}`)
    }
}


const cardExists = async (setName) => {
    try{
        const result = await CardSet.exists({"name": setName})
        return result
    }catch(err){
        throw new Error(`Error in models.card.cardExists: \n ${err}`)
    }
}

const deleteCard = async (uuid) => {
    try{
        await Card.deleteOne({"uuid": uuid})
    }catch(err){
        throw new Error(`Error deleting card with uuid ${uuid} from DB: \n ${err}`)
    }
}

module.exports = {createCard, getCardByUuid, getCards, getCardCount, cardExists, updateCard, deleteCard}