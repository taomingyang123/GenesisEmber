'use strict';
// 与原 HTML 的 UTF-8 JSON → Base64 完全兼容，不依赖浏览器 btoa/atob。
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function encodeSave(save) {
  const binary = encodeURIComponent(JSON.stringify(save)).replace(/%([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  let result = '';
  for (let i = 0; i < binary.length; i += 3) {
    const a = binary.charCodeAt(i), b = binary.charCodeAt(i + 1), c = binary.charCodeAt(i + 2);
    const bits = (a << 16) | ((b || 0) << 8) | (c || 0);
    result += alphabet[(bits >>> 18) & 63] + alphabet[(bits >>> 12) & 63] +
      (i + 1 < binary.length ? alphabet[(bits >>> 6) & 63] : '=') +
      (i + 2 < binary.length ? alphabet[bits & 63] : '=');
  }
  return result;
}
function decodeSave(code) {
  if (typeof code !== 'string' || code.length > 250000) throw new Error('存档码为空或过长');
  const input = code.replace(/\s/g, '');
  if (!input || input.length % 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input)) throw new Error('存档码格式错误');
  let escaped = '';
  for (let i = 0; i < input.length; i += 4) {
    const bits = (alphabet.indexOf(input[i]) << 18) | (alphabet.indexOf(input[i + 1]) << 12) |
      (Math.max(0, alphabet.indexOf(input[i + 2])) << 6) | Math.max(0, alphabet.indexOf(input[i + 3]));
    const bytes = [(bits >>> 16) & 255];
    if (input[i + 2] !== '=') bytes.push((bits >>> 8) & 255);
    if (input[i + 3] !== '=') bytes.push(bits & 255);
    bytes.forEach(b => { escaped += '%' + b.toString(16).padStart(2, '0'); });
  }
  try { return JSON.parse(decodeURIComponent(escaped)); }
  catch (_) { throw new Error('存档码已损坏，无法读取'); }
}
module.exports = { encodeSave, decodeSave };
