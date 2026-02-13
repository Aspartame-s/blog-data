// /Users/chengjiahui/blog/blog-data/middleware/auth.js

const jwt = require('jsonwebtoken');
const { fail } = require('../utils/responseHelper'); // 引入 fail 函数
const JWT_SECRET = 'jq_ssb_233!';

function auth(req, res, next) {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
        return fail(res, 401, '访问被拒绝，需要提供 Token');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return fail(res, 401, 'Token 格式不正确');
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (ex) {
        return fail(res, 400, '无效的 Token');
    }
}

module.exports = auth;