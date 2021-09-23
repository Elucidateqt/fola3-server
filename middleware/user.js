const db = require('../models')
const User = db.user
const mailPattern = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

const checkSignUpData = (req, res, next) => {
  if(req.body.email && mailPattern.test(req.body.email) && req.body.username && req.body.password){
    next()
    return             
  }else{
    return res.sendStatus(400)
  }
}

const checkLogInData = (req, res, next) => {
  if(req.body.email && req.body.password && mailPattern.test(req.body.email)){
    next()
    return
  }else{
      return res.sendStatus(400)
  }
}

const checkDuplicateUsernameOrEmail = async (req, res, next) => {
    const isDuplicateUsername = await User.usernameExists(req.body.username)
    if(isDuplicateUsername){
      return res.status(500).send({ "message": "duplicateUsername" })
    }
    const isDuplicateMail = await User.emailExists(req.body.email)
    if(isDuplicateMail){
      return res.status(500).send({ "message": "duplicateMail" })
    }
    next()
};

module.exports = {checkSignUpData, checkDuplicateUsernameOrEmail, checkLogInData}