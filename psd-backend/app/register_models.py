"""Daftarkan semua model ORM ke Base.metadata (seed, alembic, skrip)."""


def register_models() -> None:
    from app.modules.activity import models as _activity  # noqa: F401
    from app.modules.announcements import models as _announcements  # noqa: F401
    from app.modules.blog import models as _blog  # noqa: F401
    from app.modules.categories import models as _categories  # noqa: F401
    from app.modules.collections import models as _collections  # noqa: F401
    from app.modules.community import models as _community  # noqa: F401
    from app.modules.competitions import models as _competitions  # noqa: F401
    from app.modules.events import models as _events  # noqa: F401
    from app.modules.factory import models as _factory  # noqa: F401
    from app.modules.gamification import models as _gamification  # noqa: F401
    from app.modules.instructors import models as _instructors  # noqa: F401
    from app.modules.learn import models as _learn  # noqa: F401
    from app.modules.notebook_kernel import models as _notebook_kernel  # noqa: F401
    from app.modules.micro import models as _micro  # noqa: F401
    from app.modules.notifications import models as _notifications  # noqa: F401
    from app.modules.quests import models as _quests  # noqa: F401
    from app.modules.repos import models as _repos  # noqa: F401
    from app.modules.rooms import models as _rooms  # noqa: F401
    from app.modules.social import models as _social  # noqa: F401
    from app.modules.synthesis import models as _synthesis  # noqa: F401
    from app.modules.harvest import models as _harvest  # noqa: F401
    from app.modules.teams import models as _teams  # noqa: F401
    from app.modules.orgs import models as _orgs  # noqa: F401
    from app.modules.users import models as _users  # noqa: F401
    from app.oauth import models as _oauth  # noqa: F401
    from app.mlops import models as _mlops  # noqa: F401
