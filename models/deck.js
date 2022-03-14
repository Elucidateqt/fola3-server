const mongoose = require('mongoose')
const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ component: 'deckModel' })

const DeckSchema = new mongoose.Schema(
    {
        "uuid": {
            type: String,
            required: true,
            unique: true,
        },
        "owner": {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        "name": {
            type: String,
            required: true
        },
        "public": {
            type: Boolean,
            required: true,
            default: false
        },
        "cards": [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Card",
            default: []
        }]
    },
    { timestamps: true }
)

const Deck = mongoose.model(
    "Deck",
    DeckSchema
)


const createDeck = async (uuid, name, iconUrl, cardIds, isPublic, ownerId) => {
    console.log(`creating cardset for ${ownerId} \n\n\n\n\n`)
    try{
        const result = await new CardSet({
            "uuid": uuid,
            "names": names,
            "public": isPublic,
            "iconUrl": iconUrl,
            "cards": cardIds,
            "owner": ownerId
        }).save()
        const set = {
            "_id": result._id,
            "uuid": result.uuid,
            "names": result.names,
            "public": result.public,
            "cardCount": result.cards.length,
            "iconUrl": result.iconUrl,
            "owner": result.ownerId,
            "updatedAt": result.updatedAt,
            "createdAt": result.createdAt
        }
        return set
    }catch(err){
        logger.error(err)
        throw new Error(`Error while creating cardset ${names.enUS} in DB: \n ${err}`)
    }
}

const getCardSets = async (options) => {
    //TODO: test sorting
    let matchAggregator = options.hasOwnProperty('public') ? {$match: { "public": options.public}} : {$match: {}}
    if(options.hasOwnProperty('owner')){
        matchAggregator.$match['owner'] = options.owner
    }
    const sortBy = options.hasOwnProperty('sortBy') ? options.sortBy : 'updatedAt'
    const dir = options.sortDir === 'ASC' ? 1 : -1
    try{
        const sets = await CardSet.aggregate([
            matchAggregator,
            {$lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'owner'
            }},
            {$sort: {[sortBy]: dir}}
        ]).exec()
        return sets
    }catch(err){
        logger.error(err)
        throw new Error(`Error loading sets from DB: \n ${err}`)
    }
}

const getAllCardSets = async () => {
    try {
        const sets = await CardSet.find({}).exec()
        return sets
        
    } catch (err) {
        logger.error(err)
        throw new Error(`Error loading all sets from DB: \n ${err}`)
    }
}

const getPublicCardSets = async () => {
    try{
        const sets  = await CardSet.aggregate([
            {$match: {'public': true, 'owner': null} },
            {$project: {'_id': 0}}
        ]).exec()
        return sets
    }catch(err){
        logger.error(err)
        throw new Error(`Error loading all sets from DB: \n ${err}`)
    }
}

const getWIPCardSets = async () => {
    try{
        const sets  = await CardSet.aggregate([
            {$match: {'public': false, 'owner': null} },
            {$project: {'_id': 0}}
        ]).exec()
        return sets
    }catch(err){
        logger.error(err)
        throw new Error(`Error loading all sets from DB: \n ${err}`)
    }
}

