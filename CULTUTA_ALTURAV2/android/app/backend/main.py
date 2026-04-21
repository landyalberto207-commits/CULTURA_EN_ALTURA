"""
API REST — Cultura en Altura
FastAPI backend que actúa como intermediario entre el frontend y Supabase.

Ejecutar con:
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations
from fastapi import FastAPI, HTTPException, Header, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from config import supabase
from models import (
    # Auth
    SignInRequest, SignUpRequest, AuthResponse,
    # Profiles
    ProfileOut, ProfileUpdate,
    # Tours
    TourLocationOut, TourSceneOut, TourHotspotOut, FullTourOut, TourSceneWithHotspots,
    # Videos
    VideoCreate, VideoOut,
    # Stories
    StoryCreate, StoryOut,
    # Comments
    CommentCreate, VideoCommentOut, StoryCommentOut,
    # Reactions
    ReactionToggle, ReactionOut, ReactionToggleResult,
    # Ratings
    RatingCreate, RatingOut, RatingStats,
    # Social
    FollowOut, FollowCounts,
    # Error
    ErrorResponse,
)

# ─── App ─────────────────────────────────────────────────────────
app = FastAPI(
    title="Cultura en Altura API",
    description="API REST para la plataforma cultural de Tulancingo, Hidalgo. "
                "Gestiona tours virtuales, comunidad de videos, relatos, "
                "comentarios, reacciones y perfiles sociales.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Helpers ─────────────────────────────────────────────────────
def _get_user_id(authorization: str | None) -> str:
    """Extrae el user_id del token JWT de Supabase."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token de autorización requerido")
    token = authorization.replace("Bearer ", "")
    try:
        user = supabase.auth.get_user(token)
        return user.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")


def _require_admin(user_id: str):
    """Verifica que el usuario sea administrador."""
    result = supabase.table("profiles").select("is_admin").eq("id", user_id).maybe_single().execute()
    if not result.data or not result.data.get("is_admin"):
        raise HTTPException(status_code=403, detail="Se requieren permisos de administrador")


