const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// 配置 multer 临时保存上传的文件
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

router.post('/toolbox/pdf-to-word', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ code: 400, message: '请上传 PDF 文件' });
    }

    const inputPdf = req.file.path;
    const outputWordName = `converted-${Date.now()}.docx`;
    const outputWordPath = path.join(__dirname, '../public/temp', outputWordName);

    // 调用 Python 脚本
    const scriptPath = path.join(__dirname, '../scripts/pdf2word.py');
    
    // 使用 node自带的 spawn 调用 Python 进程
    const pythonProcess = spawn('python3', [scriptPath, inputPdf, outputWordPath]);

    let stdoutData = '';
    let stderrData = '';

    pythonProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
    });

    pythonProcess.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputWordPath)) {
            // 成功生成，通过流的方式发送给客户端下载
            res.download(outputWordPath, Buffer.from(req.file.originalname, 'latin1').toString('utf8').replace('.pdf', '.docx'), (err) => {
                // 下载完成后静默清理文件 (无论成功失败都执行清理防泄漏)
                try {
                    fs.unlinkSync(inputPdf);
                    fs.unlinkSync(outputWordPath);
                } catch(e) { console.error('清理临时文件失败', e); }
            });
        } else {
            console.error('Python Error:', stderrData);
            try { fs.unlinkSync(inputPdf); } catch(e) {}
            res.status(500).json({ code: 500, message: '解析失败，PDF内可能存在加密或复杂嵌套', error: stderrData });
        }
    });
});

module.exports = router;
