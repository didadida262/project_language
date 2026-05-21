from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph

from agent.nodes import SYSTEM_PROMPT, create_chat_node
from agent.schema import ChatMessage, ChatState


def build_messages(user_message: str, history: list[ChatMessage]) -> list:
    messages: list = [SystemMessage(content=SYSTEM_PROMPT)]
    for item in history:
        if item.role == "user":
            messages.append(HumanMessage(content=item.content))
        elif item.role == "assistant":
            messages.append(AIMessage(content=item.content))
    messages.append(HumanMessage(content=user_message))
    return messages


def run_chat(
    message: str,
    history: list[ChatMessage],
    base_url: str,
    api_key: str,
    model: str,
) -> str:
    workflow = StateGraph(ChatState)
    workflow.add_node("chat", create_chat_node(base_url, api_key, model))
    workflow.set_entry_point("chat")
    workflow.add_edge("chat", END)
    app = workflow.compile()

    result = app.invoke(
        {
            "messages": build_messages(message, history),
            "reply": "",
        }
    )
    return result.get("reply", "")