# ═══════════════════════════════════════════════════════════════════
# 1. AUTH ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@app.post(
    "/api/auth/login",
    response_model=AuthResponse,
    tags=["Auth"],
    summary="Iniciar sesión",
    responses={401: {"model": ErrorResponse}},
)
def login(body: SignInRequest):
    """Autentica un usuario con email y contraseña. Devuelve un access_token."""
    try:
        res = supabase.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
        return AuthResponse(
            access_token=res.session.access_token,
            user_id=res.user.id,
            email=res.user.email,
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@app.post(
    "/api/auth/register",
    response_model=AuthResponse,
    status_code=201,
    tags=["Auth"],
    summary="Registrar nuevo usuario",
    responses={400: {"model": ErrorResponse}},
)
def register(body: SignUpRequest):
    """Registra un nuevo usuario y devuelve un access_token."""
    try:
        res = supabase.auth.sign_up(
            {
                "email": body.email,
                "password": body.password,
                "options": {"data": {"full_name": body.full_name}},
            }
        )
        return AuthResponse(
            access_token=res.session.access_token if res.session else "",
            user_id=res.user.id,
            email=res.user.email,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post(
    "/api/auth/logout",
    status_code=204,
    tags=["Auth"],
    summary="Cerrar sesión",
    responses={401: {"model": ErrorResponse}},
)
def logout(authorization: Optional[str] = Header(None)):
    """Cierra la sesión del usuario autenticado."""
    _get_user_id(authorization)
    return None


@app.get(
    "/api/auth/me",
    response_model=ProfileOut,
    tags=["Auth"],
    summary="Obtener usuario actual",
    responses={401: {"model": ErrorResponse}},
)
def get_current_user(authorization: Optional[str] = Header(None)):
    """Devuelve el perfil del usuario autenticado."""
    user_id = _get_user_id(authorization)
    result = supabase.table("profiles").select("*").eq("id", user_id).maybe_single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    return result.data


# ═══════════════════════════════════════════════════════════════════
# 2. PROFILES ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@app.get(
    "/api/profiles",
    response_model=list[ProfileOut],
    tags=["Profiles"],
    summary="Listar todos los perfiles",
)
def get_profiles():
    """Devuelve todos los perfiles ordenados por fecha de creación."""
    result = supabase.table("profiles").select("*").order("created_at", desc=True).execute()
    return result.data


@app.get(
    "/api/profiles/search",
    response_model=list[ProfileOut],
    tags=["Profiles"],
    summary="Buscar perfiles por nombre",
)
def search_profiles(q: str = Query(..., min_length=1, description="Texto a buscar en el nombre")):
    """Busca perfiles cuyo nombre coincida parcialmente con el query."""
    result = supabase.table("profiles").select("*").ilike("full_name", f"%{q}%").limit(20).execute()
    return result.data


@app.get(
    "/api/profiles/{profile_id}",
    response_model=ProfileOut,
    tags=["Profiles"],
    summary="Obtener perfil por ID",
    responses={404: {"model": ErrorResponse}},
)
def get_profile(profile_id: str = Path(..., description="UUID del perfil")):
    """Devuelve un perfil específico por su ID."""
    result = supabase.table("profiles").select("*").eq("id", profile_id).maybe_single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    return result.data


@app.get(
    "/api/profiles/{profile_id}/is-admin",
    tags=["Profiles"],
    summary="Verificar si un usuario es admin",
)
def check_is_admin(profile_id: str = Path(..., description="UUID del perfil")):
    """Devuelve si el usuario tiene rol de administrador."""
    result = supabase.table("profiles").select("is_admin").eq("id", profile_id).maybe_single().execute()
    is_admin = bool(result.data and result.data.get("is_admin"))
    return {"is_admin": is_admin}


@app.patch(
    "/api/profiles/{profile_id}",
    response_model=ProfileOut,
    tags=["Profiles"],
    summary="Actualizar perfil propio",
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
)
def update_profile(
    profile_id: str,
    body: ProfileUpdate,
    authorization: Optional[str] = Header(None),
):
    """Actualiza el nombre o avatar del usuario autenticado."""
    user_id = _get_user_id(authorization)
    if user_id != profile_id:
        raise HTTPException(status_code=403, detail="Solo puedes actualizar tu propio perfil")
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No se proporcionaron campos a actualizar")
    result = supabase.table("profiles").update(updates).eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    return result.data[0]


# ═══════════════════════════════════════════════════════════════════
# 3. TOURS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@app.get(
    "/api/tours",
    response_model=list[TourLocationOut],
    tags=["Tours"],
    summary="Listar todas las ubicaciones de tours",
)
def get_tour_locations():
    """Devuelve todas las ubicaciones de tours disponibles."""
    result = supabase.table("tour_locations").select("*").order("name").execute()
    return result.data


@app.get(
    "/api/tours/{slug}",
    response_model=TourLocationOut,
    tags=["Tours"],
    summary="Obtener ubicación de tour por slug",
    responses={404: {"model": ErrorResponse}},
)
def get_tour_by_slug(slug: str = Path(..., description="Slug del tour (ej: catedral)")):
    """Devuelve la información de una ubicación de tour."""
    result = supabase.table("tour_locations").select("*").eq("id", slug).maybe_single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Tour no encontrado")
    return result.data


@app.get(
    "/api/tours/{slug}/scenes",
    response_model=list[TourSceneOut],
    tags=["Tours"],
    summary="Obtener escenas de un tour",
)
def get_tour_scenes(slug: str = Path(..., description="Slug del tour")):
    """Devuelve las escenas ordenadas de un tour específico."""
    location = supabase.table("tour_locations").select("id").eq("id", slug).maybe_single().execute()
    if not location.data:
        raise HTTPException(status_code=404, detail="Tour no encontrado")
    result = supabase.table("tour_scenes").select("*").eq("location_id", slug).order("scene_order").execute()
    return result.data


