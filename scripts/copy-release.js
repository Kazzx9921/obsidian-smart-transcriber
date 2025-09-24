const fs = require('fs');
const path = require('path');

// 發布目錄名稱
const RELEASE_DIR = 'Whispering';

// 需要複製的檔案
const FILES_TO_COPY = [
  'main.js',
  'manifest.json',
  'versions.json'
];

// 可選的檔案（如果存在就複製）
const OPTIONAL_FILES = [
  'styles.css'
];

function copyReleaseFiles() {
  console.log('🚀 開始準備發布檔案...');
  
  // 確保發布目錄存在
  if (!fs.existsSync(RELEASE_DIR)) {
    fs.mkdirSync(RELEASE_DIR, { recursive: true });
    console.log(`✅ 建立發布目錄: ${RELEASE_DIR}/`);
  }
  
  // 複製必要檔案
  let copiedCount = 0;
  
  FILES_TO_COPY.forEach(file => {
    if (fs.existsSync(file)) {
      const destPath = path.join(RELEASE_DIR, file);
      fs.copyFileSync(file, destPath);
      console.log(`📋 複製檔案: ${file} → ${destPath}`);
      copiedCount++;
    } else {
      console.error(`❌ 找不到必要檔案: ${file}`);
      process.exit(1);
    }
  });
  
  // 複製可選檔案
  OPTIONAL_FILES.forEach(file => {
    if (fs.existsSync(file)) {
      const destPath = path.join(RELEASE_DIR, file);
      fs.copyFileSync(file, destPath);
      console.log(`📋 複製可選檔案: ${file} → ${destPath}`);
      copiedCount++;
    }
  });
  
  console.log(`\n🎉 發布準備完成！`);
  console.log(`📁 發布目錄: ${path.resolve(RELEASE_DIR)}/`);
  console.log(`📦 總共複製了 ${copiedCount} 個檔案`);
  console.log(`\n📖 安裝說明:`);
  console.log(`   1. 將整個 ${RELEASE_DIR}/ 資料夾複製到您的 Obsidian vault`);
  console.log(`   2. 放置位置: <your-vault>/.obsidian/plugins/${RELEASE_DIR}/`);
  console.log(`   3. 在 Obsidian 設定中啟用插件`);
  
  // 檢查檔案大小
  const mainJsPath = path.join(RELEASE_DIR, 'main.js');
  if (fs.existsSync(mainJsPath)) {
    const stats = fs.statSync(mainJsPath);
    const fileSizeInKB = Math.round(stats.size / 1024);
    console.log(`\n📊 main.js 大小: ${fileSizeInKB} KB`);
  }
}

// 執行複製
try {
  copyReleaseFiles();
} catch (error) {
  console.error('❌ 發布準備失敗:', error.message);
  process.exit(1);
}
