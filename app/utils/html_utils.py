"""
HTML 清理工具
用于族谱成员 bio 字段的安全富文本存储与展示。

策略：
- 保留语义标签：p, br, h2-h4, strong, em, u, s, ul, ol, li, blockquote, code, pre
- 保留链接（仅 http/https/mailto/tel）
- 移除危险标签：script, style, iframe, object, embed, link, meta, form
- 移除事件属性（onclick, onerror, onload, ...）
- 移除 javascript: 协议
"""
import re
from typing import Tuple

# 允许的标签白名单
ALLOWED_TAGS = {
    'p', 'br', 'div', 'span',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'mark', 'small', 'sub', 'sup',
    'ul', 'ol', 'li',
    'blockquote', 'code', 'pre', 'hr',
    'a',
}

# 每个标签允许的属性
ALLOWED_ATTRS = {
    'a': {'href', 'title', 'target', 'rel'},
    '*': {'class'},  # 通用 class 用于样式
}

# 允许的协议
ALLOWED_PROTOCOLS = {'http', 'https', 'mailto', 'tel'}

# 危险标签
DANGEROUS_TAGS = {
    'script', 'style', 'iframe', 'object', 'embed', 'link', 'meta',
    'form', 'input', 'button', 'textarea', 'select', 'option',
    'frame', 'frameset', 'noframes', 'noscript',
    'base', 'area', 'map', 'svg', 'math', 'video', 'audio', 'source',
    'applet', 'object',
}


_TAG_RE = re.compile(r'<\s*(/?)\s*([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>', re.DOTALL)
_COMMENT_RE = re.compile(r'<!--.*?-->', re.DOTALL)
_EVENT_ATTR_RE = re.compile(r'\s+on[a-z]+\s*=\s*(["\']).*?\1', re.IGNORECASE | re.DOTALL)
_JS_PROTOCOL_RE = re.compile(r'(href|src)\s*=\s*["\']?\s*javascript:', re.IGNORECASE)


def sanitize_html(html: str, max_length: int = 20000) -> str:
    """
    清理 HTML 字符串，返回安全 HTML。

    Args:
        html: 输入的 HTML 字符串
        max_length: 限制最大长度，防止 DoS

    Returns:
        清理后的安全 HTML 字符串
    """
    if not html:
        return ''

    if len(html) > max_length:
        html = html[:max_length]

    # 去除注释
    html = _COMMENT_RE.sub('', html)
    # 去除 javascript: 协议
    html = _JS_PROTOCOL_RE.sub(r'\1="#"', html)

    def _clean(match: re.Match) -> str:
        is_close = match.group(1) == '/'
        tag = match.group(2).lower()
        attrs_str = match.group(3) or ''

        if tag in DANGEROUS_TAGS:
            return ''

        if tag not in ALLOWED_TAGS:
            return ''

        if is_close:
            return f'</{tag}>'

        # 清理属性
        cleaned_attrs = []
        for attr_match in re.finditer(r'([a-zA-Z][\w-]*)\s*=\s*(["\'])(.*?)\2', attrs_str):
            name = attr_match.group(1).lower()
            val = attr_match.group(3)

            if name.startswith('on'):
                continue  # 事件属性

            allowed = ALLOWED_ATTRS.get(tag, set()) | ALLOWED_ATTRS.get('*', set())
            if name not in allowed:
                continue

            # 链接协议过滤
            if name in ('href', 'src') and val:
                val = val.strip()
                proto_match = re.match(r'^([a-zA-Z][\w+.-]*):', val)
                if proto_match and proto_match.group(1).lower() not in ALLOWED_PROTOCOLS:
                    val = '#'
                if val.lower().startswith('javascript:'):
                    val = '#'

            cleaned_attrs.append(f'{name}="{val}"')

        attrs = (' ' + ' '.join(cleaned_attrs)) if cleaned_attrs else ''
        return f'<{tag}{attrs}>'

    return _TAG_RE.sub(_clean, html)


def html_to_plain_text(html: str) -> str:
    """将 HTML 转为纯文本（用于搜索、预览）"""
    if not html:
        return ''
    # 去除标签
    text = re.sub(r'<[^>]+>', ' ', html)
    # 合并空白
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def get_excerpt(html: str, length: int = 100) -> str:
    """获取 HTML 的纯文本摘要"""
    text = html_to_plain_text(html)
    if len(text) <= length:
        return text
    return text[:length] + '...'


def is_safe_html(html: str) -> Tuple[bool, str]:
    """快速检查 HTML 是否安全（用于校验）"""
    if not html:
        return True, ''
    if _COMMENT_RE.search(html):
        return False, '不允许注释'
    if _JS_PROTOCOL_RE.search(html):
        return False, '不允许 javascript: 协议'
    for tag in DANGEROUS_TAGS:
        if re.search(rf'<\s*{tag}\b', html, re.IGNORECASE):
            return False, f'不允许标签 <{tag}>'
    if _EVENT_ATTR_RE.search(html):
        return False, '不允许事件属性'
    return True, ''