@app.get(
    "/api/tours/{slug}/scenes/{scene_id}/hotspots",
    response_model=list[TourHotspotOut],
    tags=["Tours"],
    summary="Obtener hotspots de una escena",
)
def get_scene_hotspots(
    slug: str = Path(..., description="Slug del tour"),
    scene_id: int = Path(..., description="ID de la escena"),
):
    """Devuelve los hotspots interactivos de una escena."""
    result = supabase.table("tour_hotspots").select("*").eq("scene_id", scene_id).execute()
    return result.data


@app.get(
    "/api/tours/{slug}/full",
    response_model=FullTourOut,
    tags=["Tours"],
    summary="Obtener tour completo con escenas y hotspots",
    responses={404: {"model": ErrorResponse}},
)
def get_full_tour(slug: str = Path(..., description="Slug del tour")):
    """Devuelve la ubicación, escenas y hotspots de un tour en una sola llamada."""
    location = supabase.table("tour_locations").select("*").eq("id", slug).maybe_single().execute()
    if not location.data:
        raise HTTPException(status_code=404, detail="Tour no encontrado")

    scenes = supabase.table("tour_scenes").select("*").eq("location_id", slug).order("scene_order").execute()
    scenes_with_hotspots = []
    for scene in scenes.data or []:
        hotspots = supabase.table("tour_hotspots").select("*").eq("scene_id", scene["id"]).execute()
        scenes_with_hotspots.append({**scene, "hotspots": hotspots.data or []})

    return {"location": location.data, "scenes": scenes_with_hotspots}


