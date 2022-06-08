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
        }
    },
    { timestamps: true }
)

/**
 * Middleware that deletes cards if their affiliated cardset is deleted
 */
CardSetSchema.pre('deleteOne', async function(next) {
    const set = await mongoose.models.CardSet.findOne(this.getQuery())
    try {
        await mongoose.models.Card.deleteMany(
            { "cardset": set._id},
            { "multi": true });
            next()
        } catch (err) {
        throw new Error(err)
    }
});

const CardSet = mongoose.model(
    "CardSet",
    CardSetSchema
)


const createCardSet = async (uuid, name, iconUrl, isPublic, ownerId) => {
    try{
        const result = await new CardSet({
            "uuid": uuid,
            "name": name,
            "public": isPublic,
            "iconUrl": iconUrl,
            "owner": ownerId
        }).save()
        const set = {
            "_id": result._id,
            "uuid": result.uuid,
            "name": result.name,
            "public": result.public,
            "iconUrl": result.iconUrl,
            "owner": result.ownerId,
            "updatedAt": result.updatedAt,
            "createdAt": result.createdAt
        }
        return set
    }catch(err){
        logger.error(err)
        throw new Error(`Error while creating cardset ${name} in DB: \n ${err}`)
    }
}

const getCardSets = async (options) => {
    //TODO: test sorting
    let matchAggregator = options.hasOwnProperty('public') ? {$match: { "public": options.public}} : {$match: {}}
    if(options.hasOwnProperty('owner')){
        matchAggregator.$match['owner'] = options.owner
    }
    if(options.hasOwnProperty('setIds')){
        matchAggregator.$match._id = { $in: options.setIds}
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

const getPublicCardSetsOfUser = async (userId) => {
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

const getCardSetByUuid = async (uuid) => {
    try{
        const set = await CardSet.findOne({"uuid": uuid}).populate('owner').exec()
        return set
    }catch(err){
        throw new Error(`Error getting cardset by uuid ${uuid} from DB: \n ${err}`)
    }
}

const getCardSetsOfUser = async (userId) => {
    try{
        const set = await CardSet.find({"owner": userId}).exec()
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
        const result = await CardSet.findOneAndUpdate({"uuid": uuid},{
            "name": newSet.name,
            "public": newSet.public,
            "owner": newSet.owner,
            "iconUrl": newSet.iconUrl
        },
        {new: true})
        const set = {
            "_id": result._id,
            "uuid": result.uuid,
            "name": result.name,
            "public": result.public,
            "iconUrl": result.iconUrl,
            "owner": result.ownerId,
            "updatedAt": result.updatedAt,
            "createdAt": result.createdAt
        }
        return set
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

module.exports = {createCardSet, getCardSets, getAllCardSets, getCardSetsOfUser, getWIPCardSets, getCardSetByUuid, getSetCount, updateSet, setExists, deleteSet}