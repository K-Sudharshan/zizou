const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const svgSourcePath = path.resolve(__dirname, '../zizou-idea-paper-plane.svg');
const publicDir = path.resolve(__dirname, '../public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Copy SVG directly to public as icon.svg and zizou-idea-paper-plane.svg
const rawSvg = fs.readFileSync(svgSourcePath, 'utf-8');
fs.writeFileSync(path.join(publicDir, 'icon.svg'), rawSvg);
fs.writeFileSync(path.join(publicDir, 'zizou-idea-paper-plane.svg'), rawSvg);
console.log('✓ Copied SVGs to public/icon.svg and public/zizou-idea-paper-plane.svg');

// 2. Generate PNGs at required resolutions for iOS & Android
const targets = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'apple-touch-icon-precomposed.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'favicon-32.png', size: 32 },
];

const tempHtml = path.resolve(__dirname, 'temp_render.html');

for (const target of targets) {
  const { name, size } = target;
  const outPath = path.join(publicDir, name);

  fs.writeFileSync(
    tempHtml,
    `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${size}px;
    height: ${size}px;
    overflow: hidden;
    background: #ffffff;
  }
  svg {
    width: ${size}px;
    height: ${size}px;
    display: block;
  }
</style>
</head>
<body>
${rawSvg}
</body>
</html>`
  );

  execFileSync(edgePath, [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    `--window-size=${size},${size}`,
    `--screenshot=${outPath}`,
    `file:///${tempHtml.replace(/\\/g, '/')}`,
  ]);

  const stat = fs.statSync(outPath);
  console.log(`✓ Generated ${name} (${size}x${size}, ${stat.size} bytes)`);
}

// 3. Generate favicon.ico (copy 32x32 PNG to favicon.ico as standard modern favicon)
fs.copyFileSync(path.join(publicDir, 'favicon-32.png'), path.join(publicDir, 'favicon.ico'));
console.log('✓ Created public/favicon.ico');

// Cleanup temp files
if (fs.existsSync(tempHtml)) {
  fs.unlinkSync(tempHtml);
}
const test180 = path.resolve(__dirname, 'temp_180.png');
if (fs.existsSync(test180)) {
  fs.unlinkSync(test180);
}
const testHtml = path.resolve(__dirname, 'temp_icon.html');
if (fs.existsSync(testHtml)) {
  fs.unlinkSync(testHtml);
}
const testScript = path.resolve(__dirname, 'test-render.js');
if (fs.existsSync(testScript)) {
  fs.unlinkSync(testScript);
}

console.log('\nAll Zizou paper-plane icons successfully generated!');
