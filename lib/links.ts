/** 友链配置：在此添加友情链接，无需改数据库 */
export interface FriendLink {
  name: string
  url: string
  description?: string
  avatar?: string
}

export const FRIEND_LINKS: FriendLink[] = [
  // 示例：
  // { name: '某某的博客', url: 'https://example.com', description: '记录技术与生活', avatar: 'https://example.com/avatar.png' },
]
