const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning build output for Firebase deployment...');

const outDir = path.join(process.cwd(), 'out');

// Remove APK files
const removeApkFiles = (directory) => {
  if (!fs.existsSync(directory)) return;
  
  const files = fs.readdirSync(directory);
  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      removeApkFiles(filePath);
    } else if (path.extname(file).toLowerCase() === '.apk') {
      console.log(`🗑️  Removing APK file: ${file}`);
      fs.unlinkSync(filePath);
    }
  });
};

removeApkFiles(outDir);

// Remove directories that Firebase treats as executables
const problematicDirs = [
  '404',
  'budgeting', 
  'dashboard',
  'expenses',
  'fingpt',
  'home',
  'income',
  'login',
  'manage',
  'portfolio',
  'reports',
  'signup',
  'transactions'
];

problematicDirs.forEach(dir => {
  const dirPath = path.join(outDir, dir);
  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    try {
      console.log(`🗑️  Removing directory: ${dir}`);
      fs.rmSync(dirPath, { recursive: true, force: true });
    } catch (error) {
      console.warn(`⚠️  Could not remove ${dir}:`, error.message);
    }
  }
});

console.log('✅ Cleanup completed!');
