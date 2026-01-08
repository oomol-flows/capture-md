#region generated meta
import typing
from oocana import LLMModelOptions
class Inputs(typing.TypedDict):
    content: str
    add_emojis: bool | None
    use_dividers: bool | None
    highlight_keywords: bool | None
    llm: LLMModelOptions
class Outputs(typing.TypedDict):
    formatted_markdown: typing.NotRequired[str]
#endregion

from oocana import Context
from openai import OpenAI


async def main(params: Inputs, context: Context) -> Outputs:
    """
    Format text content into Xiaohongshu-style markdown.
    Uses LLM to create engaging, emoji-rich content with visual appeal.
    """
    content = params["content"]
    if not content or not content.strip():
        raise ValueError("Content parameter is required and cannot be empty")

    # Get style options with smart defaults
    add_emojis = params.get("add_emojis")
    if add_emojis is None:
        add_emojis = True

    use_dividers = params.get("use_dividers")
    if use_dividers is None:
        use_dividers = True

    highlight_keywords = params.get("highlight_keywords")
    if highlight_keywords is None:
        highlight_keywords = True

    llm = params["llm"]

    # Build formatting instructions
    style_instructions = []

    if add_emojis:
        style_instructions.append("- Add relevant emojis (🌟✨💡📝🎯💪👀🔥) to make content more engaging")

    if use_dividers:
        style_instructions.append("- Use decorative dividers like '---' or '═══' between major sections")

    if highlight_keywords:
        style_instructions.append("- Highlight important keywords using **bold** or `code style`")

    style_instructions_text = "\n".join(style_instructions) if style_instructions else "- Keep formatting simple and clean"

    # Create prompt for LLM
    system_prompt = """You are a Xiaohongshu (小红书) content formatting expert. Transform input text into visually appealing markdown format suitable for Xiaohongshu posts.

Xiaohongshu style characteristics:
- Short, punchy paragraphs (1-3 sentences max)
- Lots of emojis for visual appeal
- Clear section headers with emojis
- Bullet points and numbered lists for easy reading
- Highlight key information
- Use spacing and dividers strategically
- Engaging and conversational tone
- Call-to-action elements (questions, invitations to interact)

Format the content to be eye-catching and easily scannable."""

    user_prompt = f"""Please format the following content into Xiaohongshu style markdown:

{content}

Style requirements:
{style_instructions_text}

Additional guidelines:
- Use markdown headers (##, ###) with emojis
- Break long paragraphs into shorter ones
- Add visual breaks and white space
- Make it mobile-friendly (Xiaohongshu is primarily mobile)
- Keep the core message but enhance presentation
- Output ONLY the formatted markdown, no explanations

Return the formatted markdown content directly."""

    # Initialize OpenAI client with OOMOL credentials
    client = OpenAI(
        base_url=context.oomol_llm_env.get("base_url_v1"),
        api_key=await context.oomol_token(),
    )

    # Call LLM to format content
    context.report_progress(30)

    max_tokens = llm.get("max_tokens", 4096)
    use_stream = max_tokens > 4096

    if use_stream:
        # Use streaming for large max_tokens
        stream = client.chat.completions.create(
            model=llm.get("model", "oomol-chat"),
            temperature=llm.get("temperature", 0.7),
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            stream=True
        )

        # Collect streamed response
        formatted_content = ""
        for chunk in stream:
            if chunk.choices[0].delta.content:
                formatted_content += chunk.choices[0].delta.content

        context.report_progress(80)
    else:
        # Use non-streaming for small max_tokens
        response = client.chat.completions.create(
            model=llm.get("model", "oomol-chat"),
            temperature=llm.get("temperature", 0.7),
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
        )

        context.report_progress(80)
        formatted_content = response.choices[0].message.content

    if not formatted_content or not formatted_content.strip():
        raise ValueError("LLM returned empty formatted content")

    context.report_progress(100)

    return {"formatted_markdown": formatted_content.strip()}
