const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 讀取 manifest.json 取得版本資訊
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const version = manifest.version;
const pluginName = manifest.name.replace(/\s+/g, '-').toLowerCase();

const RELEASE_DIR = 'Whispering';
const DIST_DIR = 'dist';

function createPackage() {
  console.log(`📦 開始打包 ${manifest.name} v${version}...`);
  
  // 確保 dist 目錄存在
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }
  
  // 建立發布檔案
  execSync('npm run copy-release', { stdio: 'inherit' });
  
  // 複製 README 到發布目錄
  const readmePath = path.join(RELEASE_DIR, 'README.md');
  if (fs.existsSync('README-RELEASE.md')) {
    fs.copyFileSync('README-RELEASE.md', readmePath);
    console.log(`📋 複製說明檔案: README-RELEASE.md → ${readmePath}`);
  }
  
  // 建立版本資訊檔案
  const versionInfo = {
    name: manifest.name,
    version: version,
    description: manifest.description,
    author: manifest.author,
    minAppVersion: manifest.minAppVersion,
    buildTime: new Date().toISOString(),
    files: fs.readdirSync(RELEASE_DIR)
  };
  
  const versionInfoPath = path.join(RELEASE_DIR, 'version-info.json');
  fs.writeFileSync(versionInfoPath, JSON.stringify(versionInfo, null, 2));
  console.log(`📋 建立版本資訊: ${versionInfoPath}`);
  
  // 建立 ZIP 檔案
  const zipFileName = `${pluginName}-v${version}.zip`;
  const zipPath = path.join(DIST_DIR, zipFileName);
  
  try {
    // 使用系統的 zip 命令
    execSync(`cd ${RELEASE_DIR} && zip -r "../${zipPath}" .`, { stdio: 'pipe' });
    console.log(`📦 建立 ZIP 檔案: ${zipPath}`);
    
    // 檢查 ZIP 檔案大小
    const zipStats = fs.statSync(zipPath);
    const zipSizeKB = Math.round(zipStats.size / 1024);
    console.log(`📊 ZIP 檔案大小: ${zipSizeKB} KB`);
    
  } catch (error) {
    console.log('⚠️  無法建立 ZIP 檔案 (需要 zip 命令)，但發布檔案已準備完成');
  }
  
  console.log(`\n🎉 打包完成！`);
  console.log(`📁 發布目錄: ${path.resolve(RELEASE_DIR)}/`);
  console.log(`📦 打包目錄: ${path.resolve(DIST_DIR)}/`);
  
  console.log(`\n📖 安裝方式 1 - 手動安裝:`);
  console.log(`   將 ${RELEASE_DIR}/ 資料夾複製到: <vault>/.obsidian/plugins/`);
  
  if (fs.existsSync(zipPath)) {
    console.log(`\n📖 安裝方式 2 - ZIP 安裝:`);
    console.log(`   解壓 ${zipFileName} 到: <vault>/.obsidian/plugins/Whispering/`);
  }
  
  console.log(`\n✅ 發布檔案內容:`);
  const releaseFiles = fs.readdirSync(RELEASE_DIR);
  releaseFiles.forEach(file => {
    const filePath = path.join(RELEASE_DIR, file);
    const stats = fs.statSync(filePath);
    const sizeKB = Math.round(stats.size / 1024);
    console.log(`   - ${file} (${sizeKB} KB)`);
  });
}

// 執行打包
try {
  createPackage();
} catch (error) {
  console.error('❌ 打包失敗:', error.message);
  process.exit(1);
}
