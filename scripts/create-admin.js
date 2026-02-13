// /Users/chengjiahui/blog/blog-data/scripts/create-admin.js

const bcrypt = require('bcryptjs');
const db = require('../db');

// --- 在这里设置你的管理员账号和密码 ---
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = '123456'; // <-- 请务必修改成一个强密码

async function createAdmin() {
    console.log('开始创建管理员账号...');

    try {
        // 1. 检查是否已存在同名用户
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [ADMIN_USERNAME]);
        if (users.length > 0) {
            console.log(`管理员账号 "${ADMIN_USERNAME}" 已存在，无需重复创建。`);
            return;
        }

        // 2. 加密密码
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

        // 3. 插入数据库
        await db.query('INSERT INTO users (username, password) VALUES (?, ?)', [ADMIN_USERNAME, hashedPassword]);

        console.log('✅ 管理员账号创建成功！');
        console.log(`   用户名: ${ADMIN_USERNAME}`);
        console.log(`   密  码: ${ADMIN_PASSWORD}`);

    } catch (error) {
        console.error('❌ 创建管理员账号失败:', error);
    } finally {
        // 4. 关闭数据库连接池，结束脚本
        db.end();
    }
}

createAdmin();