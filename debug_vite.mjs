import fs from 'fs';
try {
  await import('./vite.config.js');
  console.log('SUCCESS!');
} catch (e) {
  fs.writeFileSync('err.txt', String(e.stack));
  console.log('ERROR WRITTEN TO err.txt');
}
