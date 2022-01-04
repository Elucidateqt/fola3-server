const res = require('express/lib/response');
const mongoose = require('mongoose')

const Bugreport = new mongoose.model(
    "Bugreport",
    new mongoose.Schema({
        //can be used to look up interactions that led up to the report in Matomo, Goolgle Analytics, etc.
        "uuid": {
            type: String,
            required: true
        },
        "trackerVisitorId": {
            type: String,
            default: null
        },
        //used for analytics (f.e. finding accounts that spam-report)
        "author": {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        "reportText": {
            type: String,
            required: true
        }
    },
    { timestamps: true })
)

const createBugreport = async (uuid, userId, trackerVisitorId, reportText) => {
    try{
        const report = await new Bugreport({
            "uuid": uuid,
            "author": userId,
            "trackerVisitorId": trackerVisitorId,
            "reportText": reportText
        }).save();
        return {
            "_id" : report._id,
            "uuid" : report.uuid,
            "author" : report.author,
            "trackerVisitorId" : report.trackerVisitorId,
            "reportText": report.reportText
        }
    }catch(err){
        throw new Error(`Error creating bugreport in DB: ${err}`)
    }

}

const getBugreport = async (uuid) => {
    try{
        const report = await Bugreport.findOne({"uuid": uuid}).populate("author", "uuid username -_id").select("-__v").exec()
        return report
    }catch(err){
        throw new Error(`Error in models.bugreport.getBugreport: \n ${err}`)
    }
}

const getAllBugreports = async () => {
    try {
        const reports = await Bugreport.find({}).populate("author", "uuid username -_id").select("-__v").exec()
        return reports
    } catch (err) {
        throw new Error(`Error in models.bugreport.getAllBugreports: \n ${err}`)
    }
}

const deleteBugreport = async (uuid) => {
    try{
        await Bugreport.deleteOne({"uuid": uuid}).exec()
    }catch(err){
        throw new Error(`Error in models.bugreport.deleteBugreport: \n ${err}`)
    }
}

module.exports = { createBugreport, getBugreport, getAllBugreports, deleteBugreport }