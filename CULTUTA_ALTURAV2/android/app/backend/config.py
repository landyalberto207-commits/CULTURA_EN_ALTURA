"""
Configuración central del backend — Cultura en Altura.

Lee las credenciales de Supabase desde variables de entorno
y expone un cliente reutilizable para todos los endpoints.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Cargar .env desde el directorio donde vive este archivo (backend/)
_env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(_env_path)

SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY: str = os.environ.get("SUPABASE_SERVICE_KEY", "")
TESTING: bool = os.environ.get("TESTING", "").lower() in ("1", "true")

supabase: Client = None  # type: ignore[assignment]

if not TESTING:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError(
            "Faltan variables de entorno. Define SUPABASE_URL y SUPABASE_SERVICE_KEY."
        )
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