# ═══════════════════════════════════════════════════════════════════
# 4. COMMUNITY VIDEOS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@app.get(
    "/api/videos",
    response_model=list[VideoOut],
    tags=["Videos"],
    summary="Obtener videos aprobados (feed público)",
)
def get_approved_videos(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Devuelve videos aprobados paginados para el feed público."""
    result = (
        supabase.table("community_videos")
        .select("*, profiles(id, full_name, avatar_url)")
        .eq("moderation_status", "approved")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return result.data


@app.get(
    "/api/videos/pending",
    response_model=list[VideoOut],
    tags=["Videos"],
    summary="Obtener videos pendientes de moderación (admin)",
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
)
def get_pending_videos(authorization: Optional[str] = Header(None)):
    """Devuelve videos pendientes de aprobación. Requiere rol de admin."""
    user_id = _get_user_id(authorization)
    _require_admin(user_id)
    result = (
        supabase.table("community_videos")
        .select("*, profiles(id, full_name, avatar_url)")
        .eq("moderation_status", "pending")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@app.get(
    "/api/videos/all",
    response_model=list[VideoOut],
    tags=["Videos"],
    summary="Obtener todos los videos (admin)",
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
)
def get_all_videos(authorization: Optional[str] = Header(None)):
    """Devuelve todos los videos sin importar su estado. Solo admin."""
    user_id = _get_user_id(authorization)
    _require_admin(user_id)
    result = (
        supabase.table("community_videos")
        .select("*, profiles(id, full_name, avatar_url)")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@app.get(
    "/api/videos/{video_id}",
    response_model=VideoOut,
    tags=["Videos"],
    summary="Obtener video por ID",
    responses={404: {"model": ErrorResponse}},
)
def get_video(video_id: str = Path(..., description="UUID del video")):
    """Devuelve un video específico por su ID."""
    result = (
        supabase.table("community_videos")
        .select("*, profiles(id, full_name, avatar_url)")
        .eq("id", video_id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Video no encontrado")
    return result.data


@app.get(
    "/api/videos/user/{user_id}",
    response_model=list[VideoOut],
    tags=["Videos"],
    summary="Obtener videos de un usuario",
)
def get_user_videos(user_id: str = Path(..., description="UUID del usuario")):
    """Devuelve todos los videos subidos por un usuario específico."""
    result = (
        supabase.table("community_videos")
        .select("*, profiles(id, full_name, avatar_url)")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@app.post(
    "/api/videos",
    response_model=VideoOut,
    status_code=201,
    tags=["Videos"],
    summary="Subir un video (crear registro)",
    responses={401: {"model": ErrorResponse}},
)
def create_video(body: VideoCreate, authorization: Optional[str] = Header(None)):
    """Crea un registro de video tras subirlo a Cloudinary. Estado inicial: pending."""
    user_id = _get_user_id(authorization)
    result = (
        supabase.table("community_videos")
        .insert({
            "user_id": user_id,
            "title": body.title,
            "video_url": body.video_url,
            "thumbnail_url": body.thumbnail_url,
            "cloudinary_id": body.cloudinary_id,
            "duration_secs": body.duration_secs,
            "moderation_status": "pending",
            "is_approved": False,
        })
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=400, detail="Error al crear el video")
    return result.data[0]


@app.patch(
    "/api/videos/{video_id}/approve",
    response_model=VideoOut,
    tags=["Videos"],
    summary="Aprobar video (admin)",
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
)
def approve_video(video_id: str, authorization: Optional[str] = Header(None)):
    """Aprueba un video pendiente. Solo admin."""
    user_id = _get_user_id(authorization)
    _require_admin(user_id)
    from datetime import datetime, timezone
    result = (
        supabase.table("community_videos")
        .update({
            "moderation_status": "approved",
            "is_approved": True,
            "reviewed_by": user_id,
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("id", video_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Video no encontrado")
    return result.data[0]


@app.patch(
    "/api/videos/{video_id}/reject",
    response_model=VideoOut,
    tags=["Videos"],
    summary="Rechazar video (admin)",
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
)
def reject_video(video_id: str, authorization: Optional[str] = Header(None)):
    """Rechaza un video pendiente. Solo admin."""
    user_id = _get_user_id(authorization)
    _require_admin(user_id)
    from datetime import datetime, timezone
    result = (
        supabase.table("community_videos")
        .update({
            "moderation_status": "rejected",
            "is_approved": False,
            "reviewed_by": user_id,
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("id", video_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Video no encontrado")
    return result.data[0]


@app.delete(
    "/api/videos/{video_id}",
    status_code=204,
    tags=["Videos"],
    summary="Eliminar video",
    responses={401: {"model": ErrorResponse}},
)
def delete_video(video_id: str, authorization: Optional[str] = Header(None)):
    """Elimina un video. El propietario o un admin pueden hacerlo."""
    _get_user_id(authorization)
    supabase.table("community_videos").delete().eq("id", video_id).execute()
    return None


# ═══════════════════════════════════════════════════════════════════
# 5. STORIES ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@app.get(
    "/api/stories",
    response_model=list[StoryOut],
    tags=["Stories"],
    summary="Listar relatos",
)
def get_stories(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Devuelve los relatos de la comunidad con paginación."""
    result = (
        supabase.table("stories")
        .select("*, profiles(id, full_name, avatar_url)")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return result.data


@app.get(
    "/api/stories/user/{user_id}",
    response_model=list[StoryOut],
    tags=["Stories"],
    summary="Obtener relatos de un usuario",
)
def get_user_stories(user_id: str = Path(..., description="UUID del usuario")):
    """Devuelve los relatos publicados por un usuario."""
    result = (
        supabase.table("stories")
        .select("*, profiles(id, full_name, avatar_url)")
        .eq("author_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@app.post(
    "/api/stories",
    response_model=StoryOut,
    status_code=201,
    tags=["Stories"],
    summary="Crear un relato",
    responses={401: {"model": ErrorResponse}},
)
def create_story(body: StoryCreate, authorization: Optional[str] = Header(None)):
    """Crea un nuevo relato asociado al usuario autenticado."""
    user_id = _get_user_id(authorization)
    result = (
        supabase.table("stories")
        .insert({"author_id": user_id, "title": body.title, "content": body.content})
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=400, detail="Error al crear el relato")
    return result.data[0]


@app.delete(
    "/api/stories/{story_id}",
    status_code=204,
    tags=["Stories"],
    summary="Eliminar un relato",
    responses={401: {"model": ErrorResponse}},
)
def delete_story(story_id: str, authorization: Optional[str] = Header(None)):
    """Elimina un relato. Solo el autor puede hacerlo."""
    _get_user_id(authorization)
    supabase.table("stories").delete().eq("id", story_id).execute()
    return None


# ═══════════════════════════════════════════════════════════════════
# 6. COMMENTS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

# ── Video comments ────────────────────────────────────────────────

@app.get(
    "/api/videos/{video_id}/comments",
    response_model=list[VideoCommentOut],
    tags=["Comments"],
    summary="Obtener comentarios de un video",
)
def get_video_comments(video_id: str):
    """Devuelve los comentarios de un video, ordenados cronológicamente."""
    result = (
        supabase.table("video_comments")
        .select("*, profiles(id, full_name, avatar_url)")
        .eq("video_id", video_id)
        .order("created_at")
        .execute()
    )
    return result.data


@app.post(
    "/api/videos/{video_id}/comments",
    response_model=VideoCommentOut,
    status_code=201,
    tags=["Comments"],
    summary="Agregar comentario a un video",
    responses={401: {"model": ErrorResponse}},
)
def add_video_comment(
    video_id: str,
    body: CommentCreate,
    authorization: Optional[str] = Header(None),
):
    """Agrega un comentario o respuesta a un video."""
    user_id = _get_user_id(authorization)
    payload = {
        "video_id": video_id,
        "user_id": user_id,
        "content": body.content,
    }
    if body.parent_id:
        payload["parent_comment_id"] = body.parent_id
    result = supabase.table("video_comments").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Error al crear el comentario")
    return result.data[0]


@app.delete(
    "/api/videos/comments/{comment_id}",
    status_code=204,
    tags=["Comments"],
    summary="Eliminar comentario de video",
    responses={401: {"model": ErrorResponse}},
)
def delete_video_comment(comment_id: str, authorization: Optional[str] = Header(None)):
    """Elimina un comentario de video."""
    _get_user_id(authorization)
    supabase.table("video_comments").delete().eq("id", comment_id).execute()
    return None


# ── Story comments ────────────────────────────────────────────────

@app.get(
    "/api/stories/{story_id}/comments",
    response_model=list[StoryCommentOut],
    tags=["Comments"],
    summary="Obtener comentarios de un relato",
)
def get_story_comments(story_id: str):
    """Devuelve los comentarios de un relato, ordenados cronológicamente."""
    result = (
        supabase.table("story_comments")
        .select("*, profiles(id, full_name, avatar_url)")
        .eq("story_id", story_id)
        .order("created_at")
        .execute()
    )
    return result.data


@app.post(
    "/api/stories/{story_id}/comments",
    response_model=StoryCommentOut,
    status_code=201,
    tags=["Comments"],
    summary="Agregar comentario a un relato",
    responses={401: {"model": ErrorResponse}},
)
def add_story_comment(
    story_id: str,
    body: CommentCreate,
    authorization: Optional[str] = Header(None),
):
    """Agrega un comentario o respuesta a un relato."""
    user_id = _get_user_id(authorization)
    payload = {
        "story_id": story_id,
        "user_id": user_id,
        "content": body.content,
    }
    if body.parent_id:
        payload["parent_id"] = body.parent_id
    result = supabase.table("story_comments").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Error al crear el comentario")
    return result.data[0]


@app.delete(
    "/api/stories/comments/{comment_id}",
    status_code=204,
    tags=["Comments"],
    summary="Eliminar comentario de relato",
    responses={401: {"model": ErrorResponse}},
)
def delete_story_comment(comment_id: str, authorization: Optional[str] = Header(None)):
    """Elimina un comentario de relato."""
    _get_user_id(authorization)
    supabase.table("story_comments").delete().eq("id", comment_id).execute()
    return None


# ═══════════════════════════════════════════════════════════════════
# 7. REACTIONS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@app.get(
    "/api/videos/{video_id}/reactions",
    response_model=list[ReactionOut],
    tags=["Reactions"],
    summary="Obtener reacciones de un video",
)
def get_video_reactions(video_id: str):
    """Devuelve todas las reacciones de un video."""
    result = supabase.table("video_reactions").select("*").eq("video_id", video_id).execute()
    return result.data


@app.post(
    "/api/videos/{video_id}/reactions",
    response_model=ReactionToggleResult,
    tags=["Reactions"],
    summary="Toggle reacción en video",
    responses={401: {"model": ErrorResponse}},
)
def toggle_video_reaction(
    video_id: str,
    body: ReactionToggle,
    authorization: Optional[str] = Header(None),
):
    """Agrega o quita una reacción de un video (toggle)."""
    user_id = _get_user_id(authorization)
    existing = (
        supabase.table("video_reactions")
        .select("id")
        .eq("video_id", video_id)
        .eq("user_id", user_id)
        .eq("emoji", body.emoji)
        .maybe_single()
        .execute()
    )
    if existing.data:
        supabase.table("video_reactions").delete().eq("id", existing.data["id"]).execute()
        return {"action": "removed"}
    else:
        supabase.table("video_reactions").insert({
            "video_id": video_id, "user_id": user_id, "emoji": body.emoji
        }).execute()
        return {"action": "added"}


@app.get(
    "/api/stories/{story_id}/reactions",
    response_model=list[ReactionOut],
    tags=["Reactions"],
    summary="Obtener reacciones de un relato",
)
def get_story_reactions(story_id: str):
    """Devuelve todas las reacciones de un relato."""
    result = supabase.table("story_reactions").select("*").eq("story_id", story_id).execute()
    return result.data


@app.post(
    "/api/stories/{story_id}/reactions",
    response_model=ReactionToggleResult,
    tags=["Reactions"],
    summary="Toggle reacción en relato",
    responses={401: {"model": ErrorResponse}},
)
def toggle_story_reaction(
    story_id: str,
    body: ReactionToggle,
    authorization: Optional[str] = Header(None),
):
    """Agrega o quita una reacción de un relato (toggle)."""
    user_id = _get_user_id(authorization)
    existing = (
        supabase.table("story_reactions")
        .select("id")
        .eq("story_id", story_id)
        .eq("user_id", user_id)
        .eq("emoji", body.emoji)
        .maybe_single()
        .execute()
    )
    if existing.data:
        supabase.table("story_reactions").delete().eq("id", existing.data["id"]).execute()
        return {"action": "removed"}
    else:
        supabase.table("story_reactions").insert({
            "story_id": story_id, "user_id": user_id, "emoji": body.emoji
        }).execute()
        return {"action": "added"}


# ═══════════════════════════════════════════════════════════════════
# 8. TOUR RATINGS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@app.get(
    "/api/tours/{slug}/ratings",
    response_model=list[RatingOut],
    tags=["Ratings"],
    summary="Obtener calificaciones de un tour",
)
def get_tour_ratings(slug: str):
    """Devuelve todas las calificaciones individuales de un tour."""
    result = supabase.table("tour_ratings").select("*").eq("tour_name", slug).execute()
    return result.data


@app.get(
    "/api/tours/{slug}/ratings/stats",
    response_model=RatingStats,
    tags=["Ratings"],
    summary="Obtener estadísticas de calificación de un tour",
)
def get_tour_rating_stats(slug: str):
    """Devuelve el promedio y conteo total de calificaciones de un tour."""
    result = supabase.table("tour_ratings").select("rating").eq("tour_name", slug).execute()
    ratings = result.data or []
    if not ratings:
        return {"average": 0, "count": 0}
    total = sum(r["rating"] for r in ratings)
    return {"average": round(total / len(ratings), 2), "count": len(ratings)}


@app.get(
    "/api/tours/{slug}/ratings/me",
    tags=["Ratings"],
    summary="Obtener mi calificación de un tour",
    responses={401: {"model": ErrorResponse}},
)
def get_my_tour_rating(slug: str, authorization: Optional[str] = Header(None)):
    """Devuelve la calificación del usuario autenticado para un tour, o null."""
    user_id = _get_user_id(authorization)
    result = (
        supabase.table("tour_ratings")
        .select("rating")
        .eq("tour_name", slug)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    rating = result.data["rating"] if result.data else None
    return {"rating": rating}


@app.put(
    "/api/tours/{slug}/ratings",
    response_model=RatingOut,
    tags=["Ratings"],
    summary="Calificar un tour (crear o actualizar)",
    responses={401: {"model": ErrorResponse}},
)
def rate_tour(
    slug: str,
    body: RatingCreate,
    authorization: Optional[str] = Header(None),
):
    """Crea o actualiza la calificación del usuario para un tour (upsert)."""
    user_id = _get_user_id(authorization)
    result = (
        supabase.table("tour_ratings")
        .upsert(
            {"tour_name": slug, "user_id": user_id, "rating": body.rating},
            on_conflict="user_id,tour_name",
        )
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=400, detail="Error al calificar el tour")
    return result.data[0]


# ═══════════════════════════════════════════════════════════════════
# 9. SOCIAL / FOLLOWS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@app.get(
    "/api/users/{user_id}/followers",
    response_model=list[FollowOut],
    tags=["Social"],
    summary="Obtener seguidores de un usuario",
)
def get_followers(user_id: str):
    """Devuelve la lista de seguidores de un usuario."""
    result = supabase.table("profile_follows").select("*").eq("following_id", user_id).execute()
    return result.data


@app.get(
    "/api/users/{user_id}/following",
    response_model=list[FollowOut],
    tags=["Social"],
    summary="Obtener seguidos por un usuario",
)
def get_following(user_id: str):
    """Devuelve la lista de usuarios que sigue un usuario."""
    result = supabase.table("profile_follows").select("*").eq("follower_id", user_id).execute()
    return result.data


@app.get(
    "/api/users/{user_id}/follow-counts",
    response_model=FollowCounts,
    tags=["Social"],
    summary="Obtener conteo de seguidores y seguidos",
)
def get_follow_counts(user_id: str):
    """Devuelve el número de seguidores y seguidos de un usuario."""
    followers = supabase.table("profile_follows").select("follower_id", count="exact").eq("following_id", user_id).execute()
    following = supabase.table("profile_follows").select("following_id", count="exact").eq("follower_id", user_id).execute()
    return {
        "followers": followers.count or 0,
        "following": following.count or 0,
    }


@app.get(
    "/api/users/{user_id}/is-following/{target_id}",
    tags=["Social"],
    summary="Verificar si un usuario sigue a otro",
)
def check_is_following(user_id: str, target_id: str):
    """Devuelve si user_id sigue a target_id."""
    result = (
        supabase.table("profile_follows")
        .select("follower_id")
        .eq("follower_id", user_id)
        .eq("following_id", target_id)
        .maybe_single()
        .execute()
    )
    return {"is_following": result.data is not None}


@app.post(
    "/api/users/{target_id}/follow",
    response_model=FollowOut,
    status_code=201,
    tags=["Social"],
    summary="Seguir a un usuario",
    responses={401: {"model": ErrorResponse}},
)
def follow_user(target_id: str, authorization: Optional[str] = Header(None)):
    """El usuario autenticado sigue al usuario target_id."""
    user_id = _get_user_id(authorization)
    if user_id == target_id:
        raise HTTPException(status_code=400, detail="No puedes seguirte a ti mismo")
    result = (
        supabase.table("profile_follows")
        .insert({"follower_id": user_id, "following_id": target_id})
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=400, detail="Error al seguir al usuario")
    return result.data[0]


@app.delete(
    "/api/users/{target_id}/follow",
    status_code=204,
    tags=["Social"],
    summary="Dejar de seguir a un usuario",
    responses={401: {"model": ErrorResponse}},
)
def unfollow_user(target_id: str, authorization: Optional[str] = Header(None)):
    """El usuario autenticado deja de seguir al usuario target_id."""
    user_id = _get_user_id(authorization)
    supabase.table("profile_follows").delete().eq("follower_id", user_id).eq("following_id", target_id).execute()
    return None
