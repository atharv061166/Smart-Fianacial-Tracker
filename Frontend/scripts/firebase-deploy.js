const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting Firebase deployment process...');

// Step 1: Build the project
console.log('📦 Building the project...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed successfully');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Step 2: Restructure the output to avoid executable directories
console.log('🔧 Restructuring output for Firebase compatibility...');

const outDir = path.join(process.cwd(), 'out');
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

// Move content from problematic directories to avoid executable detection
problematicDirs.forEach(dir => {
  const dirPath = path.join(outDir, dir);
  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    try {
      const indexHtmlPath = path.join(dirPath, 'index.html');
      if (fs.existsSync(indexHtmlPath)) {
        // Create a new file with .html extension at the root level
        const newFileName = `${dir}.html`;
        const newFilePath = path.join(outDir, newFileName);

        console.log(`📁 Moving ${dir}/index.html to ${newFileName}`);
        fs.copyFileSync(indexHtmlPath, newFilePath);

        // Handle subdirectories (like dashboard/update)
        const subdirs = fs.readdirSync(dirPath).filter(item => {
          const itemPath = path.join(dirPath, item);
          return fs.statSync(itemPath).isDirectory();
        });

        subdirs.forEach(subdir => {
          const subdirPath = path.join(dirPath, subdir);
          const subdirIndexPath = path.join(subdirPath, 'index.html');
          if (fs.existsSync(subdirIndexPath)) {
            const newSubFileName = `${dir}-${subdir}.html`;
            const newSubFilePath = path.join(outDir, newSubFileName);
            console.log(`📁 Moving ${dir}/${subdir}/index.html to ${newSubFileName}`);
            fs.copyFileSync(subdirIndexPath, newSubFilePath);
          }
        });
      }

      // Remove the original directory
      console.log(`🗑️  Removing directory: ${dir}`);
      fs.rmSync(dirPath, { recursive: true, force: true });
    } catch (error) {
      console.warn(`⚠️  Could not process ${dir}:`, error.message);
    }
  }
});

// Step 3: Remove any APK files
console.log('🧹 Removing APK files...');
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

// Step 4: Deploy to Firebase
console.log('🚀 Deploying to Firebase...');
try {
  execSync('firebase deploy', { stdio: 'inherit' });
  console.log('✅ Deployment completed successfully!');
  console.log('🌐 Your app is now live at: https://skn-hackfest.web.app');
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}
