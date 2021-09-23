const EventEmitter = require('events')

const registry = {}
registry.services = {}
const clientEventEmitter = new EventEmitter()
registry.eventChannels = {}


function registerLogger (logger) {
  registry.services.logger = logger
}

function registerCluster (cluster) {
  registry.services.cluster = cluster
}

function registerDatabase (db) {
  registry.services.database = db
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
  registerCluster,
  getService,
  createEventChannel,
  getEventChannel
}