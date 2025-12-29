"""Add matching profile fields to users and tracked programs

Revision ID: 20251229_01
Revises: 20251228_01_add_tracked_programs
Create Date: 2025-12-29 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251229_01'
down_revision = '20251228_01_add_tracked_programs'
branch_labels = None
depends_on = None


def upgrade():
    # Add matching profile fields to users table
    op.add_column('users', sa.Column('matching_profile', postgresql.JSON(), nullable=True))
    op.add_column('users', sa.Column('matching_profile_completed', sa.Boolean(), nullable=False, server_default='false'))
    
    # Add new fields to tracked_programs table
    op.add_column('tracked_programs', sa.Column('notes_entries', postgresql.JSON(), nullable=True))
    op.add_column('tracked_programs', sa.Column('match_score', sa.Integer(), nullable=True))
    
    # Update notes column max length
    op.alter_column('tracked_programs', 'notes',
                    type_=sa.String(5000),
                    existing_type=sa.String(2000),
                    existing_nullable=True)


def downgrade():
    # Remove columns from tracked_programs
    op.drop_column('tracked_programs', 'match_score')
    op.drop_column('tracked_programs', 'notes_entries')
    
    # Remove columns from users
    op.drop_column('users', 'matching_profile_completed')
    op.drop_column('users', 'matching_profile')
    
    # Revert notes column max length
    op.alter_column('tracked_programs', 'notes',
                    type_=sa.String(2000),
                    existing_type=sa.String(5000),
                    existing_nullable=True)
