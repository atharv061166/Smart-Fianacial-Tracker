#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function analyzeBundle() {
  log('🔍 Analyzing Next.js bundle...', 'cyan')
  
  try {
    // Build the project first
    log('📦 Building project...', 'yellow')
    execSync('npm run build', { stdio: 'inherit' })
    
    // Check if .next directory exists
    const nextDir = path.join(process.cwd(), '.next')
    if (!fs.existsSync(nextDir)) {
      log('❌ .next directory not found. Build may have failed.', 'red')
      return
    }
    
    // Analyze static directory
    const staticDir = path.join(nextDir, 'static')
    if (fs.existsSync(staticDir)) {
      analyzeStaticAssets(staticDir)
    }
    
    // Analyze server chunks
    const serverDir = path.join(nextDir, 'server')
    if (fs.existsSync(serverDir)) {
      analyzeServerChunks(serverDir)
    }
    
    // Generate bundle report
    generateBundleReport()
    
  } catch (error) {
    log(`❌ Error analyzing bundle: ${error.message}`, 'red')
  }
}

function analyzeStaticAssets(staticDir) {
  log('\n📊 Static Assets Analysis:', 'bright')
  
  const chunks = []
  
  function scanDirectory(dir, prefix = '') {
    const items = fs.readdirSync(dir)
    
    for (const item of items) {
      const itemPath = path.join(dir, item)
      const stat = fs.statSync(itemPath)
      
      if (stat.isDirectory()) {
        scanDirectory(itemPath, `${prefix}${item}/`)
      } else if (item.endsWith('.js') || item.endsWith('.css')) {
        const size = stat.size
        chunks.push({
          name: `${prefix}${item}`,
          size,
          type: item.endsWith('.js') ? 'JavaScript' : 'CSS'
        })
      }
    }
  }
  
  scanDirectory(staticDir)
  
  // Sort by size (largest first)
  chunks.sort((a, b) => b.size - a.size)
  
  // Display results
  const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0)
  
  log(`Total bundle size: ${formatBytes(totalSize)}`, 'green')
  log('\nLargest chunks:', 'yellow')
  
  chunks.slice(0, 10).forEach((chunk, index) => {
    const percentage = ((chunk.size / totalSize) * 100).toFixed(1)
    const color = chunk.size > 500000 ? 'red' : chunk.size > 100000 ? 'yellow' : 'green'
    log(`${index + 1}. ${chunk.name} (${chunk.type}): ${formatBytes(chunk.size)} (${percentage}%)`, color)
  })
  
  // Check for potential issues
  checkBundleIssues(chunks)
}

function analyzeServerChunks(serverDir) {
  log('\n🖥️  Server Chunks Analysis:', 'bright')
  
  const pagesDir = path.join(serverDir, 'pages')
  if (!fs.existsSync(pagesDir)) {
    log('No server pages found', 'yellow')
    return
  }
  
  const pages = []
  
  function scanPages(dir, prefix = '') {
    const items = fs.readdirSync(dir)
    
    for (const item of items) {
      const itemPath = path.join(dir, item)
      const stat = fs.statSync(itemPath)
      
      if (stat.isDirectory()) {
        scanPages(itemPath, `${prefix}${item}/`)
      } else if (item.endsWith('.js') || item.endsWith('.html')) {
        const size = stat.size
        pages.push({
          name: `${prefix}${item}`,
          size
        })
      }
    }
  }
  
  scanPages(pagesDir)
  
  // Sort by size
  pages.sort((a, b) => b.size - a.size)
  
  log('Largest server pages:', 'yellow')
  pages.slice(0, 5).forEach((page, index) => {
    const color = page.size > 100000 ? 'red' : page.size > 50000 ? 'yellow' : 'green'
    log(`${index + 1}. ${page.name}: ${formatBytes(page.size)}`, color)
  })
}

function checkBundleIssues(chunks) {
  log('\n⚠️  Potential Issues:', 'bright')
  
  const issues = []
  
  // Check for large JavaScript chunks
  const largeJSChunks = chunks.filter(chunk => 
    chunk.type === 'JavaScript' && chunk.size > 500000
  )
  
  if (largeJSChunks.length > 0) {
    issues.push(`Large JavaScript chunks detected (${largeJSChunks.length} files > 500KB)`)
  }
  
  // Check for duplicate dependencies
  const jsChunks = chunks.filter(chunk => chunk.type === 'JavaScript')
  const suspiciousNames = ['react', 'lodash', 'moment', 'firebase']
  
  suspiciousNames.forEach(name => {
    const matchingChunks = jsChunks.filter(chunk => 
      chunk.name.toLowerCase().includes(name)
    )
    if (matchingChunks.length > 1) {
      issues.push(`Potential duplicate dependency: ${name} (${matchingChunks.length} chunks)`)
    }
  })
  
  // Check total bundle size
  const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0)
  if (totalSize > 2000000) { // 2MB
    issues.push(`Large total bundle size: ${formatBytes(totalSize)}`)
  }
  
  if (issues.length === 0) {
    log('✅ No major issues detected!', 'green')
  } else {
    issues.forEach(issue => log(`⚠️  ${issue}`, 'yellow'))
  }
}

function generateBundleReport() {
  log('\n📋 Generating bundle report...', 'cyan')
  
  const reportPath = path.join(process.cwd(), 'bundle-report.json')
  const buildInfo = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    // Add more build info as needed
  }
  
  try {
    fs.writeFileSync(reportPath, JSON.stringify(buildInfo, null, 2))
    log(`✅ Bundle report saved to: ${reportPath}`, 'green')
  } catch (error) {
    log(`❌ Failed to save bundle report: ${error.message}`, 'red')
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Run the analysis
if (require.main === module) {
  analyzeBundle()
}

module.exports = { analyzeBundle }
