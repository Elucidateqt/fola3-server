const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcrypt')
const db = require('../models')
const User = db.user
const Role = db.role

exports.createUser = (username, email, password, userRole, callback) => {
    //use user-role as default-case
    userRole = userRole || 'user'
    Role.findOne({ name: userRole }, (err, role) => {
        if (err) {
            callback(err, null)
        }
        const user = new User({
            uuid: uuidv4(),
            username: username,
            email: email,
            password: bcrypt.hashSync(password, 10),
            role: role._id
        });
        user.save(err => {
            if (err) {
                callback(err, null)
            }
            callback(null, user)
        });
    });
}

exports.signUp = (req, res) => {
    this.createUser(req.body.username, req.body.email, req.body.password, null, (err, user) => {
        if(err){
            return res.status(500).send({ message: err });
        }
        res.send({ message: `User ${user.username} was created successfully!` });
    })
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