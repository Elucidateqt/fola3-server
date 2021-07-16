const mysql = require('mysql')
const { v4: uuidv4 } = require('uuid');
const ConnectionLimit = process.env.DB_CONNECTION_LIMIT || 5
const DbHost = process.env.DB_HOST || "localhost"
const DbPort = process.env.DB_PORT || 3306
const DbSchema = process.env.DB_DATABASE || "myDB"
const DbUser = process.env.DB_USERTABLE_USER_NAME || "myName"
const DbPassword = process.env.DB_USERTABLE_USER_PW || "123456"
const connect = mysql.createPool({
    "connectionLimit": ConnectionLimit,
    "host": DbHost,
    "port": DbPort,
    "database": DbSchema,
    "user": DbUser,
    "password": DbPassword
})

connect.on('connection', function (connection) {
    console.log("usermanager connection established")
});


module.exports.getAllUsers = async () => {
    return new Promise((resolve, reject) => {
        connect.query(`SELECT username FROM users WHERE 1=1`, (err, result) => {
            if(err) {
                return reject(err)
            }
            return resolve(result)
        })
    })
}

module.exports.insertUser = (username, passHash, email) => {
    return new Promise((resolve, reject) => {
        const uuid = uuidv4()
        connect.query(`INSERT INTO  users (username, password, email, uuid) VALUES ("${username}","${passHash}","${email}",UUID_TO_BIN("${uuid}"))`, (err, result) => {
            if(err){
                return reject(err)
            }
            return resolve(result.insertId)
        })
    })
}

module.exports.getUser = (email) => {
    return new Promise((resolve, reject) => {
        connect.query(`SELECT username, email, password, role, BIN_TO_UUID(uuid) as uuid FROM users WHERE email = "${email}"`, (err, result) => {
            if(err){
                return reject(err)
            }
            return resolve(result[0])
        })
    })
}
