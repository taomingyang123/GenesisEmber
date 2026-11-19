'use strict';

/**
 * 跨端 UTF-8 JSON <-> Base64 存档码编解码器
 * 与 evolve_web 的 btoa(unescape(encodeURIComponent(...))) 以及小游戏端完全互通
 */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * 将存档对象编码为 Base64 存档码
 * @param {object} save
 * @returns {string}
 */
function encodeSave(save) {
  const binary = encodeURIComponent(JSON.stringify(save)).replace(/%([0-9A-F]{2})/g, (_, h) =>
    String.fromCharCode(parseInt(h, 16))
  );
  let result = '';
  for (let i = 0; i < binary.length; i += 3) {
    const a = binary.charCodeAt(i);
    const b = binary.charCodeAt(i + 1);
    const c = binary.charCodeAt(i + 2);
    const bits = (a << 16) | ((b || 0) << 8) | (c || 0);
    result +=
      ALPHABET[(bits >>> 18) & 63] +
      ALPHABET[(bits >>> 12) & 63] +
      (i + 1 < binary.length ? ALPHABET[(bits >>> 6) & 63] : '=') +
      (i + 2 < binary.length ? ALPHABET[bits & 63] : '=');
  }
  return result;
}

/**
 * 将 Base64 存档码解码为存档对象
 * @param {string} code
 * @returns {object}
 */
function decodeSave(code) {
  if (typeof code !== 'string' || code.length > 500000) {
    throw new Error('存档码为空或过长');
  }
  const input = code.replace(/\s/g, '');
  if (
    !input ||
    input.length % 4 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input)
  ) {
    throw new Error('存档码格式无效，导入失败！');
  }
  let escaped = '';
  for (let i = 0; i < input.length; i += 4) {
    const bits =
      (ALPHABET.indexOf(input[i]) << 18) |
      (ALPHABET.indexOf(input[i + 1]) << 12) |
      (Math.max(0, ALPHABET.indexOf(input[i + 2])) << 6) |
      Math.max(0, ALPHABET.indexOf(input[i + 3]));
    const bytes = [(bits >>> 16) & 255];
    if (input[i + 2] !== '=') bytes.push((bits >>> 8) & 255);
    if (input[i + 3] !== '=') bytes.push(bits & 255);
    for (let j = 0; j < bytes.length; j++) {
      escaped += '%' + bytes[j].toString(16).padStart(2, '0');
    }
  }
  let parsed;
  try {
    parsed = JSON.parse(decodeURIComponent(escaped));
  } catch (_) {
    throw new Error('存档码已损坏，无法读取');
  }
  if (!parsed || typeof parsed !== 'object' || !parsed.world) {
    throw new Error('存档码结构无效，导入失败！');
  }
  return parsed;
}

module.exports = { encodeSave, decodeSave };
