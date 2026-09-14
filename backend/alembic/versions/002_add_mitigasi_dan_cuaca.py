"""Add mitigasi categories to posko and create peringatan_cuaca_bmkg table

Revision ID: 002_add_mitigasi_dan_cuaca
Revises: 001_initial_schema
Create Date: 2026-09-14 10:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002_add_mitigasi_dan_cuaca'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update check_posko_jenis constraint
    op.drop_constraint('check_posko_jenis', 'posko_evakuasi', type_='check')
    op.create_check_constraint(
        'check_posko_jenis',
        'posko_evakuasi',
        "jenis IN ('posko_utama', 'titik_kumpul', 'shelter_sementara', 'fasilitas_kesehatan', 'shelter_tes_tea', 'sirine_tsunami')"
    )

    # 2. Create peringatan_cuaca_bmkg table
    op.create_table(
        'peringatan_cuaca_bmkg',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('identifier', sa.String(length=120), nullable=False),
        sa.Column('event', sa.String(length=100), nullable=False),
        sa.Column('headline', sa.String(length=255), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('severity', sa.String(length=30), nullable=True),
        sa.Column('urgency', sa.String(length=30), nullable=True),
        sa.Column('certainty', sa.String(length=30), nullable=True),
        sa.Column('effective', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires', sa.DateTime(timezone=True), nullable=True),
        sa.Column('area_desc', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('identifier')
    )
    op.create_index('idx_cuaca_expires', 'peringatan_cuaca_bmkg', ['expires'], unique=False)
    op.create_index('idx_cuaca_severity', 'peringatan_cuaca_bmkg', ['severity'], unique=False)


def downgrade() -> None:
    op.drop_index('idx_cuaca_severity', table_name='peringatan_cuaca_bmkg')
    op.drop_index('idx_cuaca_expires', table_name='peringatan_cuaca_bmkg')
    op.drop_table('peringatan_cuaca_bmkg')

    op.drop_constraint('check_posko_jenis', 'posko_evakuasi', type_='check')
    op.create_check_constraint(
        'check_posko_jenis',
        'posko_evakuasi',
        "jenis IN ('posko_utama', 'titik_kumpul', 'shelter_sementara', 'fasilitas_kesehatan')"
    )
