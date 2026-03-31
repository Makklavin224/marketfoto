"""Create ai_photoshoots table for AI product photography generation.

Revision ID: 003
Revises: 002
Create Date: 2026-03-30
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ai_photoshoots",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("image_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("style", sa.String(), nullable=False),
        sa.Column("marketplace", sa.String(), nullable=False),
        sa.Column("output_url", sa.String(), nullable=True),
        sa.Column("output_width", sa.Integer(), nullable=False),
        sa.Column("output_height", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.String(),
            server_default=sa.text("'pending'"),
            nullable=False,
        ),
        sa.Column("error_message", sa.String(), nullable=True),
        sa.Column("processing_time_ms", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "marketplace IN ('wb', 'ozon', 'ym')",
            name="ai_ps_marketplace_check",
        ),
        sa.CheckConstraint(
            "style IN ('studio', 'lifestyle', 'minimal', 'creative', 'infographic')",
            name="ai_ps_style_check",
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'generating', 'complete', 'failed')",
            name="ai_ps_status_check",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["image_id"], ["images.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_ai_photoshoots_user_id", "ai_photoshoots", ["user_id"]
    )


def downgrade() -> None:
    op.drop_index("idx_ai_photoshoots_user_id", table_name="ai_photoshoots")
    op.drop_table("ai_photoshoots")
