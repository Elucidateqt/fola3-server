const { v4: uuidv4 } = require('uuid');
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
        promisePool.query(`SELECT BIN_TO_UUID(uuid), name, description, date_created FROM projects WHERE 1=1`)
        .then(([rows, fields]) => resolve(rows))
        .catch(err => {
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
        .then(() => connection.execute(`SELECT BIN_TO_UUID(projects.uuid) AS uuid, projects.name, user_projects.role, projects.description, projects.date_created
        FROM projects
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

module.exports.addProject = (userUuid, projectName, projectDescription) => {
    return new Promise((resolve, reject) => {
        let connection,
            userID,
            projectID
        promisePool.getConnection()
        .then(conn => {
            connection = conn
            connection.query('START TRANSACTION')
        })
        .then(() => connection.execute('SELECT ID from users WHERE uuid = UUID_TO_BIN(?)', [userUuid]))
        .then(([rows, fields]) => userID = rows[0].ID)
        .then(() => connection.execute('INSERT INTO projects (name, description, uuid) VALUES (?, ?, UUID_TO_BIN(?))', [projectName, projectDescription, uuidv4()]))
        .then(([row,fields]) => projectID = row.insertId)
        .then(() => connection.execute('INSERT INTO user_projects (user_id, project_id, role) VALUES (?, ?, ?)', [userID, projectID, "Admin"]))
        .then(() => {
            console.log("commiting")
            connection.query('COMMIT')
            resolve()
        })
        .catch(err => {
            connection.rollback()
            reject(err)
        })
        .finally(() => connection.release())
    })
}

module.exports.getUserRoleInProject = (userUuid, projectUuid) => {
    return new Promise((resolve, reject) => {
        let connection
        promisePool.getConnection()
        .then(conn => {
            connection = conn
            connection.query('LOCK TABLES projects read, user_projects read, users read')
        })
        .then(() => connection.execute(`SELECT user_projects.role
        FROM projects
        LEFT JOIN user_projects ON projects.ID = user_projects.project_id
        LEFT JOIN users on users.ID = user_projects.user_id WHERE users.uuid = UUID_TO_BIN(?) AND projects.uuid = UUID_TO_BIN(?)`,
        [userUuid, projectUuid]))
        .then(([rows, fields]) => resolve(rows[0].role))
        .catch(err => {
            console.error("error retrieving user-role in project", err)
            reject(err)
        })
        .finally(() => {
            connection.query('UNLOCK TABLES')
            connection.release()
        })
    })
}

module.exports.addUserToProject = (userUuid, projectUuid) => {
    return new Promise((resolve, reject) => {
        let connection,
            userID,
            projectID
        promisePool.getConnection()
        .then(conn => connection = conn)
        .then(() => connection.execute('SELECT ID FROM users WHERE uuid = UUID_TO_BIN(?)', [userUuid]))
        .then(([rows, fields]) => userID = rows[0].ID)
        .then(() => connection.execute('SELECT ID FROM projects WHERE uuid = UUID_TO_BIN(?)', [projectUuid]))
        .then(([rows, fields]) => projectID = rows[0].ID)
        .then(() => connection.execute('INSERT INTO user_projects (user_id, project_id) VALUES (?, ?)', [userID, projectID]))
        .then(() => resolve())
        .catch(err => {
            console.error("error adding user to project", err)
            reject(err)
        })
        .finally(() => connection.release())
    })
}
