from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

JUDGE_SYSTEM = """你是「判官」，负责阅卷评判学习者对英文词根/单词的理解是否准确。
你必须且只能给出 verdict 为「正确」或「错误」之一。
评判标准：用户解释是否抓住词根核心含义，并能合理关联到目标单词，不要求字面一致。
若解释含糊、偏离词根本义、或明显错误，判为「错误」。"""


class JudgeVerdict(BaseModel):
    verdict: str = Field(description="只能填写「正确」或「错误」")
    feedback: str = Field(description="简短评语，一两句话，说明判词理由")


def _normalize_verdict(raw: str) -> str:
    text = (raw or "").strip()
    if "正确" in text and "错误" not in text:
        return "正确"
    if "错误" in text:
        return "错误"
    if text.lower() in {"correct", "right", "true", "yes"}:
        return "正确"
    return "错误"


def run_judge(
    word: str,
    definition: str,
    root: str,
    root_meaning: str,
    user_explanation: str,
    base_url: str,
    api_key: str,
    model: str,
) -> dict:
    llm = ChatOpenAI(
        model=model,
        api_key=api_key,
        base_url=base_url.rstrip("/"),
    ).with_structured_output(JudgeVerdict)

    prompt = f"""请评判以下作答：

【词根】{root}（{root_meaning}）
【目标单词】{word}
【标准释义】{definition}

【学习者解释】
{user_explanation}

请判断学习者解释是否符合词根与单词含义。"""

    result: JudgeVerdict = llm.invoke(
        [
            {"role": "system", "content": JUDGE_SYSTEM},
            {"role": "user", "content": prompt},
        ]
    )
    verdict = _normalize_verdict(result.verdict)
    return {"verdict": verdict, "feedback": (result.feedback or "").strip()}
