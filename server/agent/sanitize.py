import re

# 移除模型 reasoning / 思考块，避免展示到前端
_THINK_BLOCK = re.compile(
    r"<think(?:ing)?\s*>[\s\S]*?</think(?:ing)?\s*>",
    re.IGNORECASE,
)


def strip_think_content(text: str) -> str:
    if not text:
        return ""
    cleaned = _THINK_BLOCK.sub("", text)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()
