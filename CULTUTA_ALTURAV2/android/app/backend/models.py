"""
Modelos Pydantic — Cultura en Altura.

Esquemas de request/response que reflejan las tablas de Supabase
y los tipos definidos en src/lib/api.ts del frontend.
"""

from __future__ import annotations
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, EmailStr


# ═══════════════════════════════════════════════════════════════════
# AUTH
# ═══════════════════════════════════════════════════════════════════

class SignInRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)

class SignUpRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)

class AuthResponse(BaseModel):
    access_token: str
    user_id: str
    email: str


# ═══════════════════════════════════════════════════════════════════
# PROFILES
# ═══════════════════════════════════════════════════════════════════

class ProfileOut(BaseModel):
    id: str
    email: Optional[str] = None
    full_name: str
    is_admin: bool = False
    avatar_url: Optional[str] = None
    created_at: datetime

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2)
    avatar_url: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════
# TOURS
# ═══════════════════════════════════════════════════════════════════

class TourLocationOut(BaseModel):
    id: str
    slug: Optional[str] = None
    name: str
    description: str
    cover_url: Optional[str] = None
    created_at: datetime

class TourSceneOut(BaseModel):
    id: str | int
    location_id: str
    order_index: Optional[int] = None
    scene_order: Optional[int] = None
    title: str
    description: Optional[str] = None
    subtitle: Optional[str] = None
    narration: Optional[str] = None
    audio_url: Optional[str] = None
    audio_file: Optional[str] = None

class TourHotspotOut(BaseModel):
    id: str | int
    scene_id: str | int
    label: str
    description: str
    x: Optional[float] = None
    y: Optional[float] = None
    z: Optional[float] = None
    hotspot_order: Optional[int] = None

class TourSceneWithHotspots(TourSceneOut):
    hotspots: list[TourHotspotOut] = []

class FullTourOut(BaseModel):
    location: TourLocationOut
    scenes: list[TourSceneWithHotspots]


# ═══════════════════════════════════════════════════════════════════
# COMMUNITY VIDEOS
# ═══════════════════════════════════════════════════════════════════

class VideoCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    video_url: str
    thumbnail_url: Optional[str] = None
    cloudinary_id: str
    duration_secs: int = Field(..., le=180)

class VideoOut(BaseModel):
    id: str
    user_id: str
    title: str
    video_url: str
    thumbnail_url: Optional[str] = None
    cloudinary_id: Optional[str] = None
    duration_secs: Optional[int] = None
    status: Optional[str] = None
    moderation_status: Optional[str] = None
    created_at: datetime
    profiles: Optional[dict] = None


# ═══════════════════════════════════════════════════════════════════
# STORIES
# ═══════════════════════════════════════════════════════════════════

class StoryCreate(BaseModel):
    title: str = Field(..., min_length=4)
    content: str = Field(..., min_length=20)

class StoryOut(BaseModel):
    id: str
    author_id: str
    title: str
    content: str
    created_at: datetime
    profiles: Optional[dict] = None


# ═══════════════════════════════════════════════════════════════════
# COMMENTS
# ═══════════════════════════════════════════════════════════════════

class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1)
    parent_id: Optional[str] = None

class VideoCommentOut(BaseModel):
    id: str
    video_id: str
    user_id: str
    content: str
    parent_id: Optional[str] = None
    parent_comment_id: Optional[str] = None
    created_at: datetime
    profiles: Optional[dict] = None

class StoryCommentOut(BaseModel):
    id: str
    story_id: str
    user_id: str
    content: str
    parent_id: Optional[str] = None
    created_at: datetime
    profiles: Optional[dict] = None


# ═══════════════════════════════════════════════════════════════════
# REACTIONS
# ═══════════════════════════════════════════════════════════════════

class ReactionToggle(BaseModel):
    emoji: str = "❤️"

class ReactionOut(BaseModel):
    id: str
    user_id: str
    emoji: str
    created_at: datetime

class ReactionToggleResult(BaseModel):
    action: Literal["added", "removed"]


# ═══════════════════════════════════════════════════════════════════
# TOUR RATINGS
# ═══════════════════════════════════════════════════════════════════

class RatingCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)

class RatingOut(BaseModel):
    id: str
    user_id: str
    tour_slug: Optional[str] = None
    tour_name: Optional[str] = None
    rating: int
    created_at: datetime

class RatingStats(BaseModel):
    average: float
    count: int


# ═══════════════════════════════════════════════════════════════════
# SOCIAL / FOLLOWS
# ═══════════════════════════════════════════════════════════════════

class FollowOut(BaseModel):
    follower_id: str
    following_id: str
    created_at: datetime

class FollowCounts(BaseModel):
    followers: int
    following: int


# ═══════════════════════════════════════════════════════════════════
# GENERIC ERROR
# ═══════════════════════════════════════════════════════════════════

class ErrorResponse(BaseModel):
    detail: str
