"""API Routers"""

from .models import router as models_router
from .run import router as run_router
from .embeddings import router as embeddings_router
from .sessions import router as sessions_router
from .system import router as system_router
from .metrics import router as metrics_router
from .logs import router as logs_router
from .process import router as process_router
from .modelfile import router as modelfile_router
from .backup import router as backup_router
from .auth import router as auth_router
from .cache import router as cache_router
