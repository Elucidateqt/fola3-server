const mongoose = require('mongoose')
const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ component: 'cardSetModel' })

const CardSetSchema = new mongoose.Schema(
    {
        "uuid": {
            type: String,
            required: true
        },
        "owner": {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        "name": {
            type: String,
            required: true,
            default: "new cardset"
        },
        "public": {
            type: Boolean,
            required: true,
            default: false
        },
        "iconUrl": {
            type: String
        },
        "cards": [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Card",
            default: []
        }]
    },
    { timestamps: true }
)

const CardSet = mongoose.model(
    "CardSet",
    CardSetSchema
)


const createCardSet = async (uuid, name, iconUrl, cardIds, isPublic, ownerId) => {
    try{
        const result = await new CardSet({
            "uuid": uuid,
            "name": name,
            "public": isPublic,
            "iconUrl": iconUrl,
            "cards": cardIds,
            "owner": ownerId
        }).save()
        const set = {
            "_id": result._id,
            "uuid": result.uuid,
            "name": result.name,
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
            {$lookup: {
                from: 'cards',
                localField: 'cards',
                foreignField: '_id',
                as: 'cards'
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

getPublicCardSetsOfUser = async (userId) => {
    try {
        const sets  = await CardSet.aggregate([
            {$match: {'public': false, 'owner': userId} },
            {$project: {'_id': 0}}
        ]).exec()
        return sets
    } catch (err) {
        logger.error(err)
        throw new Error(`Error loading public sets of user ${userId} from DB: \n ${err}`)
    }
}

const getWIPCardSets = async (publicUserId) => {
    try{
        const sets  = await CardSet.aggregate([
            {$match: {'public': false, 'owner': publicUserId} },
            {$project: {'_id': 0}}
        ]).exec()
        return sets
    }catch(err){
        logger.error(err)
        throw new Error(`Error loading WIP sets from DB: \n ${err}`)
    }
}

const getCardsInSet = async (uuid, options = {sortBy: 'updatedAt', ascending: false, limit: 5, offset: 0}) => {
    const sortDir = options.ascending === true ? -1 : 1
    try{
        const result = await CardSet.aggregate([
            {$match: {"uuid": uuid}},
            {$unwind: "$cards"},
            {$lookup: {
                from: 'cards',
                let: {"arr": "$cards"},
                as: 'cards',
                pipeline: [
                    {$match: {
                        $expr: {
                            $in: ["$_id", "$$cards"]
                        }
                    }},
                    {$sort: {"options.sortBy": sortDir}},
                    {$skip: options.offset},
                    {$limit: options.limit},
                    {$project: {
                        "_id": 0
                    }
                    }
                ]
            }},
            {$project: {
                "_id": 0
            }}
        ])
        if(result.length > 0 && result[0].hasOwnProperty("cards")){
            return result[0].cards
        }
        return []
    }catch(err){
        throw new Error(`Error while getting Cards of ${rolename} from DB: \n ${err}`)
    }
}

const getCardSetByUuid = async (uuid) => {
    try{
        const set = await CardSet.findOne({"uuid": uuid}).populate('owner').populate('cards').exec()
        return {
            "uuid": set.uuid,
            "owner": set.owner.uuid,
            "cards": set.cards,
            "name": set.name,
            "public": set.public
        }
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

module.exports = {createCardSet, getCardSets, getAllCardSets, getCardSetsOfUser, getWIPCardSets, getCardSetByUuid, getCardsInSet, getSetCount, updateSet, setExists, addCardsToSet, removeCardsFromSet, isCardinSet, deleteSet}