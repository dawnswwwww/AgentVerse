# 部署文档

## GitHub Actions CI/CD 工作流程说明

本项目使用 GitHub Actions 实现了自动化的持续集成和持续部署（CI/CD）流程。每当代码推送到 `main` 分支或手动触发工作流时，系统会自动执行以下步骤：

1. 检出代码：从仓库获取最新代码
2. 设置 Node.js 环境：配置 Node.js 22.x 运行环境
3. 安装 pnpm：设置包管理器
4. 缓存依赖：优化构建速度
5. 安装项目依赖：执行 `pnpm install`
6. 构建项目：执行 `pnpm build`，生成静态文件
7. 安装 sshpass：用于自动化 SSH 连接
8. 部署到服务器：将构建产物通过 rsync 部署到目标服务器

整个流程实现了从代码提交到生产环境部署的自动化，无需手动干预。

## 如何设置 GitHub 仓库密钥

为了保证部署的安全性，需要在 GitHub 仓库中设置以下密钥：

1. 登录 GitHub 并导航到你的仓库
2. 点击 "Settings" > "Secrets and variables" > "Actions"
3. 点击 "New repository secret" 按钮
4. 添加以下密钥：
   - `SERVER_USERNAME`：服务器登录用户名
   - `SERVER_HOST`：服务器 IP 地址或域名
   - `SERVER_PASSWORD`：服务器登录密码
   - `VITE_DASHSCOPE_API_KEY`：阿里云 DashScope API 密钥

设置步骤示例：
1. 名称输入：`SERVER_USERNAME`
2. 值输入：`your-username`（替换为实际用户名）
3. 点击 "Add secret"

对其他密钥重复上述步骤，确保所有必要的密钥都已添加。

## 如何手动触发部署

除了自动触发外，还可以手动触发部署流程：

1. 导航到你的 GitHub 仓库
2. 点击 "Actions" 标签页
3. 在左侧工作流列表中选择 "Build and Deploy"
4. 点击 "Run workflow" 按钮
5. 选择要部署的分支（默认为 `main`）
6. 点击 "Run workflow" 确认启动部署

手动触发对于特殊情况下需要重新部署而不修改代码的场景特别有用。

## 部署目标和流程概述

### 部署目标
- 目标服务器：由 `SERVER_HOST` 指定
- 目标路径：`/usr/share/nginx/html/au/`
- Web 服务器：Nginx（已在服务器预配置）

### 部署流程
1. 本地开发完成并提交代码到 `main` 分支
2. GitHub Actions 自动触发构建流程
3. 项目依赖安装和构建
4. 构建产物通过 SSH 传输到服务器指定目录
5. Nginx 配置自动识别新部署的文件并提供服务

无需登录服务器执行额外命令，整个部署过程实现了完全自动化。

## 安全注意事项

**重要提醒**：

1. **切勿使用本文档中的示例密码**，请务必将所有密钥替换为你自己的安全密钥。

2. 定期轮换密钥是良好的安全实践，建议：
   - 定期更新服务器密码
   - 轮换 API 密钥
   - 检查访问权限

3. 考虑使用 SSH 密钥而非密码进行服务器认证，这比使用 `sshpass` 更安全。

4. 生产环境建议使用专用的部署账户，而非 root 用户，并只授予必要的文件系统权限。

通过遵循以上安全建议，可以确保部署过程既高效又安全。