const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const { success, fail } = require('../utils/responseHelper');

// 配置存储
const storage = multer.diskStorage({
    destination: 'public/uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// 上传接口 (需要登录)
router.post('/upload', auth, upload.single('image'), (req, res) => {
    if (!req.file) return fail(res, 400, '请选择图片');
    // 返回图片的可访问 URL
    // 使用 req.get('host') 动态获取当前访问的主机地址（如 101.133.132.31:3000）
    const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    success(res, { url }, '上传成功');
});

module.exports = router;