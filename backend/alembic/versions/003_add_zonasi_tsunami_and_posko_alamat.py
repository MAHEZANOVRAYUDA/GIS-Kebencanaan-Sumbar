"""Add zonasi_tsunami table and posko_evakuasi alamat column

Revision ID: 003_add_zonasi_tsunami_and_posko_alamat
Revises: 002_add_mitigasi_dan_cuaca
Create Date: 2026-09-17 15:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry

# revision identifiers, used by Alembic.
revision: str = '003_zonasi_tsunami_posko'
down_revision: Union[str, None] = '002_add_mitigasi_dan_cuaca'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Tambahkan kolom alamat ke posko_evakuasi
    op.add_column('posko_evakuasi', sa.Column('alamat', sa.String(length=255), nullable=True))

    # 2. Update check_posko_jenis constraint untuk menyertakan posko_pengungsi
    op.drop_constraint('check_posko_jenis', 'posko_evakuasi', type_='check')
    op.create_check_constraint(
        'check_posko_jenis',
        'posko_evakuasi',
        "jenis IN ('posko_utama', 'posko_pengungsi', 'titik_kumpul', 'shelter_sementara', 'fasilitas_kesehatan', 'shelter_tes_tea', 'sirine_tsunami')"
    )

    # 3. Buat tabel zonasi_tsunami
    op.create_table(
        'zonasi_tsunami',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('wilayah_id', sa.Integer(), nullable=True),
        sa.Column('nama_zona', sa.String(length=150), nullable=False),
        sa.Column('zona', sa.String(length=30), nullable=False),
        sa.Column('tingkat_bahaya', sa.String(length=50), nullable=False),
        sa.Column('kedalaman_rendaman', sa.String(length=100), nullable=True),
        sa.Column('deskripsi', sa.Text(), nullable=True),
        sa.Column('rekomendasi', sa.Text(), nullable=True),
        sa.Column('geom', Geometry(geometry_type='MULTIPOLYGON', srid=4326), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['wilayah_id'], ['wilayah_administratif.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("zona IN ('merah', 'kuning', 'hijau')", name='check_zonasi_warna')
    )
    op.create_index('idx_zonasi_tsunami_wilayah', 'zonasi_tsunami', ['wilayah_id'], unique=False)
    op.create_index('idx_zonasi_tsunami_zona', 'zonasi_tsunami', ['zona'], unique=False)


def downgrade() -> None:
    op.drop_index('idx_zonasi_tsunami_zona', table_name='zonasi_tsunami')
    op.drop_index('idx_zonasi_tsunami_wilayah', table_name='zonasi_tsunami')
    op.drop_table('zonasi_tsunami')

    op.drop_constraint('check_posko_jenis', 'posko_evakuasi', type_='check')
    op.create_check_constraint(
        'check_posko_jenis',
        'posko_evakuasi',
        "jenis IN ('posko_utama', 'titik_kumpul', 'shelter_sementara', 'fasilitas_kesehatan', 'shelter_tes_tea', 'sirine_tsunami')"
    )
    op.drop_column('posko_evakuasi', 'alamat')
