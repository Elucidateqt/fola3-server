const express = require('express')
const jwt = require('jsonwebtoken')
const db = require('../models')
const User = db.user
const Role = db.role

exports.authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if(token == null) return res.sendStatus(401)

    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if(err){
            return res.sendStatus(403)
        }
        User.findOne({
          uuid: user.uuid
        })
        .populate('role', 'name')
        .exec((err, user) => {
          if(err){
            res.status(500).send({message: err})
          }
          req.user = user
          return next()
        })
    })
}

exports.isSuperAdmin = (req, res, next) => {
    User.findOne({
      uuid: req.user.uuid})
      .exec((err, user) => {
        if (err) {
          res.status(500).send({ message: err });
          return;
        }
    
        Role.find(
          {
            _id: { $eq: user.role }
          },
          (err, role) => {
            if (err) {
              res.status(500).send({ message: err });
              return;
            }
    
            if(role.name === 'super admin'){
                next()
                return
            }
    
            res.status(403).send({ message: "Require Super Admin Role!" });
            return
          }
        );
    });
}

exports.isAdmin = (req, res, next) => {
  User.findOne({
    uuid: req.user.uuid})
    .exec((err, user) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }
  
      Role.find(
        {
          _id: { $eq: user.role }
        },
        (err, role) => {
          if (err) {
            res.status(500).send({ message: err });
            return;
          }
  
          if(role.name === 'admin'){
              next()
              return
          }
  
          res.status(403).send({ message: "Require Admin Role!" });
          return
        }
      );
    });
}

exports.isModerator = (req, res, next) => {
  User.findOne({
    uuid: req.user.uuid})
    .exec((err, user) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }
  
      Role.find(
        {
          _id: { $eq: user.role }
        },
        (err, role) => {
          if (err) {
            res.status(500).send({ message: err });
            return;
          }
  
          if(role.name === 'moderator'){
              next()
              return
          }
  
          res.status(403).send({ message: "Require Moderator Role!" });
          return
        }
      );
    });
}

exports.isAtleastModerator = (req, res, next) => {
  User.findOne({
    uuid: req.user.uuid})
    .exec((err, user) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }
  
      Role.findOne(
        {
          _id: { $eq: user.role }
        },
        (err, role) => {
          if (err) {
            res.status(500).send({ message: err });
            return;
          }
          if(role.name === 'moderator' || role.name === 'admin' || role.name === 'super admin'){
            next()
            return
          }
          res.status(403).send({ message: "Required atleast Moderator Permissions!" });
          return
        }
      );
    });
}