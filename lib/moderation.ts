/**
 * 评论敏感词过滤：命中词替换为 ***。
 * 词库为保守基础版，按需在此增删即可（全局生效，无需迁移）。
 */
const SENSITIVE_WORDS = [
  // 广告导流 / 违禁
  '刷单', '代开发票', '信用卡套现', '博彩', '赌博', '网赚兼职', '外挂出售',
  '办证刻章', '代孕', '色情', '淫秽', '约炮', '裸聊',
  '枪支', '弹药', '毒品', '冰毒', '摇头丸', '爆炸物制作',
  // 人身攻击（示例，按需补充）
  '傻逼', '草泥马', '操你妈', '去死吧',
]

/** 过滤敏感词，返回替换后的文本 */
export function filterSensitiveWords(text: string): string {
  let result = text
  for (const word of SENSITIVE_WORDS) {
    if (result.includes(word)) {
      result = result.split(word).join('***')
    }
  }
  return result
}
