const express = require('express')
const db = require('../models')
const Role = db.role

exports.isNewRole = async (name, { req }) => {
    const roleExists = await Role.roleExists(name)
    if(roleExists){
      throw new Error(`Role already exists.`)
    }
    return true
}

exports.roleExists = async (uuid, { req }) => {
    const role = await Role.getRoleByUuid(uuid)
    if(!role){
      throw new Error(`Unkown role.`)
    }
    req.role = role
    return true
}