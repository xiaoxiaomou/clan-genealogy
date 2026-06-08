// i18n.ts - 轻量国际化（无外部依赖）
// 支持 zh-CN / en-US；持久化到 localStorage；订阅切换
import { useSyncExternalStore } from 'react';

export type Locale = 'zh-CN' | 'en-US';
const STORAGE_KEY = 'app_locale';
const SUPPORTED: Locale[] = ['zh-CN', 'en-US'];

type Dict = Record<string, string>;
type Bundle = Record<Locale, Dict>;

const listeners = new Set<() => void>();

function detectInitial(): Locale {
  if (typeof window === 'undefined') return 'zh-CN';
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored && SUPPORTED.includes(stored)) return stored;
  const nav = (navigator.language || 'zh-CN').toLowerCase();
  if (nav.startsWith('en')) return 'en-US';
  return 'zh-CN';
}

let currentLocale: Locale = detectInitial();

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(l: Locale) {
  if (l === currentLocale) return;
  currentLocale = l;
  localStorage.setItem(STORAGE_KEY, l);
  document.documentElement.lang = l;
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// 翻译字典
const BUNDLE: Bundle = {
  'zh-CN': {
    'app.name': '家族谱牒',
    'app.tagline': '传承家族记忆',
    'common.search': '搜索',
    'common.cancel': '取消',
    'common.confirm': '确认',
    'common.save': '保存',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.create': '创建',
    'common.back': '返回',
    'common.next': '下一步',
    'common.submit': '提交',
    'common.loading': '加载中…',
    'common.empty': '暂无数据',
    'common.error': '出错了',
    'common.success': '操作成功',
    'common.yes': '是',
    'common.no': '否',
    'nav.feed': '动态',
    'nav.tree': '谱系',
    'nav.stats': '统计',
    'nav.memorial': '祭日',
    'nav.settings': '设置',
    'nav.album': '相册',
    'nav.wufu': '五服',
    'auth.login': '登录',
    'auth.logout': '退出',
    'auth.register': '注册',
    'auth.username': '用户名',
    'auth.password': '密码',
    'auth.email': '邮箱',
    'auth.login.success': '登录成功',
    'auth.login.failed': '登录失败',
    'family.create': '创建家族',
    'family.merge': '家族合并',
    'family.settings': '家族设置',
    'family.share': '公开分享',
    'family.batch': '批量操作',
    'member.add': '添加成员',
    'member.edit': '编辑成员',
    'member.history': '编辑历史',
    'post.like': '点赞',
    'post.comment': '评论',
    'post.share': '分享',
    'post.new': '发布动态',
    'post.placeholder': '分享家族新鲜事… 输入 @ 提及成员',
    'post.delete.confirm': '确认删除这条动态？',
    'notification.empty': '暂无通知',
    'language.zh-CN': '简体中文',
    'language.en-US': 'English',
    'shortcut.help': '键盘快捷键',
    'search.command': '命令面板',
    'shortcut.command_palette': '搜索 / 命令',
    'reminder.today': '今天',
    'reminder.week': '未来 7 天',
    'reminder.month': '未来 30 天',
    'reminder.ahead': '更远',
  },
  'en-US': {
    'app.name': 'Family Tree',
    'app.tagline': 'Preserve Family Memories',
    'common.search': 'Search',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.submit': 'Submit',
    'common.loading': 'Loading…',
    'common.empty': 'No data',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.yes': 'Yes',
    'common.no': 'No',
    'nav.feed': 'Feed',
    'nav.tree': 'Tree',
    'nav.stats': 'Stats',
    'nav.memorial': 'Memorial',
    'nav.settings': 'Settings',
    'nav.album': 'Albums',
    'nav.wufu': 'Wufu',
    'auth.login': 'Log in',
    'auth.logout': 'Log out',
    'auth.register': 'Sign up',
    'auth.username': 'Username',
    'auth.password': 'Password',
    'auth.email': 'Email',
    'auth.login.success': 'Logged in',
    'auth.login.failed': 'Login failed',
    'family.create': 'Create family',
    'family.merge': 'Merge families',
    'family.settings': 'Family settings',
    'family.share': 'Public share',
    'family.batch': 'Batch ops',
    'member.add': 'Add member',
    'member.edit': 'Edit member',
    'member.history': 'Edit history',
    'post.like': 'Like',
    'post.comment': 'Comment',
    'post.share': 'Share',
    'post.new': 'New post',
    'post.placeholder': 'Share family news… type @ to mention',
    'post.delete.confirm': 'Delete this post?',
    'notification.empty': 'No notifications',
    'language.zh-CN': '简体中文',
    'language.en-US': 'English',
    'shortcut.help': 'Keyboard shortcuts',
    'search.command': 'Command palette',
    'shortcut.command_palette': 'Search / commands',
    'reminder.today': 'Today',
    'reminder.week': 'Next 7 days',
    'reminder.month': 'Next 30 days',
    'reminder.ahead': 'Later',
  },
};

export function t(key: string, fallback?: string): string {
  const dict = BUNDLE[currentLocale] || BUNDLE['zh-CN'];
  return dict[key] || fallback || key;
}

export function useT() {
  // re-render on locale change
  useSyncExternalStore(subscribe, () => currentLocale, () => 'zh-CN');
  return (key: string, fallback?: string) => t(key, fallback);
}

export function useLocale() {
  const locale = useSyncExternalStore(subscribe, () => currentLocale, () => 'zh-CN');
  return [locale, setLocale] as const;
}

export const SUPPORTED_LOCALES = SUPPORTED;
