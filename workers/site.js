/**
 * Cloudflare Worker 入口：将根路径 "/" 与 "/index.html" 映射至 "/rna.html"
 * 其余静态资源由 Cloudflare Workers Static Assets 直接在边缘节点响应
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const targetUrl = new URL('/rna.html', request.url);
      return env.ASSETS.fetch(new Request(targetUrl, request));
    }
    return env.ASSETS.fetch(request);
  }
};
