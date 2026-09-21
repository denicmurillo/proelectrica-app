"""esquema inicial

Revision ID: 634a6b56b4eb
Revises:
Create Date: 2026-09-20 17:02:24.229311

Equivale al esquema que hasta ahora creaba `Base.metadata.create_all()` en main.py.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '634a6b56b4eb'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    En producción las tablas YA existen (las creó create_all), por eso cada tabla solo se crea si falta:
    `alembic upgrade head` sirve igual en una BD nueva (crea todo) y en la de producción (solo registra
    la revisión, sin tocar datos). Requiere conexión real: no admite el modo --sql.
    """
    tablas_existentes = sa.inspect(op.get_bind()).get_table_names()

    if 'proyectos' not in tablas_existentes:
        op.create_table('proyectos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('estado', sa.String(), nullable=True),
        sa.Column('empresa_encargada', sa.String(), nullable=True),
        sa.Column('empresa_solicitante', sa.String(), nullable=True),
        sa.Column('correo_solicitante', sa.String(), nullable=True),
        sa.Column('identificador_solicitud', sa.String(), nullable=True),
        sa.Column('datos_dinamicos', sa.JSON(), nullable=True),
        sa.Column('inspector', sa.String(), nullable=True),
        sa.Column('monto_cotizado', sa.String(), nullable=True),
        sa.Column('pago', sa.String(), nullable=True),
        sa.Column('bitacora', sa.JSON(), nullable=True),
        sa.Column('archivos', sa.JSON(), nullable=True),
        sa.Column('titulo_proyecto', sa.String(), nullable=True),
        sa.Column('fecha_programacion', sa.String(), nullable=True),
        sa.Column('fecha_inicio', sa.String(), nullable=True),
        sa.Column('fecha_fin', sa.String(), nullable=True),
        sa.Column('presupuesto_gastos', sa.String(), nullable=True),
        sa.Column('utilidad_esperada', sa.String(), nullable=True),
        sa.Column('salud_proyecto', sa.String(), nullable=True),
        sa.Column('progreso', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_proyectos_empresa_solicitante'), 'proyectos', ['empresa_solicitante'], unique=False)
        op.create_index(op.f('ix_proyectos_id'), 'proyectos', ['id'], unique=False)

    if 'tareas' not in tablas_existentes:
        op.create_table('tareas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('id_proyecto', sa.Integer(), nullable=True),
        sa.Column('descripcion', sa.String(), nullable=False),
        sa.Column('asignado_a', sa.String(), nullable=False),
        sa.Column('asignado_por', sa.String(), nullable=False),
        sa.Column('estado', sa.String(), nullable=True),
        sa.Column('fecha_limite', sa.String(), nullable=True),
        sa.Column('enlace_calendario', sa.String(), nullable=True),
        sa.Column('created_at', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['id_proyecto'], ['proyectos.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_tareas_id'), 'tareas', ['id'], unique=False)


def downgrade() -> None:
    """Deliberadamente no se revierte: borraría todas las tablas y sus datos."""
    raise NotImplementedError("La migración inicial no se puede revertir (borraría todos los datos).")
