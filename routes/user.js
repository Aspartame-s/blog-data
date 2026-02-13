// /Users/chengjiahui/blog/blog-data/routes/user.js

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { success, fail } = require('../utils/responseHelper'); // 1. 引入帮助函数

const router = express.Router();
const JWT_SECRET = 'jq_ssb_233!';

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return fail(res, 400, '用户名和密码不能为空');
    }

    try {
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        const user = users[0];

        if (!user) {
            return fail(res, 401, '用户名或密码错误');
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return fail(res, 401, '用户名或密码错误');
        }

        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // 2. 使用新的成功响应格式
        return success(res, { token }, '登录成功');

    } catch (error) {
        // 3. 使用新的失败响应格式
        return fail(res, 500, '服务器内部错误', error);
    }
});

module.exports = router;