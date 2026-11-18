'use strict';
// 零依赖浏览器预览：只在本机提供与小游戏相同的 CommonJS 模块。
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const modules = ['data', 'engine', 'scene', 'ui', 'save-code', 'platform', 'app'];
const port = Number(process.env.PORT || 4173);
function bundle() {
  const registry = modules.map(name => `${JSON.stringify('./' + name)}: function(require,module,exports) {\n${fs.readFileSync(path.join(root, 'js', name + '.js'), 'utf8')}\n}`).join(',\n');
  return `(function(){const modules={${registry}};const cache={};function require(id){if(!cache[id]){const module={exports:{}};cache[id]=module;modules[id](require,module,module.exports);}return cache[id].exports;}window.GenesisStart=require('./app');})();`;
}
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/bundle.js') { res.setHeader('Content-Type', 'application/javascript; charset=utf-8'); res.end(bundle()); return; }
  let file;
  if (url.pathname === '/') file = path.join(__dirname, 'preview.html');
  else if (url.pathname === '/preview-wx.js') file = path.join(__dirname, 'preview-wx.js');
  else if (/^\/assets\/audio\/(click|build|tech|era)\.wav$/.test(url.pathname)) file = path.join(root, url.pathname);
  if (!file || !fs.existsSync(file)) { res.writeHead(404); res.end('Not found'); return; }
  const ext = path.extname(file);
  res.setHeader('Content-Type', ext === '.html' ? 'text/html; charset=utf-8' : ext === '.wav' ? 'audio/wav' : 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  fs.createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`小游戏预览：http://127.0.0.1:${port}`));
