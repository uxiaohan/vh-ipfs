# 🖼️ VH-IPFS

> 简单优雅的 IPFS 文件上传与管理平台

## ✨ 特性

- 🎨 **简约优美** - 现代化 UI 设计，自适应布局
- 🔐 **双重保护** - 网站访问密码 + 管理员密码
- 🚀 **高性能** - 基于 Fastify + Vue3 + IPFS
- 📊 **存储管理** - 可视化存储空间使用情况
- 🌐 **多网关支持** - 自定义 IPFS 公共网关
- 🐳 **单容器部署** - 前端/后端/IPFS 一体化
- 📝 **日志管理** - 自动切割，最大 5MB
- 🔄 **自动清理** - 存储空间不足时自动清理旧文件

## 📊 存储策略

- ✅ **自动清理** - 当存储空间达到上限时，按访问次数+时间清理旧文件
- 📈 **实时监控** - 显示已用空间、剩余容量、可用容量
- 🎯 **灵活配置** - 支持 MB/GB 单位切换
- 💾 **空间限制** - 防止超出磁盘容量

## 🛡️ 安全特性

- 🔒 **JWT 认证** - 管理员操作需要有效 token
- 🌐 **网站访问密码** - 首次访问需要输入密码
- 📝 **日志记录** - 所有操作记录到 `/data/logs/app.log`
- 🔄 **密码修改** - 支持修改网站密码和管理员密码
- 🚫 **401 处理** - 自动清除过期 token 并重新登录

## 🚀 快速开始

### 使用 Docker Compose（推荐）

```yaml
version: '3.8'

services:
  vh-ipfs:
    image: uxiaohan/vh-ipfs
    container_name: vh-ipfs
    restart: unless-stopped
    ports:
      - "16661:16661"  # Web 服务
      - "8080:8080"    # IPFS 网关
    volumes:
      - ./data:/data
      - ./ipfs-data:/data/ipfs
```

### 使用 Docker

```bash
docker run -d \
  --name vh-ipfs \
  -p 16661:16661 \
  -p 8080:8080 \
  -v /etc/data:/data \
  -v /etc/ipfs-data:/data/ipfs \
  --restart unless-stopped \
  uxiaohan/vh-ipfs
```

## 📋 默认配置

| 配置项 | 默认值 | 说明 |
|--------|---------|------|
| **网站访问密码** | `无` | 首次使用需在后台设置 |
| **管理员密码** | `无` | 首次使用需在后台设置 |
| **存储限制** | `1GB` | 可在后台调整 |
| **最大上传** | `50MB` | 单文件大小限制 |

## 🔗 访问地址

| 服务 | 地址 |
|------|------|
| 📤 **上传页面** | `http://<your-ip>:16661/` |
| ⚙️ **管理后台** | `http://<your-ip>:16661/admin` |
| 🌐 **IPFS 网关** | `http://<your-ip>:8080/ipfs/<CID>` |

## 📂 目录结构

```
new-ipfs/
├── api/
│   ├── server.js               # 后端服务
│   ├── db.js                   # 数据库
│   ├── logger.js               # 日志管理
│   ├── services/               # 业务逻辑层
│   │   ├── auth.service.js     # 认证服务
│   │   ├── storage.service.js  # 存储服务
│   │   ├── image.service.js    # 图片服务
│   │   ├── error.service.js    # 错误处理
│   │   └── constants.js        # 常量定义  
│   ├── web/                    # Vue3 前端
│   │   ├── src/
│   │   │   ├── api/             # API 封装
│   │   │   ├── composables/     # 组合式函数
│   │   │   ├── components/      # 组件
│   │   │   └── views/           # 页面
│   │   ├── index.html
│   │   ├── package.json
│   │   └── vite.config.js
│   ├── supervisord.conf        # 进程管理
│   └── Dockerfile              # 镜像构建
├── data/                       # 数据目录（自动创建）
├── ipfs-data/                  # IPFS 数据（自动创建）
└── docker-compose.yml          # Docker Compose 配置
```

## 🔧 环境变量

| 变量 | 默认值 | 说明 |
|------|---------|------|
| `PORT` | `16661` | API 服务端口 |
| `DATA_DIR` | `/data` | 数据存储目录 |
| `IPFS_API_URL` | `http://127.0.0.1:5001` | IPFS API 地址 |
| `JWT_SECRET` | 随机生成 | JWT 密钥 |

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

**Made with ❤️ by uxiaohan**
