#!/bin/bash
# ============================================================
# 玑之智能 · 一键推送脚本
# 在本地终端执行：bash CICD/push-to-github.sh
# ============================================================

set -e

REPO_DIR="/Users/jerryzhao/Library/Mobile Documents/com~apple~CloudDocs/workbuddy-files/公司经营管理/组织分工调整"
REPO_NAME="org-division-report"
GITHUB_USER="Jerryzhao0313"
REMOTE_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

echo "═══════════════════════════════════════════"
echo "  玑之智能 · 推送到 GitHub"
echo "═══════════════════════════════════════════"

cd "$REPO_DIR"

# 1. 检查 gh CLI
if ! command -v gh &>/dev/null; then
  echo ""
  echo "❌ 未检测到 GitHub CLI (gh)"
  echo ""
  echo "请先安装："
  echo "  brew install gh"
  echo "  或下载: https://cli.github.com/"
  echo ""
  exit 1
fi

# 2. 检查认证
if ! gh auth status &>/dev/null; then
  echo ""
  echo "🔐 未登录 GitHub，正在启动认证..."
  gh auth login
fi

# 3. 创建仓库（如已存在则跳过）
echo ""
echo "📦 创建远程仓库 ${GITHUB_USER}/${REPO_NAME}..."
if gh repo view "${GITHUB_USER}/${REPO_NAME}" &>/dev/null; then
  echo "  ⚠️  仓库已存在，跳过创建"
else
  gh repo create "${GITHUB_USER}/${REPO_NAME}" \
    --public \
    --description "玑之智能 · 组织分工汇报页（含 CI/CD 自动部署）" \
    --source=. \
    --remote=origin \
    --push
  echo "  ✅ 仓库创建成功并已推送"
fi

# 4. 添加 remote（如未添加）
if ! git remote get-url origin &>/dev/null; then
  echo ""
  echo "🔗 添加远程仓库..."
  git remote add origin "$REMOTE_URL"
fi

# 5. 推送
echo ""
echo "📤 推送到 GitHub..."
git push -u origin master

# 6. 配置 Secrets
echo ""
echo "═══════════════════════════════════════════"
echo "  ✅ 代码已推送！下一步：配置 Secrets"
echo "═══════════════════════════════════════════"
echo ""
echo "请在浏览器打开："
echo "  https://github.com/${GITHUB_USER}/${REPO_NAME}/settings/secrets/actions"
echo ""
echo "添加以下两个 Repository Secret："
echo ""
echo "  ┌─────────────────┬──────────────────────────────────────┐"
echo "  │ Name            │ Value                                │"
echo "  ├─────────────────┼──────────────────────────────────────┤"
echo "  │ TCB_SECRET_ID   │ <从 cloudbase-cdn-upload/config.json 获取> │"
echo "  │ TCB_SECRET_KEY  │ <从 cloudbase-cdn-upload/config.json 获取> │"
echo "  └─────────────────┴──────────────────────────────────────┘"
echo ""
echo "配置完成后，每次 push master 即自动部署。"
echo ""

# 7. 可选：自动配置 Secrets（需要手动输入凭据）
read -p "是否现在通过 gh CLI 配置 Secrets？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  read -sp "请输入 TCB_SECRET_ID: " SID
  echo
  gh secret set TCB_SECRET_ID --body "$SID" --repo "${GITHUB_USER}/${REPO_NAME}"
  echo "  ✅ 已配置"
  
  read -sp "请输入 TCB_SECRET_KEY: " SKEY
  echo
  gh secret set TCB_SECRET_KEY --body "$SKEY" --repo "${GITHUB_USER}/${REPO_NAME}"
  echo "  ✅ 已配置"
  
  echo ""
  echo "🎉 全部完成！下次 push master 将自动触发部署。"
fi
