from langchain_openai import ChatOpenAI

from agent.sanitize import strip_think_content
from agent.schema import ChatState

SYSTEM_PROMPT = (
    "你是「英文词根斩」学习助手，帮助用户理解词根、单词和英语词汇。"
    "回答请简洁清晰，适合学习者阅读。"
)


def create_chat_node(base_url: str, api_key: str, model: str):
    llm = ChatOpenAI(
        model=model,
        api_key=api_key,
        base_url=base_url.rstrip("/"),
    )

    def chat_node(state: ChatState) -> dict:
        response = llm.invoke(state["messages"])
        content = response.content if isinstance(response.content, str) else str(response.content)
        return {"reply": strip_think_content(content)}

    return chat_node
