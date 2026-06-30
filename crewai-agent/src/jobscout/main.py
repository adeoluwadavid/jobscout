#!/usr/bin/env python
import sys
import warnings

warnings.filterwarnings("ignore", category=SyntaxWarning, module="pysbd")

from jobscout.crew import Jobscout


def run():
    """
    Entry point for the JobScout crew.
    Called by GitHub Actions on schedule and by the `jobscout` CLI command locally.
    Exits with code 1 on failure so GitHub Actions marks the run as failed.
    """
    print("JobScout — starting weekly job search run...")

    try:
        result = Jobscout().crew().kickoff()
        print("\nRun completed successfully.")
        print(result.raw)
        sys.exit(0)
    except Exception as e:
        print(f"\nRun failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    run()
