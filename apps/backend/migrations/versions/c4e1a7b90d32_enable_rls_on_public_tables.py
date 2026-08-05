"""Enable RLS on public tables

Enables row-level security on every table the anon key can reach, with no
policies attached. RLS enabled + zero policies denies the `anon` and
`authenticated` roles everything, while the backend is unaffected because it
connects over DATABASE_URL as the table owner, and owners bypass RLS.

This is deliberate: the frontend uses Supabase for auth only (no .from()/.rpc()
calls anywhere), so all table access already goes through FastAPI. Adding
permissive policies would re-grant the anon key a data path nothing uses.

Revision ID: c4e1a7b90d32
Revises: ae23363e3a0c
Create Date: 2026-07-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4e1a7b90d32'
down_revision: Union[str, Sequence[str], None] = 'ae23363e3a0c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TABLES = ("users", "games", "game_analysis", "coin_transactions")


def upgrade() -> None:
    """Upgrade schema."""
    # RLS is Postgres-only; the test suite runs on SQLite (see conftest.py).
    if op.get_bind().dialect.name != "postgresql":
        return
    for table in TABLES:
        op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    """Downgrade schema."""
    if op.get_bind().dialect.name != "postgresql":
        return
    for table in TABLES:
        op.execute(f"ALTER TABLE public.{table} DISABLE ROW LEVEL SECURITY")
