# CI/CD 配置说明

> 玑之智能 · 组织分工汇报页 · GitHub Actions 自动部署

---

## 快速开始

### 1. 推送仓库到 GitHub

**方式一：一键脚本（推荐）**

```bash
cd "/Users/jerryzhao/Library/Mobile Documents/com~apple~CloudDocs/workbuddy-files/公司经营管理/组织分工调整/"
bash CICD/push-to-github.sh
```

脚本自动完成：检查 gh CLI → 创建仓库 → 推送代码 → 配置 Secrets。

**方式二：手动操作**

```bash
cd "/Users/jerryzhao/Library/Mobile Documents/com~apple~CloudDocs/workbuddy-files/公司经营管理/组织分工调整/"
git remote add origin https://github.com/Jerryzhao0313/org-division-report.git
git push -u origin master
```

### 2. 配置 GitHub Secrets

前往仓库 **Settings → Secrets and variables → Actions → New repository secret**，添加以下两个 Secret：

| Name | Value | 获取方式 |
|------|-------|---------|
| `TCB_SECRET_ID` | CloudBase SecretId | `cloudbase-cdn-upload/config.json` 中的 `secretId` |
| `TCB_SECRET_KEY` | CloudBase SecretKey | `cloudbase-cdn-upload/config.json` 中的 `secretKey` |

### 3. 触发部署

```bash
# 修改任意 HTML 文件后提交推送
git add .
git commit -m "更新汇报页"
git push origin master
```

推送后 GitHub Actions 自动运行：
- ✅ 校验 HTML 语法
- ✅ 检查文件完整性
- ✅ 部署到 CloudBase CDN

### 4. 查看结果

- **Actions 面板**：`https://github.com/<your-repo>/actions`
- **CDN 地址**：`https://ji-projects-d1g4i777v9f9d798e.tcb.qcloud.la/home/产品线分工汇报.html`

---

## 文件结构

```
组织分工调整/
├── .github/
│   └── workflows/
│       └── deploy.yml                  ← GitHub Actions 工作流
├── scripts/
│   └── deploy-to-cloudbase.js          ← CloudBase 部署脚本
└── CICD/
    ├── README.md                       ← 本文件
    ├── 架构分析.md                     ← 项目架构文档
    └── push-to-github.sh               ← 一键推送脚本
```

## 工作流说明

### 触发条件

| 事件 | 分支 | 行为 |
|------|------|------|
| `push` 含 HTML 变更 | `master` | 校验 → 部署 |
| `pull_request` | → `master` | 仅校验（不部署） |

### 校验项目

- 🔍 **HTML 语法**：`html5validator` 基于 W3C 标准校验
- 📋 **文件清单**：列出所有 HTML 及文件大小
- 🔗 **本地引用检查**：确保无 `file://` 残留
- 🌐 **CDN 链接可达性**（PR 时）：探测 `tcb.qcloud.la` 链接

### 故障排查

| 问题 | 检查 |
|------|------|
| 部署 403 | Secrets 是否正确配置？ |
| 校验失败 | HTML 是否有未闭合标签或无效属性？ |
| 上传失败 | SDK 版本是否正确？Node 版本 ≥ 22？ |

---

## 将来扩展

如需增加构建步骤（HTML 压缩、CSS 优化等）：

```yaml
# 在 deploy.yml 的 validate 和 deploy 之间插入
build:
  name: Build
  needs: validate
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: HTML Minify
      run: # 构建命令
```
