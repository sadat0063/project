import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: [
    'background.js',
    'content-script.js',
    'popup.js',
    'modules/PDFExporter.js',
    'modules/MultiFormatExporter.js',
    'modules/AutoScanManager.js',
    'modules/ExportManager.js',
    'modules/StorageManager.js',
    'modules/EnhancedLogger.js',
    'modules/IndexedDBManager.js'
  ],
  bundle: true,
  outdir: 'dist',
  format: 'esm',
  target: 'chrome90',
  minify: true,
  sourcemap: true
});

console.log('Build completed!');