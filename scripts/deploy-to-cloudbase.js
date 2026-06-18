#!/usr/bin/env node

/**
 * ============================================================
 * 玑之智能 — CloudBase 静态托管部署脚本
 * 用于 GitHub Actions 自动部署 HTML 文件到 CloudBase CDN
 * ============================================================
 *
 * 使用方法：
 *   node scripts/deploy-to-cloudbase.js
 *
 * 环境变量：
 *   TCB_SECRET_ID   — CloudBase SecretId
 *   TCB_SECRET_KEY  — CloudBase SecretKey
 *   TCB_ENV_ID      — CloudBase 环境 ID（默认：ji-projects-d1g4i777v9f9d798e）
 *
 * 行为：
 *   1. 递归扫描仓库中所有 .html 文件
 *   2. 上传到 CloudBase 静态托管（保持目录结构）
 *   3. 输出部署清单
 */

const fs = require("fs");
const path = require("path");
const cloudbase = require("@cloudbase/node-sdk");

// ── 配置 ──────────────────────────────────────────
const ENV_ID = process.env.TCB_ENV_ID || "ji-projects-d1g4i777v9f9d798e";
const SECRET_ID = process.env.TCB_SECRET_ID;
const SECRET_KEY = process.env.TCB_SECRET_KEY;
const REPO_ROOT = process.env.GITHUB_WORKSPACE || process.cwd();

// ── 排除目录 ──────────────────────────────────────
const EXCLUDE_DIRS = [".git", "node_modules", ".workbuddy", "__pycache__"];

if (!SECRET_ID || !SECRET_KEY) {
  console.error(
    "❌ 缺少 CloudBase 凭据。请设置 TCB_SECRET_ID 和 TCB_SECRET_KEY 环境变量（GitHub Secrets）。"
  );
  process.exit(1);
}

// ── 初始化 SDK ────────────────────────────────────
const app = cloudbase.init({
  env: ENV_ID,
  secretId: SECRET_ID,
  secretKey: SECRET_KEY,
});

// ── 扫描 HTML 文件 ────────────────────────────────
function findHtmlFiles(dir, baseDir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(entry.name) && !entry.name.startsWith(".")) {
        results.push(...findHtmlFiles(fullPath, baseDir));
      }
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".html") &&
      !entry.name.includes("_备份")
    ) {
      results.push({
        localPath: fullPath,
        cloudPath: relativePath,
        size: fs.statSync(fullPath).size,
      });
    }
  }

  return results;
}

// ── 上传单个文件 ──────────────────────────────────
async function uploadFile(file, storage) {
  const content = fs.readFileSync(file.localPath);
  const cloudPath = `home/${file.cloudPath}`; // CloudBase 静态托管路径

  try {
    const result = await storage.uploadFile({
      cloudPath: cloudPath,
      fileContent: content,
    });

    if (result && result.fileID) {
      return { success: true, fileID: result.fileID, cloudPath };
    }
    return { success: true, cloudPath, detail: result };
  } catch (err) {
    // 重试一次
    try {
      const retryResult = await storage.uploadFile({
        cloudPath: cloudPath,
        fileContent: content,
      });
      return { success: true, cloudPath, detail: retryResult, retried: true };
    } catch (retryErr) {
      return { success: false, cloudPath, error: retryErr.message };
    }
  }
}

// ── 主流程 ────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  玑之智能 CloudBase 静态托管部署");
  console.log("═══════════════════════════════════════════");
  console.log(`  环境 ID : ${ENV_ID}`);
  console.log(`  仓库根目录: ${REPO_ROOT}`);
  console.log("───────────────────────────────────────────");

  // 扫描文件
  const htmlFiles = findHtmlFiles(REPO_ROOT, REPO_ROOT);
  console.log(`\n📋 发现 ${htmlFiles.length} 个 HTML 文件:\n`);

  if (htmlFiles.length === 0) {
    console.log("  ⚠️  没有发现需要部署的 HTML 文件，跳过。");
    return;
  }

  htmlFiles.forEach((f) => {
    const sizeKB = (f.size / 1024).toFixed(1);
    console.log(`  · ${f.cloudPath}  (${sizeKB} KB)`);
  });

  // 上传
  console.log("\n📤 开始上传...\n");
  const storage = app.storage();
  const results = [];

  for (const file of htmlFiles) {
    process.stdout.write(`  ⬆  ${file.cloudPath} ... `);
    const result = await uploadFile(file, storage);
    results.push({ ...result, file });

    if (result.success) {
      console.log("✅ 成功");
    } else {
      console.log(`❌ 失败: ${result.error}`);
    }
  }

  // 汇总
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  console.log("\n───────────────────────────────────────────");
  console.log(`\n📊 部署结果: ${successCount} 成功, ${failCount} 失败`);
  console.log(`🔗 CDN 根路径: https://${ENV_ID}.tcb.qcloud.la/home/`);

  if (failCount > 0) {
    console.log("\n❌ 失败文件:");
    results
      .filter((r) => !r.success)
      .forEach((r) => console.log(`  · ${r.cloudPath}: ${r.error}`));
    process.exit(1);
  }

  console.log("\n✅ 部署完成！");
}

main().catch((err) => {
  console.error("\n❌ 部署脚本异常:", err.message);
  process.exit(1);
});
