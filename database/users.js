const mysql = require('mysql2')
const { v4: uuidv4 } = require('uuid');
const ConnectionLimit = process.env.DB_CONNECTION_LIMIT || 5
const DbHost = process.env.DB_HOST || "localhost"
const DbPort = process.env.DB_PORT || 3306
const DbSchema = process.env.DB_DATABASE || "myDB"
const DbUser = process.env.DB_USER_NAME || "myName"
const DbPassword = process.env.DB_USER_PW || "123456"
const pool = mysql.createPool({
    "connectionLimit": ConnectionLimit,
    "host": DbHost,
    "port": DbPort,
    "database": DbSchema,
    "user": DbUser,
    "password": DbPassword
})

const promisePool = pool.promise()

promisePool.on('connection', function (connection) {
    console.log("usermanager connection established")
});


module.exports.getAllUsers = async () => {
    return new Promise((resolve, reject) => {
        promisePool.query(`SELECT username, email, date_created, BIN_TO_UUID(uuid) as uuid FROM users WHERE 1=1`)
        .then(result => {
            resolve(result[0])
        })
        .catch(err => reject(err))
    })
}

module.exports.insertUser =  (username, passHash, email) => {
    return new Promise((resolve, reject) => {
        const uuid = uuidv4()
        promisePool.execute(
            'INSERT INTO  users (username, password, email, uuid) VALUES (?, ?, ?, UUID_TO_BIN(?))',
            [username, passHash, email, uuid])
            .then(rows => resolve(rows[0].insertId))
            .catch(err => reject(err))
    })
}

module.exports.getUser = (email) => {
    return new Promise((resolve, reject) => {
        promisePool.execute(
            'SELECT username, email, password, role, BIN_TO_UUID(uuid) as uuid FROM users WHERE email = ?',
            [email])
            .then(results => resolve(results[0][0]))
            .catch(err => reject(err))
    })
}
