// /Users/chengjiahui/blog/blog-data/app.js

const express = require('express');
const cors = require('cors'); // <--- 1. 引入 cors
const db = require('./db');
const userRoutes = require('./routes/user');
const postRoutes = require('./routes/post'); // <--- 2. 引入文章路由
const uploadRoutes = require('./routes/upload'); // <--- 3. 引入上传路由

const app = express();
const port = 3000;

// --- 中间件 ---
app.use(cors()); // <--- 3. 全局启用 CORS
app.use('/uploads', express.static('public/uploads'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// --- 路由 ---
app.use('/api', userRoutes);
app.use('/api', postRoutes); // <--- 4. 注册文章路由
app.use('/api', uploadRoutes);

// 注册全新重构的 PDF 转换工具箱路由
const toolboxRoutes = require('./routes/toolbox');
app.use('/api', toolboxRoutes);

// 测试路由保持原样...
app.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT NOW() as time');
        res.send(`数据库连接成功！当前数据库时间是：${rows[0].time}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('数据库连接失败。');
    }
});

// 在服务启动前，执行一次自举式建表扫描（应对云服务器无此表报错的惨剧）
const initDatabase = async () => {
    try {
        const createTableSql = `
            CREATE TABLE IF NOT EXISTS toolbox_tasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                task_name VARCHAR(255) NOT NULL,
                task_type VARCHAR(50) NOT NULL,
                status VARCHAR(20) DEFAULT 'processing',
                progress INT DEFAULT 0,
                file_path VARCHAR(255),
                result_path VARCHAR(255),
                error_msg TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await db.query(createTableSql);
        console.log('✅ 底层异步工单引擎数据表 (toolbox_tasks) 扫描并重构就绪!');
    } catch (err) {
        console.error('❌ 底层异步工单引擎建表崩解:', err);
    }
};

initDatabase().then(() => {
    app.listen(port, '0.0.0.0', () => {
        console.log(`后端服务已启动，无头架构及全息总线就绪，访问地址：http://localhost:${port}`);
    });
});