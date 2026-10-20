import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// 默认配置即可满足本站需求（全动态渲染，无 ISR 页面）
export default defineCloudflareConfig();