const getCardsInDeck = async (uuid) => {
    try{
        const result = await Deck.findOne({"uuid": uuid}).populate("cards").exec()
        console.log("set loaded", result)
        const dummyResult =
            [{
                uuid: "e6c69ea8-ffe1-49ed-8e1a-c6cbaf7cfea0",
                name: "Greeting",
                description: "The teacher greets the students in Zoom",
                cardType: "interaction",
                interactionSubjectLeft: "teacher",
                interactionSubjectRight: "student",
                interactionDirection: "both",
                imageUrl: "https://loremflickr.com/320/240",
                knowledbaseUrl: "https://knowhow.studiumdigitale.uni-frankfurt.de/",
                LTEsensors: [],
                requiredSensors: [],
                createdAt: "2022-03-10T14:14:19.733Z",
                updatedAt: "2022-03-10T14:14:19.733Z",
                },
                {
                uuid: "e6c69ea8-ffe1-49ed-8e1a-c6cbaf7cfea0",
                name: "Moodle",
                description: "The moodle instance of studiumdigitale",
                cardType: "LET",
                interactionSubjectLeft: "teacher",
                interactionSubjectRight: "student",
                interactionDirection: "both",
                imageUrl: "https://loremflickr.com/320/240",
                knowledbaseUrl: "https://knowhow.studiumdigitale.uni-frankfurt.de/",
                LTEsensors: [],
                requiredSensors: [],
                createdAt: "2022-03-10T14:14:19.733Z",
                updatedAt: "2022-03-10T14:14:19.733Z",
                },
                {
                uuid: "e6c69ea8-ffe1-49ed-8e1a-c6cbaf7cfea0",
                name: "Initiative",
                description: "Students regularly participate in discussions",
                cardType: "what",
                interactionSubjectLeft: "teacher",
                interactionSubjectRight: "student",
                interactionDirection: "both",
                imageUrl: "https://loremflickr.com/320/240",
                knowledbaseUrl: "https://knowhow.studiumdigitale.uni-frankfurt.de/",
                LTEsensors: [],
                requiredSensors: [],
                createdAt: "2022-03-10T14:14:19.733Z",
                updatedAt: "2022-03-10T14:14:19.733Z",
                }
              ]
        return dummyResult
    }catch(err){
        throw new Error(`Error while getting Cards of Deck ${uuid} from DB: \n ${err}`)
    }
}

const getCardSetByUuid = async (uuid) => {
    try{
        const set = await CardSet.findOne({"uuid": uuid}).populate('cards').populate('owner').exec()
        return {
            "uuid": set.uuid,
            "owner": set.owner.uuid,
            "cards": set.cards,
            "names": set.names,
            "public": set.public
        }
        return set
    }catch(err){
        throw new Error(`Error getting cardset by uuid ${uuid} from DB: \n ${err}`)
    }
}

const getCardSetsOfUser = async (userId) => {
    try{
        const set = await CardSet.find({"owner": userId}).populate('cards').exec()
        return set
    }catch(err){
        logger.error(err)
        throw new Error(`Error getting cardsets of user ${uuid} from DB: \n ${err}`)
    }
}

const getSetCount = async () => {
    try {
        const result = await CardSet.estimatedDocumentCount().exec()
        return result
    }catch(err){
        throw new Error(`Error while loading cardset-count from DB: \n ${err}`)
    }
}

const addCardsToSet = async(uuid, cardIds) => {
    try{
        await CardSet.updateOne({uuid: uuid},
            {$push: {"cards": {$each: cardIds}}}
        ).exec()
    }catch(err){
        throw new Error(`Error adding cards to set: ${err}`)
    }
}

const removeCardsFromSet = async (uuid, cardIds) => {
    try{
        await CardSet.updateOne({
            uuid: uuid
        },
        {$pull: {"cards": {$in: cardIds}}})
        .exec()
    }catch(err){
        throw new Error(`Error removing cards from set: ${err}`)
    }
}

const isCardinSet = async (uuid, cardId) => {
    try{
        const set = await CardSet.findOne({
            uuid: uuid
        }).exec()
        return set.cards.some(card => card._id === cardId)
    }catch(err){
        throw new Error(`Error in models.cardset.isCardInSet: \n ${err}`)
    }
}

const setExists = async (setName) => {
    try{
        const result = await CardSet.exists({"name": setName})
        return result
    }catch(err){
        throw new Error(`Error in models.cardset.setExists: \n ${err}`)
    }
}

const updateSet = async (uuid, newSet) => {
    try{
        await CardSet.updateOne({"uuid": uuid},{
            "uuid": newSet.uuid,
            "name": newSet.names,
            "public": newSet.isPublic,
            "owner": newSet.owner,
            "iconUrl": newSet.iconUrl,
            "cards": newSet.cardIds
        })
    }catch(err){
        throw new Error(`Error updating cardset with uuid ${uuid} in DB: \n ${err}`)
    }
}

const deleteSet = async (uuid) => {
    try{
        await CardSet.deleteOne({"uuid": uuid})
    }catch(err){
        throw new Error(`Error deleting cardset with uuid ${uuid} from DB: \n ${err}`)
    }
}

module.exports = {createDeck, getCardSets, getAllCardSets, getCardSetsOfUser, getWIPCardSets, getCardSetByUuid, getCardsInDeck, getPublicCardSets, getSetCount, updateSet, setExists, addCardsToSet, removeCardsFromSet, isCardinSet, deleteSet}