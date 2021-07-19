const mysql = require('mysql2')
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

module.exports.getAllProjects = async () => {
    return new Promise((resolve, reject) => {
        promisePool.query(`SELECT name FROM projects WHERE 1=1`)
        .then(([rows, fields]) => resolve(rows))
        .catch(err => {
            console.log("ERR?", err)
            reject(err)
        })
    })
}


module.exports.getProjectsOfUser = async (userUuid) => {
    return new Promise((resolve, reject) => {
        let connection
        promisePool.getConnection()
        .then(conn => {
            connection = conn
            connection.query('LOCK TABLES projects read, user_projects read, users read')
        })
        .then(() => connection.execute(`SELECT name FROM projects
        LEFT JOIN user_projects ON projects.ID = user_projects.project_id
        LEFT JOIN users on users.ID = user_projects.user_id WHERE users.uuid = UUID_TO_BIN(?)`,
        [userUuid]))
        .then(([rows, fields]) => resolve(rows))
        .catch(err => reject(err))
        .finally(() => {
            connection.query('UNLOCK TABLES')
            connection.release()
        })
    })
}

module.exports.addProject = (userUuid, projectName) => {
    return new Promise((resolve, reject) => {
        let connection,
            userID,
            projectID
        promisePool.getConnection()
        .then(conn => {
            connection = conn
            connection.query('START TRANSACTION')
        })
        .then( () => {
            connection.execute('SELECT ID from users WHERE uuid = UUID_TO_BIN(?)', [userUuid])
            .then(([rows, fields]) => userID = rows[0].ID)
            .then(() => connection.execute('INSERT INTO projects (name) VALUES (?)', [projectName]))
            .then(([row,fields]) => projectID = row.insertId)
            .then(() => connection.execute('INSERT INTO user_projects (user_id, project_id, role) VALUES (?, ?, ?)', [userID, projectID, "Admin"]))
        })
        .then(() => connection.query('COMMIT'))
        .then(resolve())
        .catch(err => {
            connection.rollback()
            reject(err)
        })
        .finally(connection.release())
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
