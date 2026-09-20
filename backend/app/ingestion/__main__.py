"""`python -m app.ingestion`: rebuild the knowledge base from the configured source directory."""

import sys
import time

from app.config import get_settings
from app.ingestion.pipeline import IngestionError, run_ingestion


def main() -> int:
    started = time.monotonic()
    try:
        status = run_ingestion(get_settings())
    except IngestionError as exc:
        print(f"ingestion failed: {exc}", file=sys.stderr)
        return 1
    if status.status == "failed":
        print(f"ingestion failed: {status.error}", file=sys.stderr)
        return 1
    print(
        f"ingested {status.document_count} documents into {status.chunk_count} chunks "
        f"in {time.monotonic() - started:.1f}s"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
