# /Users/chengjiahui/blog/blog-data/Dockerfile

# 1. 采用 Debian Bookworm 的精简版镜像，为了更好的兼容 C++ 编译库和大型软件
FROM node:20-bookworm-slim

# 2. 设置工作目录
WORKDIR /usr/src/app

# 3. 换源并安装底层依赖
# 为了防止云服务器下载这些巨型依赖时由于网络极慢导致 30 分钟超时，我们强制将系统源切到阿里云
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || true && \
    sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list 2>/dev/null || true && \
    apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    libreoffice \
    fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*
# (注：fonts-noto-cjk 用于处理转换 PDF 时的中文字体缺失问题，防止本地中文字符乱码)

# 4. 创建 Python 虚拟环境并使用国内镜像安装解析库
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip3 config set global.index-url https://mirrors.aliyun.com/pypi/simple/ && \
    pip3 install pdf2docx PyMuPDF python-pptx --no-cache-dir

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