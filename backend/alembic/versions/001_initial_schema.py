"""Initial schema: users, images, templates, renders, payments

Revision ID: 001_initial
Revises: None
Create Date: 2026-03-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # === 1. users table ===
    op.create_table(
        "users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("full_name", sa.Text(), nullable=True),
        sa.Column(
            "plan", sa.Text(), nullable=False, server_default="free"
        ),
        sa.Column(
            "credits_remaining",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("3"),
        ),
        sa.Column(
            "credits_reset_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now() + interval '30 days'"),
        ),
        sa.Column(
            "subscription_expires_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "subscription_yookassa_id", sa.Text(), nullable=True
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.CheckConstraint(
            "plan IN ('free', 'starter', 'business')",
            name="ck_users_plan_check",
        ),
    )
    op.create_index("idx_users_email", "users", ["email"])

    # === 2. images table ===
    op.create_table(
        "images",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("original_url", sa.Text(), nullable=False),
        sa.Column("original_filename", sa.Text(), nullable=False),
        sa.Column("original_size", sa.Integer(), nullable=False),
        sa.Column("original_width", sa.Integer(), nullable=False),
        sa.Column("original_height", sa.Integer(), nullable=False),
        sa.Column("processed_url", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.Text(),
            nullable=False,
            server_default="uploaded",
        ),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("processing_time_ms", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id", name="pk_images"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_images_user_id_users",
            ondelete="CASCADE",
        ),
        sa.CheckConstraint(
            "status IN ('uploaded', 'processing', 'processed', 'failed')",
            name="ck_images_status_check",
        ),
    )
    op.create_index("idx_images_user_id", "images", ["user_id"])
    op.create_index("idx_images_status", "images", ["status"])

    # === 3. templates table ===
    op.create_table(
        "templates",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("slug", sa.Text(), nullable=False),
        sa.Column("category", sa.Text(), nullable=False),
        sa.Column("preview_url", sa.Text(), nullable=False),
        sa.Column("config", postgresql.JSONB(), nullable=False),
        sa.Column(
            "marketplace",
            postgresql.ARRAY(sa.String()),
            nullable=False,
            server_default=sa.text("'{wb,ozon}'"),
        ),
        sa.Column(
            "is_premium",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "sort_order",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id", name="pk_templates"),
        sa.UniqueConstraint("slug", name="uq_templates_slug"),
        sa.CheckConstraint(
            "category IN ('white_bg', 'infographic', 'lifestyle', 'collage')",
            name="ck_templates_category_check",
        ),
    )
    op.create_index("idx_templates_category", "templates", ["category"])

    # === 4. renders table ===
    op.create_table(
        "renders",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "image_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "template_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("overlay_data", postgresql.JSONB(), nullable=False),
        sa.Column("marketplace", sa.Text(), nullable=False),
        sa.Column("output_url", sa.Text(), nullable=True),
        sa.Column("output_width", sa.Integer(), nullable=False),
        sa.Column("output_height", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id", name="pk_renders"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_renders_user_id_users",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["image_id"],
            ["images.id"],
            name="fk_renders_image_id_images",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["template_id"],
            ["templates.id"],
            name="fk_renders_template_id_templates",
        ),
        sa.CheckConstraint(
            "marketplace IN ('wb', 'ozon', 'ym')",
            name="ck_renders_marketplace_check",
        ),
    )
    op.create_index("idx_renders_user_id", "renders", ["user_id"])

    # === 5. payments table ===
    op.create_table(
        "payments",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "yookassa_payment_id", sa.Text(), unique=True, nullable=True
        ),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("plan", sa.Text(), nullable=True),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column(
            "currency",
            sa.Text(),
            nullable=False,
            server_default="RUB",
        ),
        sa.Column(
            "status",
            sa.Text(),
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "yookassa_confirmation_url", sa.Text(), nullable=True
        ),
        sa.Column(
            "metadata",
            postgresql.JSONB(),
            server_default=sa.text("'{}'"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id", name="pk_payments"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_payments_user_id_users",
            ondelete="CASCADE",
        ),
        sa.CheckConstraint(
            "type IN ('subscription', 'one_time')",
            name="ck_payments_type_check",
        ),
        sa.CheckConstraint(
            "plan IN ('starter', 'business', 'starter_annual', 'business_annual') OR plan IS NULL",
            name="ck_payments_plan_check",
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'waiting_for_capture', 'succeeded', 'canceled', 'refunded')",
            name="ck_payments_status_check",
        ),
    )
    op.create_index("idx_payments_user_id", "payments", ["user_id"])
    op.create_index("idx_payments_status", "payments", ["status"])
    op.create_index(
        "idx_payments_yookassa_id", "payments", ["yookassa_payment_id"]
    )


def downgrade() -> None:
    # Drop tables in reverse FK order
    op.drop_index("idx_payments_yookassa_id", table_name="payments")
    op.drop_index("idx_payments_status", table_name="payments")
    op.drop_index("idx_payments_user_id", table_name="payments")
    op.drop_table("payments")

    op.drop_index("idx_renders_user_id", table_name="renders")
    op.drop_table("renders")

    op.drop_index("idx_templates_category", table_name="templates")
    op.drop_table("templates")

    op.drop_index("idx_images_status", table_name="images")
    op.drop_index("idx_images_user_id", table_name="images")
    op.drop_table("images")

    op.drop_index("idx_users_email", table_name="users")
    op.drop_table("users")
