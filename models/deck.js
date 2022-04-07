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


const createDeck = async (uuid, name, cardIds, ownerId) => {
    try{
        const result = await new Deck({
            "uuid": uuid,
            "name": name,
            "cards": cardIds,
            "owner": ownerId
        }).save()
        const deck = {
            "_id": result._id,
            "uuid": result.uuid,
            "name": result.name,
            "cards": result.cards,
            "owner": result.ownerId,
            "updatedAt": result.updatedAt,
            "createdAt": result.createdAt
        }
        return deck
    }catch(err){
        logger.error(err)
        throw new Error(`Error while creating deck ${name} in DB: \n ${err}`)
    }
}

const getDecks = async (options) => {
    //TODO: test sorting
    let matchAggregator = options.hasOwnProperty('owner') ? {$match: { "owner": options.ownerId}} : {$match: {}}
    if(options.hasOwnProperty('public')){
        matchAggregator.$match['public'] = options.public
    }
    const sortBy = options.hasOwnProperty('sortBy') ? options.sortBy : 'updatedAt'
    const dir = options.sortDir === 'ASC' ? 1 : -1
    try{
        const decks = await Deck.aggregate([
            matchAggregator,
            {$lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'owner'
            }},
            {$lookup: {
                from: 'cards',
                localField: 'cards',
                foreignField: '_id',
                as: 'cards'
            }},
            {$sort: {[sortBy]: dir}}
        ]).exec()
        return decks
    }catch(err){
        logger.error(err)
        throw new Error(`Error loading decks from DB: \n ${err}`)
    }
}

const getDeckByUuid = async (uuid) => {
    try {
        const sets = await Deck.findOne({"uuid": uuid}).populate('owner').populate('cards').exec()
        return sets
    } catch (err) {
        logger.error(err)
        throw new Error(`Error loading all sets from DB: \n ${err}`)
    }
}

const getCardsInDeck = async (uuid) => {
    try{
        const result = await Deck.findOne({"uuid": uuid}).populate("cards").exec()
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


const getDeckCount = async () => {
    try {
        const result = await Deck.estimatedDocumentCount().exec()
        return result
    }catch(err){
        throw new Error(`Error while loading deck-count from DB: \n ${err}`)
    }
}

const updateDeck = async(uuid, deck) => {
    try{
        await Deck.updateOne({uuid: uuid},
            {
                "name": deck.name,
                "owner": deck.ownerId,
                "cards": deck.cards
            }
        ).exec()
    }catch(err){
        throw new Error(`Error adding cards to set: ${err}`)
    }
}

const deckExists = async (name) => {
    try{
        const result = await Deck.exists({"name": name})
        return result
    }catch(err){
        throw new Error(`Error in models.cardset.setExists: \n ${err}`)
    }
}

const deleteDeck = async (id) => {
    try{
        await Deck.deleteOne({"_id": id})
    }catch(err){
        throw new Error(`Error deleting deck with uuid ${uuid} from DB: \n ${err}`)
    }
}

module.exports = {createDeck, getDecks, getDeckByUuid, updateDeck, getCardsInDeck, getDeckCount, deckExists, deleteDeck}