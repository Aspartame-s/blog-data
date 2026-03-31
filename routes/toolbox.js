const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const db = require('../db'); 

const router = express.Router();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const tempPath = path.join(__dirname, '../public/temp');
        if (!fs.existsSync(tempPath)) {
            fs.mkdirSync(tempPath, { recursive: true });
        }
        cb(null, tempPath);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Buffer.from(file.originalname, 'latin1').toString('utf8'));
    }
});

const upload = multer({ storage: storage });

// ---- SSE 客户端存储集线器 (内存队列) ----
const sseClients = new Set();
const broadcastTaskUpdate = (taskData) => {
    for (let client of sseClients) {
        // SSE 必须遵守严格的 data: ... \n\n 格式
        client.write(`data: ${JSON.stringify(taskData)}\n\n`);
    }
};

// 1. SSE 实时状态订阅流接口
router.get('/toolbox/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (res.flushHeaders) res.flushHeaders();
    
    // 初始化推送以保持连接活跃
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
    
    sseClients.add(res);
    req.on('close', () => {
        sseClients.delete(res);
    });
});

// 2. 异步上传分离阻塞接口 (非阻塞式设计)
router.post('/toolbox/pdf-to-word', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ code: 400, message: '请上传 PDF 文件' });
    }

    const inputPdf = req.file.path;
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const outputWordName = `converted-${Date.now()}.docx`;
    const outputWordPath = path.join(__dirname, '../public/temp', outputWordName);

    try {
        // 第一时间写入数据库持久化工单状态
        const [result] = await db.query(
            `INSERT INTO toolbox_tasks (task_name, task_type, status, progress, file_path, result_path) VALUES (?, ?, ?, ?, ?, ?)`,
            [originalName, 'pdf2word', 'processing', 0, inputPdf, outputWordPath]
        );
        const taskId = result.insertId;

        // 【秒速返回前端】立刻释放 HTTP 请求链接，不让前端等
        res.json({ code: 200, message: '任务已提交至后台处理队列', data: { taskId } });

        // 【后台脱钩并行解析】
        const scriptPath = path.join(__dirname, '../scripts/pdf2word.py');
        const pythonProcess = spawn('python3', [scriptPath, inputPdf, outputWordPath]);

        let stderrData = '';
        
        // 进度算法引擎：使用复合式进度（正则解析 stdout + 心跳递增兜底）
        let currentProgress = 0;
        const progressTimer = setInterval(() => {
            if (currentProgress < 95) {
                currentProgress += Math.floor(Math.random() * 3) + 1; // 随机涨1-3%心跳
                db.query(`UPDATE toolbox_tasks SET progress = ? WHERE id = ?`, [currentProgress, taskId]);
                broadcastTaskUpdate({ id: taskId, progress: currentProgress, status: 'processing' });
            }
        }, 4000);

        pythonProcess.stdout.on('data', (data) => {
            const outStr = data.toString();
            // 在标准流中捕捉引擎类似 [5/10] 的底层运算日志
            const match = outStr.match(/\[(\d+)\/(\d+)\]/);
            if (match) {
                const current = parseInt(match[1]);
                const total = parseInt(match[2]);
                const percent = Math.floor((current / total) * 100);
                if (percent > currentProgress && percent <= 99) {
                    currentProgress = percent;
                    db.query(`UPDATE toolbox_tasks SET progress = ? WHERE id = ?`, [currentProgress, taskId]);
                    broadcastTaskUpdate({ id: taskId, progress: currentProgress, status: 'processing' });
                }
            }
        });

        pythonProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        pythonProcess.on('close', async (code) => {
            clearInterval(progressTimer); // 销毁心跳引擎
            if (code === 0 && fs.existsSync(outputWordPath)) {
                // 圆满成功，向全局广播终态
                await db.query(`UPDATE toolbox_tasks SET status = 'done', progress = 100 WHERE id = ?`, [taskId]);
                broadcastTaskUpdate({ id: taskId, progress: 100, status: 'done', resultUrl: `/api/toolbox/download/${taskId}` });
                try { fs.unlinkSync(inputPdf); } catch(e) {}
            } else {
                // 彻底崩溃，记录致命底层日志
                console.error('Python Error:', stderrData);
                await db.query(`UPDATE toolbox_tasks SET status = 'failed', error_msg = ? WHERE id = ?`, [stderrData, taskId]);
                broadcastTaskUpdate({ id: taskId, progress: 0, status: 'failed', errorMsg: '解析失败，可能包含复杂嵌套或加密' });
                try { fs.unlinkSync(inputPdf); } catch(e) {}
            }
        });
    } catch (err) {
        console.error(err);
        // 如果数据库挂了，只能响应 500
        res.status(500).json({ code: 500, message: '服务器工单引擎创建失败' });
    }
});

// 3. 获取大盘所有的历史工单数据
router.get('/toolbox/tasks', async (req, res) => {
    try {
        // LIMIT 100 以防大盘崩溃
        const [rows] = await db.query(`SELECT id, task_name, task_type, status, progress, created_at FROM toolbox_tasks ORDER BY created_at DESC LIMIT 100`);
        res.json({ code: 200, data: rows });
    } catch (err) {
        res.status(500).json({ code: 500, message: '获取大盘工单任务失败' });
    }
});

// 4. 下载中心（独立接口响应大流文件传输）
router.get('/toolbox/download/:id', async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM toolbox_tasks WHERE id = ? AND status = 'done'`, [req.params.id]);
        if (rows.length === 0) return res.status(404).send('工单对应的目标文件未找到或已被清理回收。');
        
        const task = rows[0];
        if (fs.existsSync(task.result_path)) {
            // 通过 res.download 自动附加合适头并吐出附件名
            res.download(task.result_path, task.task_name.replace('.pdf', '.docx'));
        } else {
            res.status(404).send('非常抱歉，物理存储文件已被系统安全回收池清理。');
        }
    } catch (err) {
        res.status(500).send('服务器脱机流传输引流失败');
    }
});

module.exports = router;
