const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt')
const db = require('../models')
const User = db.user
const Role = db.role


exports.signUp = (req, res) => {
    let insertRole = req.role || "user"
    Role.findOne({ name: insertRole }, (err, role) => {
        if (err) {
            res.status(500).send({ message: err });
            return;
        }
        const user = new User({
            uuid: uuidv4(),
            username: req.body.username,
            email: req.body.email,
            password: bcrypt.hashSync(req.body.password, 10),
            role: role._id
        });
        user.save(err => {
            if (err) {
                res.status(500).send({ message: err });
                return;
            }
            res.send({ message: "User was registered successfully!" });
        });
    });
};


exports.signIn = (req, res) => {
    User.findOne({
      email: req.body.email
    })
      .populate("role", "-__v")
      .exec((err, user) => {
        if (err) {
          res.status(500).send({ message: err });
          return;
        }
  
        if (!user) {
          return res.status(404).send({ message: "User Not found." });
        }
  
        let passwordIsValid = bcrypt.compareSync(
          req.body.password,
          user.password
        );
  
        if (!passwordIsValid) {
          return res.status(401).send({
            accessToken: null,
            message: "Invalid Password!"
          });
        }
        const userPayload = {
            uuid: user.uuid,
            username: user.username,
            email: user.email,
            role: user.role.name
        }
        console.log("user logged in:", userPayload)
        const accessToken = generateAccessToken(userPayload),
              refreshToken = jwt.sign(userPayload, process.env.REFRESH_TOKEN_SECRET)
        db.refreshTokens.push(refreshToken)
        res.json({
            refreshToken: refreshToken,
            accessToken: accessToken
        });
      });
};

exports.signOut = (req, res) => {
    db.refreshTokens = db.refreshTokens.filter(token => token !== req.body.token)
    res.sendStatus(204)
}

exports.refreshAccessToken = (req, res) => {
    const refreshToken = req.body.token
    if(refreshToken){
        if(!db.refreshTokens.includes(refreshToken)){
            return res.sendStatus(403)
        }
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) =>{
            if(err){
                return res.sendStatus(403)
            }
            const accessToken = generateAccessToken({"id": user.id, "username": user.username, "role": user.role})
            res.json({accessToken: accessToken})
        })
    }else{
        res.sendStatus(401)
    }
}

function generateAccessToken(user) {
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: process.env.ACCESS_TOKEN_LIFETIME})
}