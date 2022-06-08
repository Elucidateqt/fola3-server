# FoLA3's server-application
## Overview
This is a server-application built with express and SocketIO that implements business-logic of FoLA3.


## Project Configuration

Note: This system requires a deployed MongoDB and Redis instance. Required structures for basic functionality are created in MongoDB during start-up

### List of environment variables:
 Name | Description | example 
 ---|---|---
PORT | port on which the server listens on | 3001
MONGO_HOST | URL to the host of your MongoDB instance | mongodb.your-domain.com
MONGO_PORT | Port used by your mongoDB instance | 27017
MONGO_DATABASE | Name of the database used by FoLA3 in your mongoDB | FOLA3
REDIS_HOST | URL to your Redis-instance | redis.your-domain.com
REDIS_PORT | port used by your Redis instance | 6379
ADMIN_ACC_USERNAME | username of the super admin account created during first startup | root
ADMIN_ACC_PW | password of the super admin account created during first startup | mySecretPassword
ADMIN_ACC_EMAIL | Email address of the admin account created during first startup | root@your-domain.com
ACCESS_TOKEN_SECRET | the secret used for signing access-tokens | myTokenSecret1
ACCESS_TOKEN_LIFETIME | the lifetime of created access-tokens (in seconds) | 60
REFRESH_TOKEN_SECRET | the secret used for signing refresh-tokens | myTokenSecret2
REFRESH_TOKEN_LIFETIME | the lifetime of created access-tokens (in seconds) | 86400


## Important commands

### Installs dependencies:
```
npm install
```

### Creates a nodemon server and hot-reloads for development
```
npm run start
```
