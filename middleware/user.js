const db = require('../models')
const User = db.user
const mailPattern = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

checkSignUpData = (req, res, next) => {
  if(req.body.email && req.body.username && req.body.password && mailPattern.test(req.body.email)){
    next()
    return             
  }else{
    return res.sendStatus(400)
  }
}

checkLogInData = (req, res, next) => {
  if(req.body.email && req.body.password && mailPattern.test(req.body.email)){
    next()
    return
  }else{
      return res.sendStatus(400)
  }
}

checkDuplicateUsernameOrEmail = (req, res, next) => {
    // Username
    User.findOne({
      username: req.body.username
    }).exec((err, user) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }
  
      if (user) {
        res.status(400).send({ message: "Failed! Username is already in use!" });
        return;
      }
  
      // Email
      User.findOne({
        email: req.body.email
      }).exec((err, user) => {
        if (err) {
          res.status(500).send({ message: err });
          return;
        }
  
        if (user) {
          res.status(400).send({ message: "Failed! Email is already in use!" });
          return;
        }
        next();
      });
    });
  };

module.exports = {checkSignUpData, checkDuplicateUsernameOrEmail, checkLogInData}