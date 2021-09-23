const uuidLib = require('uuid')

const isValidUuid = (uuid) => {
    return uuidLib.validate(uuid)
}

module.exports = { isValidUuid }