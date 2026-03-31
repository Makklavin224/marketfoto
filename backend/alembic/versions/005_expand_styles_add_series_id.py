"""Expand AI photoshoot styles from 5 to 15 and add series_id column.

- Update style CHECK constraint to include all 15 styles
- Add series_id UUID column (nullable, indexed) for grouping series cards

Revision ID: 005
Revises: 004
Create Date: 2026-03-30
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop old style CHECK constraint and create new one with 15 styles
    op.drop_constraint("ai_ps_style_check", "ai_photoshoots", type_="check")
    op.create_check_constraint(
        "ai_ps_style_check",
        "ai_photoshoots",
        "style IN ('studio_clean', 'premium_hero', 'lifestyle_scene', 'glass_surface', "
        "'ingredients', 'with_model', 'multi_angle', 'infographic', 'nine_grid', "
        "'creative_art', 'storyboard', 'detail_texture', 'seasonal', 'minimal_flat', 'unboxing')",
    )

    # Add series_id column
    op.add_column(
        "ai_photoshoots",
        sa.Column("series_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index(
        "idx_ai_photoshoots_series_id",
        "ai_photoshoots",
        ["series_id"],
    )


def downgrade() -> None:
    op.drop_index("idx_ai_photoshoots_series_id", "ai_photoshoots")
    op.drop_column("ai_photoshoots", "series_id")

    # Restore old CHECK constraint
    op.drop_constraint("ai_ps_style_check", "ai_photoshoots", type_="check")
    op.create_check_constraint(
        "ai_ps_style_check",
        "ai_photoshoots",
        "style IN ('studio', 'lifestyle', 'minimal', 'creative', 'infographic')",
    )
