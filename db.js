// /Users/chengjiahui/blog/blog-data/db.js

const mysql = require('mysql2');
require('dotenv').config(); // 读取环境变量

// 1. 创建连接池
const pool = mysql.createPool({
    // 优先从环境变量读取，如果没有则使用默认值
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'my_blog',
    port: process.env.DB_PORT || 3307,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 2. 导出 promise 版本的 query 函数
module.exports = pool.promise();