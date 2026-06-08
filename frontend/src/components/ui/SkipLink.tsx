// SkipLink.tsx - 跳过到主内容链接（仅键盘聚焦可见）
import { useT } from '../../i18n';

export function SkipLink() {
  const t = useT();
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
    >
      {t('common.skip_to_content', '跳到主要内容')}
    </a>
  );
}
