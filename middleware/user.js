const db = require('../models')
const User = db.user
const mailPattern = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
const { validationResult } = require('express-validator');

const checkDuplicateUsernameOrEmail = async (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
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

module.exports = { checkDuplicateUsernameOrEmail }