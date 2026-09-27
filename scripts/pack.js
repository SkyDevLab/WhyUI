import { execSync } from 'child_process';
import fs from 'fs';

console.log('Building and packaging WhyUI for Microsoft Edge Partner Center...');

// 1. Build project
execSync('npm run build', { stdio: 'inherit' });

// 2. Package into zip
execSync('python scripts/zip.py', { stdio: 'inherit' });
