"""Create cascading wilayah tables (provinsi, kota, kecamatan) and update posko_evakuasi

Revision ID: 004_cascading_wilayah
Revises: 003_zonasi_tsunami_posko
Create Date: 2026-09-17 16:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '004_cascading_wilayah'
down_revision: Union[str, None] = '003_zonasi_tsunami_posko'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Tabel Provinsi
    op.create_table(
        'provinsi',
        sa.Column('id', sa.String(length=10), nullable=False),
        sa.Column('nama', sa.String(length=150), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # 2. Tabel Kota / Kabupaten (relasi 1-to-many dari Provinsi)
    op.create_table(
        'kota',
        sa.Column('id', sa.String(length=10), nullable=False),
        sa.Column('id_provinsi', sa.String(length=10), nullable=False),
        sa.Column('nama', sa.String(length=150), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['id_provinsi'], ['provinsi.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_kota_id_provinsi', 'kota', ['id_provinsi'], unique=False)
    op.create_index('idx_kota_nama', 'kota', ['nama'], unique=False)

    # 3. Tabel Kecamatan (relasi 1-to-many dari Kota)
    op.create_table(
        'kecamatan',
        sa.Column('id', sa.String(length=10), nullable=False),
        sa.Column('id_kota', sa.String(length=10), nullable=False),
        sa.Column('nama', sa.String(length=150), nullable=False),
        sa.Column('wilayah_administratif_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['id_kota'], ['kota.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['wilayah_administratif_id'], ['wilayah_administratif.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_kecamatan_id_kota', 'kecamatan', ['id_kota'], unique=False)
    op.create_index('idx_kecamatan_nama', 'kecamatan', ['nama'], unique=False)
    op.create_index('idx_kecamatan_wilayah_admin', 'kecamatan', ['wilayah_administratif_id'], unique=False)

    # 4. Tambah foreign key id_kecamatan pada posko_evakuasi
    op.add_column('posko_evakuasi', sa.Column('id_kecamatan', sa.String(length=10), nullable=True))
    op.create_foreign_key(
        'fk_posko_id_kecamatan',
        'posko_evakuasi',
        'kecamatan',
        ['id_kecamatan'],
        ['id'],
        ondelete='SET NULL'
    )
    op.create_index('idx_posko_id_kecamatan', 'posko_evakuasi', ['id_kecamatan'], unique=False)


def downgrade() -> None:
    op.drop_index('idx_posko_id_kecamatan', table_name='posko_evakuasi')
    op.drop_constraint('fk_posko_id_kecamatan', 'posko_evakuasi', type_='foreignkey')
    op.drop_column('posko_evakuasi', 'id_kecamatan')

    op.drop_index('idx_kecamatan_wilayah_admin', table_name='kecamatan')
    op.drop_index('idx_kecamatan_nama', table_name='kecamatan')
    op.drop_index('idx_kecamatan_id_kota', table_name='kecamatan')
    op.drop_table('kecamatan')

    op.drop_index('idx_kota_nama', table_name='kota')
    op.drop_index('idx_kota_id_provinsi', table_name='kota')
    op.drop_table('kota')

    op.drop_table('provinsi')
