const EventEmitter = require('events')

const registry = {}
registry.services = {}
const clientEventEmitter = new EventEmitter()
registry.eventChannels = {}


const registerLogger = async (logger) => {
  if(registry.services.logger){
    throw new Error(`Logger already registered!`)
  }
  registry.services.logger = logger
  return registry.services.logger
}

function registerCluster (cluster) {
  registry.services.cluster = cluster
}

function registerRedis (client) {
  if(registry.services.redis){
    throw new Error(`Redis already registered!`)
  }
  registry.services.redis = client
  return registry.services.redis
}

function getService (name) {
  if (registry.services[name]) {
    return registry.services[name]
  }
  throw new Error(`No Service with name "${name}"" registered`)
}

const createEventChannel = (name) => {
  if(registry.eventChannels[name]){
    throw new Error(`Eventchannel ${name} already exists!`)
  }
  registry.eventChannels[name] = new EventEmitter()
  return registry.eventChannels[name]
}

const getEventChannel = (name) => {
  if(registry.eventChannels[name]){
    return registry.eventChannels[name]
  }
  throw new Error(`Eventchannel ${name} does not exist!`)
}

module.exports = {
  registerLogger,
  registerRedis,
  registerCluster,
  getService,
  createEventChannel,
  getEventChannel
}