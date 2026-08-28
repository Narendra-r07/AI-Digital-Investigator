import os
import re
import json
from typing import Any, Dict, List
from dotenv import load_dotenv

load_dotenv(override=True)


class AIEngineService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY", "").strip()
        model_env = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
        
        # Sanitize non-standard model names
        if not model_env or "gpt-5" in model_env or "luna" in model_env:
            self.model = "gpt-4o-mini"
        else:
            self.model = model_env

        self.client = None

        if self.api_key:
            try:
                from openai import OpenAI
                self.client = OpenAI(api_key=self.api_key)
            except Exception as exc:
                print(f"Warning: Could not initialize OpenAI client: {exc}")

    def is_available(self) -> bool:
        return bool(self.client and self.api_key)

    def chat(
        self,
        question: str,
        evidence_context: str = "",
        conversation: List[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Execute AI forensic chat using OpenAI chat completions API.
        """
        system_prompt = """You are AI Digital Investigator, an elite digital forensics & intelligence assistant.
Your task is to analyze uploaded case evidence, extract facts, identify key entities, construct event timelines, and uncover contradictions or suspicious patterns.

RULES:
1. Always prioritize exact facts present in the provided EVIDENCE CONTEXT.
2. Cite specific filenames, line numbers, or section details when quoting facts.
3. Clearly separate proven facts from logical inferences.
4. If evidence is insufficient to answer a question, explicitly state what is missing.
5. Format your answers clearly using markdown headings, bullet points, and code/quote blocks."""

        user_content = f"### CASE EVIDENCE CONTEXT:\n{evidence_context or 'No specific evidence retrieved.'}\n\n### USER QUESTION:\n{question}"

        if self.is_available():
            messages = [{"role": "system", "content": system_prompt}]
            if conversation:
                for msg in conversation:
                    role = msg.get("role", "user")
                    if role in ["user", "assistant", "system"]:
                        messages.append({"role": role, "content": msg.get("content", "")})

            messages.append({"role": "user", "content": user_content})

            # Attempt model call with automatic fallback retry if model name fails
            for target_model in [self.model, "gpt-4o-mini", "gpt-3.5-turbo"]:
                try:
                    response = self.client.chat.completions.create(
                        model=target_model,
                        messages=messages,
                        temperature=0.2,
                        max_tokens=1500,
                    )
                    answer = response.choices[0].message.content
                    return {
                        "answer": answer,
                        "model": target_model,
                    }
                except Exception as error:
                    print(f"OpenAI call with model '{target_model}' failed: {error}")

        # Fallback local forensic summary if API key is missing or failed
        fallback_answer = self._generate_local_analysis(question, evidence_context)
        return {
            "answer": fallback_answer,
            "model": "Local Forensic Engine (Fallback)",
        }

    def answer(self, question: str, evidence: list[dict]) -> str:
        """
        Backwards-compatible wrapper for single query evidence analysis.
        """
        evidence_parts = []
        for item in evidence:
            filename = item.get("filename", "Unknown")
            text = item.get("text", "")
            if text:
                evidence_parts.append(f"===== EVIDENCE FILE: {filename} =====\n{text[:25000]}\n===== END FILE =====")

        context = "\n".join(evidence_parts) if evidence_parts else "No readable evidence files."
        res = self.chat(question, context)
        return res["answer"]

    def extract_timeline(self, text: str) -> List[Dict[str, str]]:
        """
        Extract chronological events, dates, and associated actions from evidence text.
        """
        events = []
        if self.is_available() and text.strip():
            try:
                prompt = f"Extract all key dates, timestamps, and chronological events from the following forensic evidence text. Format output as a JSON array of objects with keys 'date', 'event', 'source', 'significance'.\n\nTEXT:\n{text[:10000]}"
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "You are a JSON date/timeline extractor. Return ONLY valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.1,
                )
                raw_json = response.choices[0].message.content
                clean_json = re.sub(r"```(?:json)?|```", "", raw_json).strip()
                parsed = json.loads(clean_json)
                if isinstance(parsed, list):
                    return parsed
            except Exception as e:
                print(f"AI timeline extraction failed: {e}")

        # Fallback regex timeline parser
        date_patterns = [
            r"(\b\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}:\d{2})?\b)",
            r"(\b\d{1,2}/\d{1,2}/\d{2,4}\b)",
            r"(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b)"
        ]
        lines = text.split("\n")
        for index, line in enumerate(lines):
            line_str = line.strip()
            if not line_str:
                continue
            for pat in date_patterns:
                match = re.search(pat, line_str, re.IGNORECASE)
                if match:
                    events.append({
                        "date": match.group(1),
                        "event": line_str,
                        "source": f"Line {index+1}",
                        "significance": "Automated log timestamp detection"
                    })
                    break
            if len(events) >= 15:
                break

        return events

    def extract_entities(self, text: str) -> Dict[str, List[str]]:
        """
        Extract named entities: People, Organizations, IP Addresses, Emails, Dates.
        """
        entities = {
            "people": [],
            "organizations": [],
            "ips": [],
            "emails": [],
            "dates": []
        }

        # Regex extractions
        ip_pattern = r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b"
        email_pattern = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"

        entities["ips"] = list(set(re.findall(ip_pattern, text)))
        entities["emails"] = list(set(re.findall(email_pattern, text)))

        if self.is_available() and text.strip():
            try:
                prompt = f"Extract key entities from this forensic evidence text. Return JSON with keys 'people', 'organizations', 'dates'.\n\nTEXT:\n{text[:8000]}"
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "You are a JSON entity extractor. Return ONLY valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.1,
                )
                raw_json = response.choices[0].message.content
                clean_json = re.sub(r"```(?:json)?|```", "", raw_json).strip()
                ai_extracted = json.loads(clean_json)
                if isinstance(ai_extracted, dict):
                    entities["people"] = ai_extracted.get("people", [])
                    entities["organizations"] = ai_extracted.get("organizations", [])
                    entities["dates"] = ai_extracted.get("dates", [])
            except Exception as e:
                print(f"AI entity extraction failed: {e}")

        return entities

    def _generate_local_analysis(self, question: str, context: str) -> str:
        if not context or "No matching evidence" in context or "No readable evidence" in context:
            return (
                "### Forensic Intelligence Summary\n\n"
                "**Status:** No specific evidence chunks match your prompt.\n\n"
                "**Recommendation:** Upload evidence documents (.pdf, .txt, .docx, .log) to this investigation case."
            )

        return (
            "### Forensic Intelligence Summary (Vector Analysis)\n\n"
            f"**Query Analyzed:** `{question}`\n\n"
            "**Key Findings from Case Evidence:**\n"
            f"{context[:1500]}\n"
        )


# Export standard service instances and backwards compatible class names
ai_service = AIEngineService()
ai_investigator = ai_service
AIInvestigator = AIEngineService