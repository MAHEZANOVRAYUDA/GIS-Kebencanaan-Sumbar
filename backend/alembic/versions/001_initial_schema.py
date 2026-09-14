"""Initial PostGIS schema and materialized view

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-13 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import geoalchemy2

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Pastikan ekstensi PostGIS aktif
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis_topology;")

    # 2. Tabel wilayah_administratif
    op.create_table(
        'wilayah_administratif',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('kode_wilayah', sa.String(length=20), nullable=False),
        sa.Column('nama', sa.String(length=150), nullable=False),
        sa.Column('level', sa.String(length=20), nullable=False),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('populasi', sa.Integer(), nullable=True),
        sa.Column('geom', geoalchemy2.types.Geometry(geometry_type='MULTIPOLYGON', srid=4326, spatial_index=False), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.CheckConstraint("level IN ('provinsi', 'kabupaten', 'kecamatan', 'nagari')", name='check_wilayah_level'),
        sa.ForeignKeyConstraint(['parent_id'], ['wilayah_administratif.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('kode_wilayah')
    )
    op.create_index('idx_wilayah_parent', 'wilayah_administratif', ['parent_id'], unique=False)
    op.create_index('idx_wilayah_level', 'wilayah_administratif', ['level'], unique=False)
    op.create_index('idx_wilayah_geom', 'wilayah_administratif', ['geom'], unique=False, postgresql_using='gist')

    # 3. Tabel pengguna
    op.create_table(
        'pengguna',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nama', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=150), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('wilayah_tugas_id', sa.Integer(), nullable=True),
        sa.Column('aktif', sa.Boolean(), server_default='true', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.CheckConstraint("role IN ('operator', 'admin', 'pimpinan')", name='check_pengguna_role'),
        sa.ForeignKeyConstraint(['wilayah_tugas_id'], ['wilayah_administratif.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )

    # 4. Tabel kejadian_bencana
    op.create_table(
        'kejadian_bencana',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('jenis_bencana', sa.String(length=30), nullable=False),
        sa.Column('tanggal_kejadian', sa.DateTime(timezone=True), nullable=False),
        sa.Column('wilayah_id', sa.Integer(), nullable=True),
        sa.Column('lokasi', geoalchemy2.types.Geometry(geometry_type='POINT', srid=4326, spatial_index=False), nullable=True),
        sa.Column('deskripsi', sa.Text(), nullable=True),
        sa.Column('sumber_data', sa.String(length=50), server_default='operator_bpbd', nullable=True),
        sa.Column('status_verifikasi', sa.String(length=20), server_default='terverifikasi', nullable=True),
        sa.Column('dibuat_oleh', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.CheckConstraint("jenis_bencana IN ('gempa','tsunami','banjir','longsor','erupsi','angin_puting_beliung','kebakaran','lainnya')", name='check_jenis_bencana'),
        sa.CheckConstraint("status_verifikasi IN ('terverifikasi','menunggu','ditolak')", name='check_status_verifikasi'),
        sa.ForeignKeyConstraint(['dibuat_oleh'], ['pengguna.id'], ),
        sa.ForeignKeyConstraint(['wilayah_id'], ['wilayah_administratif.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_kejadian_wilayah', 'kejadian_bencana', ['wilayah_id'], unique=False)
    op.create_index('idx_kejadian_tanggal', 'kejadian_bencana', [sa.text('tanggal_kejadian DESC')], unique=False)
    op.create_index('idx_kejadian_jenis', 'kejadian_bencana', ['jenis_bencana'], unique=False)
    op.create_index('idx_kejadian_lokasi', 'kejadian_bencana', ['lokasi'], unique=False, postgresql_using='gist')

    # 5. Tabel data_dampak_bencana
    op.create_table(
        'data_dampak_bencana',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('kejadian_id', sa.Integer(), nullable=True),
        sa.Column('wilayah_id', sa.Integer(), nullable=False),
        sa.Column('korban_meninggal', sa.Integer(), server_default='0', nullable=True),
        sa.Column('korban_hilang', sa.Integer(), server_default='0', nullable=True),
        sa.Column('korban_luka', sa.Integer(), server_default='0', nullable=True),
        sa.Column('jumlah_pengungsi', sa.Integer(), server_default='0', nullable=True),
        sa.Column('kerugian_rp', sa.Numeric(precision=18, scale=2), server_default='0', nullable=True),
        sa.Column('rumah_rusak_berat', sa.Integer(), server_default='0', nullable=True),
        sa.Column('rumah_rusak_sedang', sa.Integer(), server_default='0', nullable=True),
        sa.Column('rumah_rusak_ringan', sa.Integer(), server_default='0', nullable=True),
        sa.Column('fasilitas_umum_rusak', sa.Integer(), server_default='0', nullable=True),
        sa.Column('fasilitas_kesehatan_rusak', sa.Integer(), server_default='0', nullable=True),
        sa.Column('sekolah_rusak', sa.Integer(), server_default='0', nullable=True),
        sa.Column('penduduk_terdampak', sa.Integer(), server_default='0', nullable=True),
        sa.Column('catatan', sa.Text(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['kejadian_id'], ['kejadian_bencana.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['wilayah_id'], ['wilayah_administratif.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_dampak_kejadian', 'data_dampak_bencana', ['kejadian_id'], unique=False)
    op.create_index('idx_dampak_wilayah', 'data_dampak_bencana', ['wilayah_id'], unique=False)

    # 6. Tabel posko_evakuasi
    op.create_table(
        'posko_evakuasi',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nama', sa.String(length=150), nullable=False),
        sa.Column('jenis', sa.String(length=30), nullable=True),
        sa.Column('lokasi', geoalchemy2.types.Geometry(geometry_type='POINT', srid=4326, spatial_index=False), nullable=False),
        sa.Column('kapasitas', sa.Integer(), nullable=True),
        sa.Column('fasilitas', postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column('kontak_pic', sa.String(length=100), nullable=True),
        sa.Column('kontak_telepon', sa.String(length=30), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='aktif', nullable=True),
        sa.Column('wilayah_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.CheckConstraint("jenis IN ('posko_utama','titik_kumpul','shelter_sementara','fasilitas_kesehatan')", name='check_posko_jenis'),
        sa.CheckConstraint("status IN ('aktif','penuh','nonaktif')", name='check_posko_status'),
        sa.ForeignKeyConstraint(['wilayah_id'], ['wilayah_administratif.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_posko_lokasi', 'posko_evakuasi', ['lokasi'], unique=False, postgresql_using='gist')
    op.create_index('idx_posko_status', 'posko_evakuasi', ['status'], unique=False)

    # 7. Tabel jalan_terputus
    op.create_table(
        'jalan_terputus',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('geom', geoalchemy2.types.Geometry(geometry_type='LINESTRING', srid=4326, spatial_index=False), nullable=False),
        sa.Column('alasan', sa.String(length=30), nullable=True),
        sa.Column('deskripsi', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='aktif', nullable=True),
        sa.Column('dilaporkan_oleh', sa.Integer(), nullable=True),
        sa.Column('tanggal_lapor', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('tanggal_pulih', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("alasan IN ('longsor','banjir','jembatan_putus','kerusakan_jalan','lainnya')", name='check_jalan_alasan'),
        sa.CheckConstraint("status IN ('aktif','sebagian','pulih')", name='check_jalan_status'),
        sa.ForeignKeyConstraint(['dilaporkan_oleh'], ['pengguna.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_jalan_terputus_geom', 'jalan_terputus', ['geom'], unique=False, postgresql_using='gist')
    op.execute("CREATE INDEX idx_jalan_terputus_status ON jalan_terputus (status) WHERE status = 'aktif';")

    # 8. Tabel gempa_bmkg
    op.create_table(
        'gempa_bmkg',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('external_id', sa.String(length=50), nullable=True),
        sa.Column('magnitude', sa.Numeric(precision=3, scale=1), nullable=True),
        sa.Column('kedalaman_km', sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column('lokasi', geoalchemy2.types.Geometry(geometry_type='POINT', srid=4326, spatial_index=False), nullable=True),
        sa.Column('wilayah_teks', sa.String(length=200), nullable=True),
        sa.Column('waktu_kejadian', sa.DateTime(timezone=True), nullable=True),
        sa.Column('potensi_tsunami', sa.Boolean(), server_default='false', nullable=True),
        sa.Column('dirasakan', sa.Boolean(), server_default='false', nullable=True),
        sa.Column('synced_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('external_id')
    )
    op.create_index('idx_gempa_lokasi', 'gempa_bmkg', ['lokasi'], unique=False, postgresql_using='gist')
    op.create_index('idx_gempa_waktu', 'gempa_bmkg', [sa.text('waktu_kejadian DESC')], unique=False)

    # 9. Tabel audit_log
    op.create_table(
        'audit_log',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('pengguna_id', sa.Integer(), nullable=True),
        sa.Column('aksi', sa.String(length=50), nullable=False),
        sa.Column('tabel_target', sa.String(length=50), nullable=True),
        sa.Column('record_id', sa.Integer(), nullable=True),
        sa.Column('detail', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('ip_address', postgresql.INET(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['pengguna_id'], ['pengguna.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # 10. Materialized View mv_dampak_per_kecamatan & Unique Index
    op.execute("""
    CREATE MATERIALIZED VIEW mv_dampak_per_kecamatan AS
    SELECT w.id AS wilayah_id, w.nama,
           COALESCE(SUM(d.kerugian_rp), 0) AS total_kerugian,
           COALESCE(SUM(d.korban_meninggal), 0) AS total_meninggal,
           COALESCE(SUM(d.korban_luka), 0) AS total_luka,
           COALESCE(SUM(d.penduduk_terdampak), 0) AS total_terdampak,
           COUNT(DISTINCT k.id) AS jumlah_kejadian,
           now() AS terakhir_refresh
    FROM wilayah_administratif w
    LEFT JOIN kejadian_bencana k ON k.wilayah_id = w.id
    LEFT JOIN data_dampak_bencana d ON d.kejadian_id = k.id
    WHERE w.level = 'kecamatan'
    GROUP BY w.id, w.nama;
    """)
    op.execute("CREATE UNIQUE INDEX idx_mv_dampak_wilayah_id ON mv_dampak_per_kecamatan (wilayah_id);")


def downgrade() -> None:
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mv_dampak_per_kecamatan;")
    op.drop_table('audit_log')
    op.drop_table('gempa_bmkg')
    op.drop_table('jalan_terputus')
    op.drop_table('posko_evakuasi')
    op.drop_table('data_dampak_bencana')
    op.drop_table('kejadian_bencana')
    op.drop_table('pengguna')
    op.drop_table('wilayah_administratif')
