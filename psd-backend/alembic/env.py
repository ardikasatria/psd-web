from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from app.core.config import settings
from app.core.db import Base
from app.modules.announcements import models as _announcements  # noqa: F401
from app.modules.community import models as _community  # noqa: F401
from app.modules.competitions import models as _competitions  # noqa: F401
from app.modules.events import models as _events  # noqa: F401
from app.modules.gamification import models as _gamification  # noqa: F401
from app.modules.instructors import models as _instructors  # noqa: F401
from app.modules.learn import models as _learn  # noqa: F401
from app.modules.notifications import models as _notifications  # noqa: F401
from app.modules.repos import models as _repos  # noqa: F401
from app.modules.rooms import models as _rooms  # noqa: F401
from app.modules.social import models as _social  # noqa: F401
from app.modules.synthesis import models as _synthesis  # noqa: F401
from app.modules.teams import models as _teams  # noqa: F401
from app.modules.users import models as _users  # noqa: F401

config = context.config

sync_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")

if config.config_file_name:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = sync_url
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = create_engine(sync_url, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
