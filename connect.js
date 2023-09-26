var mysql = require("mysql");

var connection = mysql.createConnection({
    host : 'localhost',
    database : 'sakila',
    user : 'root',
    password : 'password'
});

module.exports = connection;