import { fileURLToPath } from 'url';
import fs from 'fs';
import { minify } from 'terser';

const inputFile = fileURLToPath(new URL('../dist/index.js', import.meta.url));
const tsSourceMap = fileURLToPath(
  new URL('../dist/index.js.map', import.meta.url)
);
const outputFile = fileURLToPath(
  new URL('../dist/index.min.js', import.meta.url)
);

let result = await minify(fs.readFileSync(inputFile, 'utf-8'), {
  mangle: {
    module: true,
    reserved: [
      '_k',
      '_h',
      '_g',
      '_m',
      '$on',
      '$off',
      '_do',
      '_tk',
      '_em',
      '_p',
      'key',
      't',
      'r',
      'o',
      'op',
      'dc',
      'html',
      'exp',
      'dom',
      'tpl',
    ],
  },
  compress: {
    ecma: '2015',
  },
  ecma: '2015',
  sourceMap: {
    content: fs.readFileSync(tsSourceMap, 'utf-8'),
    url: 'index.min.js.map',
  },
});

// Output the minified file and the map.
fs.writeFileSync(outputFile, result.code, 'utf8');
fs.writeFileSync(outputFile + '.map', result.map, 'utf8');
