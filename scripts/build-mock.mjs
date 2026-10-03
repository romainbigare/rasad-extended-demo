// Bundles demo/sw-entry.js (service worker + mock backend) into public/mock-sw.js.
import { build } from 'esbuild';

await build({
  entryPoints: ['demo/sw-entry.js'],
  outfile: 'public/mock-sw.js',
  bundle: true,
  minify: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  legalComments: 'none',
});
console.log('built public/mock-sw.js');
