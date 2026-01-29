"""
LLM Chat wrapper using litellm for multi-provider support.
Replaces emergentintegrations.llm.chat interface.
"""
from dataclasses import dataclass
from typing import Optional
import litellm


@dataclass
class UserMessage:
    """User message for chat"""
    text: str


class LlmChat:
    """
    LLM Chat interface supporting multiple providers via litellm.

    Supports:
    - Anthropic (Claude)
    - OpenAI (GPT)
    - Google (Gemini)
    """

    # Provider to litellm model prefix mapping
    PROVIDER_PREFIXES = {
        'anthropic': '',  # litellm uses model name directly for anthropic
        'openai': '',     # litellm uses model name directly for openai
        'gemini': 'gemini/',  # litellm prefix for google models
    }

    def __init__(
        self,
        api_key: str,
        session_id: Optional[str] = None,
        system_message: Optional[str] = None
    ):
        self.api_key = api_key
        self.session_id = session_id
        self.system_message = system_message
        self.provider = 'anthropic'
        self.model = 'claude-sonnet-4-5-20250929'
        self.messages = []

        if system_message:
            self.messages.append({
                "role": "system",
                "content": system_message
            })

    def with_model(self, provider: str, model: str) -> 'LlmChat':
        """Set the provider and model to use"""
        self.provider = provider
        self.model = model
        return self

    def _get_litellm_model(self) -> str:
        """Get the litellm model string"""
        prefix = self.PROVIDER_PREFIXES.get(self.provider, '')
        return f"{prefix}{self.model}"

    def _get_api_key_param(self) -> dict:
        """Get the appropriate API key parameter for the provider"""
        if self.provider == 'anthropic':
            return {'api_key': self.api_key}
        elif self.provider == 'openai':
            return {'api_key': self.api_key}
        elif self.provider == 'gemini':
            return {'api_key': self.api_key}
        return {'api_key': self.api_key}

    async def send_message(self, message: UserMessage) -> str:
        """
        Send a message and get a response.

        Args:
            message: UserMessage with text content

        Returns:
            String response from the LLM
        """
        self.messages.append({
            "role": "user",
            "content": message.text
        })

        try:
            response = await litellm.acompletion(
                model=self._get_litellm_model(),
                messages=self.messages,
                **self._get_api_key_param()
            )

            assistant_message = response.choices[0].message.content

            # Add assistant response to history
            self.messages.append({
                "role": "assistant",
                "content": assistant_message
            })

            return assistant_message

        except Exception as e:
            raise Exception(f"LLM request failed: {str(e)}")
