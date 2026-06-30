import os
from typing import List

from crewai import LLM, Agent, Crew, Process, Task
from crewai.agents.agent_builder.base_agent import BaseAgent
from crewai.project import CrewBase, agent, before_kickoff, crew, task
from dotenv import load_dotenv

from jobscout.tools.job_search_tools import (
    AdzunaSearchTool,
    JobicySearchTool,
    RemotiveSearchTool,
    TheMuseSearchTool,
)
from jobscout.tools.publisher_tool import JobPublisherTool
from jobscout.tools.resume_tool import ResumeParseTool


@CrewBase
class Jobscout:
    """JobScout crew — weekly backend job scouting agent for Nigeria-based engineers."""

    agents: List[BaseAgent]
    tasks: List[Task]

    @before_kickoff
    def load_env(self, inputs):
        load_dotenv()
        return inputs

    @agent
    def resume_parser(self) -> Agent:
        return Agent(
            config=self.agents_config["resume_parser"],  # type: ignore[index]
            tools=[ResumeParseTool()],
            llm=self._llm(),
            verbose=True,
        )

    @agent
    def job_searcher(self) -> Agent:
        return Agent(
            config=self.agents_config["job_searcher"],  # type: ignore[index]
            tools=[
                RemotiveSearchTool(),
                AdzunaSearchTool(),
                TheMuseSearchTool(),
                JobicySearchTool(),
            ],
            llm=self._llm(),
            verbose=True,
        )

    @agent
    def job_matcher(self) -> Agent:
        return Agent(
            config=self.agents_config["job_matcher"],  # type: ignore[index]
            tools=[],
            llm=self._llm(),
            verbose=True,
        )

    @agent
    def job_publisher(self) -> Agent:
        return Agent(
            config=self.agents_config["job_publisher"],  # type: ignore[index]
            tools=[JobPublisherTool()],
            llm=self._llm(),
            verbose=True,
        )

    @task
    def parse_resume_task(self) -> Task:
        return Task(
            config=self.tasks_config["parse_resume_task"],  # type: ignore[index]
        )

    @task
    def search_jobs_task(self) -> Task:
        return Task(
            config=self.tasks_config["search_jobs_task"],  # type: ignore[index]
            context=[self.parse_resume_task()],
        )

    @task
    def match_jobs_task(self) -> Task:
        return Task(
            config=self.tasks_config["match_jobs_task"],  # type: ignore[index]
            context=[self.parse_resume_task(), self.search_jobs_task()],
        )

    @task
    def publish_jobs_task(self) -> Task:
        return Task(
            config=self.tasks_config["publish_jobs_task"],  # type: ignore[index]
            context=[self.match_jobs_task()],
        )

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True,
        )

    def _llm(self) -> LLM:
        model = os.getenv("MODEL", "gpt-4o")
        return LLM(model=f"openai/{model}")
