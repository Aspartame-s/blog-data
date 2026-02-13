// /Users/chengjiahui/blog/blog-data/routes/post.js

const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { success, fail } = require('../utils/responseHelper'); // 1. 引入帮助函数

const router = express.Router();

// --- 1. 获取文章列表 (公开) ---
router.get('/posts', async (req, res) => {
    try {
        // 我们暂时没有分页，所以先查所有文章
        const [posts] = await db.query(
            `SELECT p.id, p.title, p.content, p.created_at, u.username 
             FROM posts p 
             JOIN users u ON p.user_id = u.id 
             ORDER BY p.created_at DESC`
        );
        // 2. 返回列表数据，并带上 total 字段
        return success(res, posts, '获取列表成功', posts.length);
    } catch (error) {
        return fail(res, 500, '获取文章列表失败', error);
    }
});

// --- 2. 获取单篇文章详情 (公开) ---
router.get('/posts/:id', async (req, res) => {
    try {
        const [posts] = await db.query(
            `SELECT p.id, p.title, p.content, p.created_at, u.username 
             FROM posts p 
             JOIN users u ON p.user_id = u.id 
             WHERE p.id = ?`,
            [req.params.id]
        );
        if (posts.length === 0) {
            return fail(res, 404, '文章未找到');
        }
        // 3. 返回单个对象
        return success(res, posts[0], '获取详情成功');
    } catch (error) {
        return fail(res, 500, '获取文章详情失败', error);
    }
});

// --- 3. 创建新文章 (需要登录) ---
router.post('/posts', auth, async (req, res) => {
    const { title, content } = req.body;
    const userId = req.user.id;

    if (!title || !content) {
        return fail(res, 400, '标题和内容不能为空');
    }

    try {
        const [result] = await db.query(
            'INSERT INTO posts (title, content, user_id) VALUES (?, ?, ?)',
            [title, content, userId]
        );
        const newPost = {
            id: result.insertId,
            title,
            content,
            user_id: userId
        };
        return success(res, newPost, '创建成功');
    } catch (error) {
        return fail(res, 500, '创建文章失败', error);
    }
});

// --- 4. 更新文章 (需要登录) ---
router.put('/posts/:id', auth, async (req, res) => {
    const { title, content } = req.body;
    const postId = req.params.id;
    const userId = req.user.id;

    if (!title || !content) {
        return fail(res, 400, '标题和内容不能为空');
    }

    try {
        const [posts] = await db.query('SELECT user_id FROM posts WHERE id = ?', [postId]);
        if (posts.length === 0) {
            return fail(res, 404, '文章未找到');
        }
        if (posts[0].user_id !== userId) {
            return fail(res, 403, '无权修改他人的文章');
        }

        await db.query(
            'UPDATE posts SET title = ?, content = ? WHERE id = ?',
            [title, content, postId]
        );
        return success(res, null, '文章更新成功');
    } catch (error) {
        return fail(res, 500, '更新文章失败', error);
    }
});

// --- 5. 删除文章 (需要登录) ---
router.delete('/posts/:id', auth, async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;

    try {
        const [posts] = await db.query('SELECT user_id FROM posts WHERE id = ?', [postId]);
        if (posts.length === 0) {
            return fail(res, 404, '文章未找到');
        }
        if (posts[0].user_id !== userId) {
            return fail(res, 403, '无权删除他人的文章');
        }

        await db.query('DELETE FROM posts WHERE id = ?', [postId]);
        return success(res, null, '文章删除成功');
    } catch (error) {
        return fail(res, 500, '删除文章失败', error);
    }
});

module.exports = router;