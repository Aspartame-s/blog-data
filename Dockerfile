# /Users/chengjiahui/blog/blog-data/Dockerfile

# 1. 采用 Debian Bookworm 的精简版镜像，为了更好的兼容 C++ 编译库和大型软件
FROM node:20-bookworm-slim

# 2. 设置工作目录
WORKDIR /usr/src/app

# 3. 安装底层依赖：Python3 和 LibreOffice (这里去掉了不必要的推荐包以减小体积)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    libreoffice \
    fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*
# (注：fonts-noto-cjk 用于处理转换 PDF 时的中文字体缺失问题，防止本地中文字符乱码)

# 4. 创建 Python 虚拟环境并安装解析库 (彻底避免 Python 包污染全局系统)
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip3 install pdf2docx PyMuPDF --no-cache-dir

# 5. 复制 npm 依赖文件并安装
# 利用分层缓存机制优化构建速度
COPY package*.json ./
RUN npm install

# 6. 拷贝全量源代码
COPY . .

# 7. 确保必要的附件存储目录存在
RUN mkdir -p public/uploads
RUN mkdir -p public/temp

# 8. 暴露端口
EXPOSE 3000

# 9. 启动命令
CMD [ "node", "app.js" ]