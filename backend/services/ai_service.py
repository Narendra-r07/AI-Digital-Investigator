import os
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()


class AIEngineService:

    def __init__(self):

        self.api_key = os.getenv("OPENAI_API_KEY")

        # Current OpenAI model name
        self.model = os.getenv(
            "OPENAI_MODEL",
            "gpt-5.6-luna"
        )

        self.client = None

        if self.api_key:
            self.client = OpenAI(
                api_key=self.api_key
            )

    # =========================================================
    # CHECK AI
    # =========================================================

    def is_available(self) -> bool:
        return self.client is not None

    # =========================================================
    # CHAT
    # =========================================================

    def chat(
        self,
        question: str,
        evidence_context: str = "",
        conversation: Optional[
            List[Dict[str, str]]
        ] = None,
    ) -> Dict[str, Any]:

        if not self.client:

            raise RuntimeError(
                "OPENAI_API_KEY is missing. "
                "Add it to your .env file."
            )

        question = question.strip()

        if not question:

            raise ValueError(
                "Question cannot be empty."
            )

        conversation = conversation or []

        # -----------------------------------------------------
        # Build conversation history
        # -----------------------------------------------------

        history = ""

        for message in conversation[-12:]:

            role = message.get(
                "role",
                "user"
            )

            content = message.get(
                "content",
                ""
            )

            if not content:
                continue

            history += (
                f"\n{role.upper()}: "
                f"{content}\n"
            )

        # -----------------------------------------------------
        # Evidence
        # -----------------------------------------------------

        if not evidence_context.strip():

            evidence_context = (
                "No evidence was retrieved for this question."
            )

        # -----------------------------------------------------
        # Investigator instructions
        # -----------------------------------------------------

        instructions = """
You are AI Digital Investigator.

You are an advanced conversational AI assistant
specialized in digital investigation and evidence analysis.

Your job is to communicate naturally like a modern AI
assistant while remaining grounded in the evidence supplied
by the application.

CORE BEHAVIOR:

- Answer the investigator's actual question.
- Do not simply return search results.
- Explain your reasoning clearly.
- Use evidence whenever it is available.
- Never invent evidence.
- Never claim something is proven when the evidence only
  suggests it.
- Clearly distinguish:
  FACT
  INFERENCE
  UNKNOWN

INVESTIGATION TASKS:

You can help with:

- Evidence summaries
- People mentioned in evidence
- Dates and timelines
- Locations
- Organizations
- Events
- Relationships between people
- Suspicious patterns
- Important clues
- Contradictions
- Chronological reconstruction
- Questions about uploaded documents
- Comparing pieces of evidence
- Identifying missing information
- Suggesting useful investigative follow-up questions

CONVERSATION:

Remember the recent conversation supplied by the application.

If the user says:

"yes"
"explain that"
"who is he?"
"what about the second file?"
"continue"

use the conversation context to understand what they mean.

STYLE:

Be professional, intelligent and concise.

Use headings and bullet points when useful.

Do not repeatedly say:
"I am an AI language model."

If there is no evidence, still answer general questions
normally, but clearly state when the answer is not based
on investigation evidence.

When discussing evidence, mention filenames when possible.

Never fabricate filenames, people, dates, locations,
relationships or facts.
"""

        # -----------------------------------------------------
        # Prompt
        # -----------------------------------------------------

        prompt = f"""
CURRENT EVIDENCE
================

{evidence_context}


RECENT CONVERSATION
===================

{history}


CURRENT INVESTIGATOR QUESTION
=============================

{question}


Now answer the investigator naturally.
"""

        # -----------------------------------------------------
        # OpenAI Responses API
        # -----------------------------------------------------

        response = self.client.responses.create(
            model=self.model,
            instructions=instructions,
            input=prompt,
        )

        answer = (
            response.output_text
            if response.output_text
            else "I could not generate a response."
        )

        return {
            "success": True,
            "answer": answer.strip(),
            "model": self.model,
        }

    # =========================================================
    # OLD ANALYSIS SUPPORT
    # =========================================================

    def analyze_text(
        self,
        text: str,
        filename: str = "",
    ) -> Dict[str, Any]:

        if not text:

            return {
                "status": "completed",
                "summary": "No extractable text was found.",
                "filename": filename,
                "entities": [],
                "keywords": [],
            }

        cleaned = text.strip()

        return {
            "status": "completed",
            "summary": self._create_summary(cleaned),
            "filename": filename,
            "entities": [],
            "keywords": self._extract_keywords(cleaned),
            "text_length": len(cleaned),
        }

    # =========================================================
    # SIMPLE SEARCH SUPPORT
    # =========================================================

    def search(
        self,
        query: str,
        documents: Optional[
            List[Dict[str, Any]]
        ] = None,
    ) -> Dict[str, Any]:

        documents = documents or []

        query_lower = query.lower().strip()

        if not query_lower:

            return {
                "query": query,
                "results": [],
            }

        results = []

        for document in documents:

            text = str(
                document.get(
                    "extracted_text"
                )
                or document.get(
                    "text"
                )
                or ""
            )

            if query_lower in text.lower():

                results.append(
                    document
                )

        return {
            "query": query,
            "results": results,
        }

    # =========================================================
    # SUMMARY
    # =========================================================

    @staticmethod
    def _create_summary(
        text: str
    ) -> str:

        words = text.split()

        if len(words) <= 60:
            return text

        return (
            " ".join(words[:60])
            + "..."
        )

    # =========================================================
    # KEYWORDS
    # =========================================================

    @staticmethod
    def _extract_keywords(
        text: str
    ) -> List[str]:

        words = (
            text
            .replace("\n", " ")
            .split()
        )

        unique = []
        seen = set()

        for word in words:

            cleaned = word.strip(
                ".,!?;:()[]{}\"'`"
            )

            if len(cleaned) < 4:
                continue

            key = cleaned.lower()

            if key not in seen:

                seen.add(key)
                unique.append(cleaned)

            if len(unique) >= 15:
                break

        return unique