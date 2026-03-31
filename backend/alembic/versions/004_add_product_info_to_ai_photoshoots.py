"""Add product_info JSONB column to ai_photoshoots table.

Stores product name, features, and badge text for AI generation prompts
and future text overlay editing.

Revision ID: 004
Revises: 003
Create Date: 2026-03-30
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "ai_photoshoots",
        sa.Column("product_info", postgresql.JSONB(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("ai_photoshoots", "product_info")
