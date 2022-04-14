const mongoose = require('mongoose')

const CardSchema = new mongoose.Schema(
    {
        "uuid": {
            type: String,
            required: true
        },
        "cardset": {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CardSet",
            required: true
        },
        "name": {
            type: String,
            required: true,
            default: "New Card"
        },
        "description": {
            type: String,
            required: true,
            default: "New Card"
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

CardSchema.pre('deleteOne', async function(next) {
    const card = await mongoose.models.Card.findOne(this.getQuery())
    //remove card from all decks
    try {
        await mongoose.models.Deck.updateMany(
            { },
            { "$pull": { "cards": card._id } },
            { "multi": true });
            next()
        } catch (err) {
        throw new Error(err)
    }
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
            "uuid": result.uuid,
            "cardset": result.cardset,
            "cardType": result.cardType,
            "name": result.name,
            "description": result.description,
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
        throw new Error(`Error while creating card ${config.name} in DB: \n ${err}`)
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
    limit = options.limit || 50,
    offset = options.offset || 0
    //build match aggregator dynamically based on provided options
    if(options.hasOwnProperty('cardIds')){
        matchAggregator.$match._id = { $in: options.cardIds}
    }
    if(options.hasOwnProperty('cardsets')){
        matchAggregator.$match.cardset = { $in: options.cardsets}
    }
    if(options.hasOwnProperty('cardUuids')){
        matchAggregator.$match.uuid = { $in: options.cardUuids}
    }
    if(options.hasOwnProperty('type')){
        matchAggregator.$match.cardType = options.type
    }
    if(options.hasOwnProperty('subjectLeft')){
        matchAggregator.$match.subjectLeft = options.subjectLeft
    }
    if(options.hasOwnProperty('subjectRight')){
        matchAggregator.$match.subjectRight = options.subjectRight
    }
    if(options.hasOwnProperty('interactionDirection')){
        matchAggregator.$match.interactionDirection = options.interactionDirection
    }
    try{
        const cards = await Card.aggregate([
            matchAggregator,
            {$lookup: {
                from: 'cardsets',
                localField: 'cardset',
                foreignField: '_id',
                as: 'cardset'
            }},
            {$sort: {[sortBy]: dir}},
            {$skip: offset},
            {$limit: limit}
        ]).exec()
        return cards
    }catch(err){
        throw new Error(`Error loading cards from DB: \n ${err}`)
    }
}

const updateCard = async (uuid, config) => {
    try{
        const result = await Card.findOneAndUpdate({"uuid": uuid},{
            "cardset": config.cardset,
            "name": config.name,
            "cardType": config.cardType,
            "description": config.description,
            "interactionSubjectLeft": config.interactionSubjectLeft,
            "interactionSubjectRight": config.interactionSubjectRight,
            "interactionDirection": config.interactionDirection,
            "imageUrl": config.imageUrl,
            "knowledbaseUrl": config.knowledbaseUrl,
            "LTEsensors": config.LTEsensors,
            "requiredSensors": config.requiredSensors
        },
        {new: true}).exec()
        console.log("cardupdate result", result)
        const card = {
            "_id": result._id,
            "uuid": result.uuid,
            "cardType": result.cardType,
            "cardset": result.cardset,
            "name": result.name,
            "description": result.description,
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


const isCardinSet = async (cardId, setId) => {
    try{
        const card = await Card.findOne({
            _id: cardId
        }).exec()
        if(card){
            return card.cardset === setId
        }
        return false
    }catch(err){
        throw new Error(`Error in models.cardset.isCardInSet: \n ${err}`)
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
        const result = await Card.exists({"name": setName})
        return result
    }catch(err){
        throw new Error(`Error in models.card.cardExists: \n ${err}`)
    }
}

const deleteCard = async (uuid) => {
    try{
        await Card.deleteOne({"uuid": uuid}).exec()
    }catch(err){
        throw new Error(`Error deleting card with uuid ${uuid} from DB: \n ${err}`)
    }
}

module.exports = {createCard, getCardByUuid, getCards, getCardCount, cardExists, updateCard, deleteCard, isCardinSet}