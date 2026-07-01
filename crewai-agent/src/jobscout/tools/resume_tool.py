import os
from pathlib import Path
from typing import Type

import pdfplumber
from crewai.tools import BaseTool
from pydantic import BaseModel, Field


class ResumeDirInput(BaseModel):
    resume_dir: str = Field(
        default="",
        description=(
            "Leave this empty string ''. The tool automatically reads the resume "
            "directory from the RESUME_DIR environment variable. Do not guess or "
            "construct a path — always pass an empty string."
        )
    )


class ResumeParseTool(BaseTool):
    name: str = "Resume Parser Tool"
    description: str = (
        "Reads the candidate's resume PDF from the configured resume directory "
        "and returns the full text content. Use this to extract skills, experience, "
        "tech stack, and seniority level from the resume."
    )
    args_schema: Type[BaseModel] = ResumeDirInput

    def _run(self, resume_dir: str = "") -> str:
        target_dir = resume_dir or os.getenv("RESUME_DIR", "")

        if not target_dir:
            return "Error: RESUME_DIR environment variable is not set."

        resume_path = Path(target_dir)

        if not resume_path.exists():
            return f"Error: Resume directory not found at {target_dir}"

        pdf_files = list(resume_path.glob("*.pdf"))

        if not pdf_files:
            return f"Error: No PDF files found in {target_dir}"

        pdf_path = pdf_files[0]
        text_content = []

        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_content.append(page_text)
        except Exception as e:
            return f"Error reading PDF {pdf_path.name}: {str(e)}"

        if not text_content:
            return f"Error: Could not extract text from {pdf_path.name}. The PDF may be image-based."

        return f"=== Resume: {pdf_path.name} ===\n\n" + "\n\n".join(text_content)
