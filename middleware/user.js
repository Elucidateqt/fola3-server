const db = require('../models')
const User = db.user
const mailPattern = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

const checkDuplicateUsername = async (value) => {
    const isDuplicateUsername = await User.usernameExists(value)
    if(isDuplicateUsername){
      throw new Error('Username already exists.')
    }
    return true
};

const checkDuplicateEmail = async (value) => {
    const isDuplicateMail = await User.emailExists(value)
    if(isDuplicateMail){
      throw new Error('Email already exists.')
    }
    return true
};

module.exports = { checkDuplicateUsername, checkDuplicateEmail }