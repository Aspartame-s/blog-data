# /Users/chengjiahui/blog/blog-data/Dockerfile

# 1. 选择一个官方的 Node.js 镜像作为基础
# 我们选择 18-alpine 版本，它非常小巧
FROM node:18-alpine

# 2. 在容器内创建一个工作目录
WORKDIR /usr/src/app

# 3. 复制 package.json 和 package-lock.json 到工作目录
# 这样做可以利用 Docker 的缓存机制，只有在依赖变化时才重新安装
COPY package*.json ./

# 4. 安装项目依赖
RUN npm install

# 5. 复制你所有的源代码到工作目录
COPY . .

# 确保图片上传目录存在
RUN mkdir -p public/uploads

# 6. 暴露端口
# 告诉 Docker，我们的应用在容器内部会使用 3000 端口
EXPOSE 3000

# 7. 定义容器启动时要执行的命令
# 当容器启动时，它会自动运行 "node app.js"
CMD [ "node", "app.js" ]