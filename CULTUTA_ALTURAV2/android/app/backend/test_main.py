"""
test_main.py — Pruebas unitarias para la API REST de Cultura en Altura.

Utiliza pytest + httpx con el TestClient de FastAPI.
Cada endpoint se valida con respuestas correctas y manejo de errores.

Ejecutar con:
    cd backend
    pytest test_main.py -v
"""

import os
import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

# ── Activar modo testing ANTES de importar config/main ───────────
os.environ["TESTING"] = "1"

from config import supabase as _unused  # noqa: F401
import config

mock_supabase = MagicMock()
config.supabase = mock_supabase

# Ahora importar main (usa config.supabase que ya es el mock)
import main  # noqa: E402
main.supabase = mock_supabase  # asegurar que main también apunte al mock
from main import app  # noqa: E402

client = TestClient(app)

FAKE_USER_ID = "00000000-0000-0000-0000-000000000001"
FAKE_TOKEN = "Bearer fake-valid-token"


# ── Helper: mockear autenticación ────────────────────────────────
@pytest.fixture(autouse=True)
def reset_mocks():
    """Resetea todos los mocks antes de cada test."""
    mock_supabase.reset_mock()
    yield


def _mock_auth(user_id: str = FAKE_USER_ID):
    """Configura el mock de autenticación para devolver un usuario válido."""
    user_mock = MagicMock()
    user_mock.user.id = user_id
    mock_supabase.auth.get_user.return_value = user_mock


def _mock_admin(user_id: str = FAKE_USER_ID):
    """Configura auth + admin check."""
    _mock_auth(user_id)
    admin_result = MagicMock()
    admin_result.data = {"is_admin": True}
    mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = admin_result


def _mock_table_response(data, count=None):
    """Crea un mock de respuesta de tabla Supabase."""
    result = MagicMock()
    result.data = data
    result.count = count
    return result


# ═══════════════════════════════════════════════════════════════════
# 1. AUTH TESTS
# ═══════════════════════════════════════════════════════════════════

class TestAuth:
    def test_login_success(self):
        session_mock = MagicMock()
        session_mock.session.access_token = "test-token-123"
        session_mock.user.id = FAKE_USER_ID
        session_mock.user.email = "test@example.com"
        mock_supabase.auth.sign_in_with_password.return_value = session_mock

        res = client.post("/api/auth/login", json={"email": "test@example.com", "password": "123456"})
        assert res.status_code == 200
        data = res.json()
        assert data["access_token"] == "test-token-123"
        assert data["user_id"] == FAKE_USER_ID

    def test_login_invalid_credentials(self):
        mock_supabase.auth.sign_in_with_password.side_effect = Exception("Invalid login credentials")

        res = client.post("/api/auth/login", json={"email": "bad@example.com", "password": "wrongpass"})
        assert res.status_code == 401
        assert "Invalid login" in res.json()["detail"]

    def test_login_validation_error(self):
        res = client.post("/api/auth/login", json={"email": "not-an-email", "password": "123"})
        assert res.status_code == 422

    def test_register_success(self):
        session_mock = MagicMock()
        session_mock.session.access_token = "new-token"
        session_mock.user.id = FAKE_USER_ID
        session_mock.user.email = "new@example.com"
        mock_supabase.auth.sign_up.return_value = session_mock

        res = client.post("/api/auth/register", json={
            "email": "new@example.com", "password": "123456", "full_name": "Test User"
        })
        assert res.status_code == 201
        assert res.json()["user_id"] == FAKE_USER_ID

    def test_register_duplicate_email(self):
        mock_supabase.auth.sign_up.side_effect = Exception("User already registered")

        res = client.post("/api/auth/register", json={
            "email": "dup@example.com", "password": "123456", "full_name": "Dup"
        })
        assert res.status_code == 400

    def test_get_me_success(self):
        _mock_auth()
        chain = mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute
        chain.return_value = _mock_table_response({
            "id": FAKE_USER_ID, "email": "me@test.com", "full_name": "Me",
            "is_admin": False, "avatar_url": None, "created_at": "2026-01-01T00:00:00+00:00"
        })

        res = client.get("/api/auth/me", headers={"Authorization": FAKE_TOKEN})
        assert res.status_code == 200
        assert res.json()["id"] == FAKE_USER_ID

    def test_get_me_no_token(self):
        res = client.get("/api/auth/me")
        assert res.status_code == 401

    def test_logout_success(self):
        _mock_auth()
        res = client.post("/api/auth/logout", headers={"Authorization": FAKE_TOKEN})
        assert res.status_code == 204


# ═══════════════════════════════════════════════════════════════════
# 2. PROFILES TESTS
# ═══════════════════════════════════════════════════════════════════

class TestProfiles:
    def test_get_all_profiles(self):
        chain = mock_supabase.table.return_value.select.return_value.order.return_value.execute
        chain.return_value = _mock_table_response([
            {"id": "1", "email": "a@b.com", "full_name": "A", "is_admin": False, "avatar_url": None, "created_at": "2026-01-01T00:00:00+00:00"},
        ])

        res = client.get("/api/profiles")
        assert res.status_code == 200
        assert len(res.json()) == 1

    def test_get_profile_by_id(self):
        chain = mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute
        chain.return_value = _mock_table_response({
            "id": FAKE_USER_ID, "email": "x@y.com", "full_name": "X",
            "is_admin": False, "avatar_url": None, "created_at": "2026-01-01T00:00:00+00:00"
        })

        res = client.get(f"/api/profiles/{FAKE_USER_ID}")
        assert res.status_code == 200
        assert res.json()["full_name"] == "X"

    def test_get_profile_not_found(self):
        chain = mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute
        chain.return_value = _mock_table_response(None)

        res = client.get("/api/profiles/nonexistent-id")
        assert res.status_code == 404

    def test_search_profiles(self):
        chain = mock_supabase.table.return_value.select.return_value.ilike.return_value.limit.return_value.execute
        chain.return_value = _mock_table_response([
            {"id": "1", "email": "a@b.com", "full_name": "Ana", "is_admin": False, "avatar_url": None, "created_at": "2026-01-01T00:00:00+00:00"},
        ])

        res = client.get("/api/profiles/search?q=Ana")
        assert res.status_code == 200
        assert res.json()[0]["full_name"] == "Ana"

    def test_search_profiles_missing_query(self):
        res = client.get("/api/profiles/search")
        assert res.status_code == 422

    def test_check_is_admin(self):
        chain = mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute
        chain.return_value = _mock_table_response({"is_admin": True})

        res = client.get(f"/api/profiles/{FAKE_USER_ID}/is-admin")
        assert res.status_code == 200
        assert res.json()["is_admin"] is True

    def test_update_profile_success(self):
        _mock_auth()
        chain = mock_supabase.table.return_value.update.return_value.eq.return_value.execute
        chain.return_value = _mock_table_response([{
            "id": FAKE_USER_ID, "email": "x@y.com", "full_name": "Updated",
            "is_admin": False, "avatar_url": None, "created_at": "2026-01-01T00:00:00+00:00"
        }])

        res = client.patch(
            f"/api/profiles/{FAKE_USER_ID}",
            json={"full_name": "Updated"},
            headers={"Authorization": FAKE_TOKEN},
        )
        assert res.status_code == 200
        assert res.json()["full_name"] == "Updated"

    def test_update_profile_forbidden(self):
        _mock_auth("different-user-id")

        res = client.patch(
            f"/api/profiles/{FAKE_USER_ID}",
            json={"full_name": "Hacker"},
            headers={"Authorization": FAKE_TOKEN},
        )
        assert res.status_code == 403


# ═══════════════════════════════════════════════════════════════════
# 3. TOURS TESTS
# ═══════════════════════════════════════════════════════════════════

class TestTours:
    def test_get_all_locations(self):
        chain = mock_supabase.table.return_value.select.return_value.order.return_value.execute
        chain.return_value = _mock_table_response([
            {"id": "catedral", "name": "Catedral", "description": "Desc", "slug": None, "cover_url": None, "created_at": "2026-01-01T00:00:00+00:00"},
        ])

        res = client.get("/api/tours")
        assert res.status_code == 200
        assert len(res.json()) >= 1

    def test_get_tour_by_slug(self):
        chain = mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute
        chain.return_value = _mock_table_response({
            "id": "catedral", "name": "Catedral", "description": "Desc", "slug": None, "cover_url": None, "created_at": "2026-01-01T00:00:00+00:00"
        })

        res = client.get("/api/tours/catedral")
        assert res.status_code == 200
        assert res.json()["id"] == "catedral"

    def test_get_tour_not_found(self):
        chain = mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute
        chain.return_value = _mock_table_response(None)

        res = client.get("/api/tours/nonexistent")
        assert res.status_code == 404

    def test_get_tour_scenes(self):
        # Mock location check
        loc_chain = mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute
        loc_chain.return_value = _mock_table_response({"id": "catedral"})
        # Mock scenes
        scenes_chain = mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute
        scenes_chain.return_value = _mock_table_response([
            {"id": 1, "location_id": "catedral", "scene_order": 1, "title": "S1", "subtitle": "Sub", "narration": "N", "audio_file": "/a.mp3"},
        ])

        res = client.get("/api/tours/catedral/scenes")
        assert res.status_code == 200

    def test_get_scene_hotspots(self):
        chain = mock_supabase.table.return_value.select.return_value.eq.return_value.execute
        chain.return_value = _mock_table_response([
            {"id": 1, "scene_id": 1, "label": "Altar", "description": "Desc", "hotspot_order": 0},
        ])

        res = client.get("/api/tours/catedral/scenes/1/hotspots")
        assert res.status_code == 200
        assert res.json()[0]["label"] == "Altar"


# ═══════════════════════════════════════════════════════════════════
# 4. VIDEOS TESTS
# ═══════════════════════════════════════════════════════════════════

class TestVideos:
    def test_get_approved_videos(self):
        chain = (
            mock_supabase.table.return_value.select.return_value
            .eq.return_value.order.return_value.range.return_value.execute
        )
        chain.return_value = _mock_table_response([
            {"id": "v1", "user_id": "u1", "title": "Vid", "video_url": "http://vid.mp4",
             "thumbnail_url": None, "cloudinary_id": "c1", "duration_secs": 30,
             "moderation_status": "approved", "status": None, "created_at": "2026-01-01T00:00:00+00:00", "profiles": None},
        ])

        res = client.get("/api/videos?limit=10&offset=0")
        assert res.status_code == 200
        assert len(res.json()) == 1

    def test_get_pending_videos_requires_admin(self):
        _mock_auth()
        # Mock admin check returning non-admin
        admin_chain = mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute
        admin_chain.return_value = _mock_table_response({"is_admin": False})

        res = client.get("/api/videos/pending", headers={"Authorization": FAKE_TOKEN})
        assert res.status_code == 403

    def test_get_pending_videos_as_admin(self):
        _mock_admin()
        chain = (
            mock_supabase.table.return_value.select.return_value
            .eq.return_value.order.return_value.execute
        )
        chain.return_value = _mock_table_response([])

        res = client.get("/api/videos/pending", headers={"Authorization": FAKE_TOKEN})
        assert res.status_code == 200

    def test_create_video_success(self):
        _mock_auth()
        chain = mock_supabase.table.return_value.insert.return_value.execute
        chain.return_value = _mock_table_response([{
            "id": "v-new", "user_id": FAKE_USER_ID, "title": "Mi Video",
            "video_url": "http://v.mp4", "thumbnail_url": None, "cloudinary_id": "c1",
            "duration_secs": 60, "moderation_status": "pending", "status": None,
            "created_at": "2026-01-01T00:00:00+00:00", "profiles": None,
        }])

        res = client.post("/api/videos", json={
            "title": "Mi Video", "video_url": "http://v.mp4",
            "cloudinary_id": "c1", "duration_secs": 60,
        }, headers={"Authorization": FAKE_TOKEN})
        assert res.status_code == 201
        assert res.json()["title"] == "Mi Video"

    def test_create_video_no_auth(self):
        res = client.post("/api/videos", json={
            "title": "X", "video_url": "http://v.mp4", "cloudinary_id": "c1", "duration_secs": 60,
        })
        assert res.status_code == 401

    def test_create_video_duration_too_long(self):
        _mock_auth()
        res = client.post("/api/videos", json={
            "title": "Long", "video_url": "http://v.mp4", "cloudinary_id": "c1", "duration_secs": 999,
        }, headers={"Authorization": FAKE_TOKEN})
        assert res.status_code == 422

    def test_delete_video(self):
        _mock_auth()
        chain = mock_supabase.table.return_value.delete.return_value.eq.return_value.execute
        chain.return_value = _mock_table_response([])

        res = client.delete("/api/videos/v1", headers={"Authorization": FAKE_TOKEN})
        assert res.status_code == 204


# ═══════════════════════════════════════════════════════════════════
# 5. STORIES TESTS
# ═══════════════════════════════════════════════════════════════════

class TestStories:
    def test_get_stories(self):
        chain = (
            mock_supabase.table.return_value.select.return_value
            .order.return_value.range.return_value.execute
        )
        chain.return_value = _mock_table_response([
            {"id": "s1", "author_id": "u1", "title": "Relato", "content": "Contenido largo suficiente",
             "created_at": "2026-01-01T00:00:00+00:00", "profiles": None},
        ])

        res = client.get("/api/stories")
        assert res.status_code == 200

    def test_create_story_success(self):
        _mock_auth()
        chain = mock_supabase.table.return_value.insert.return_value.execute
        chain.return_value = _mock_table_response([{
            "id": "s-new", "author_id": FAKE_USER_ID, "title": "Mi Relato",
            "content": "Contenido de al menos 20 caracteres aqui",
            "created_at": "2026-01-01T00:00:00+00:00", "profiles": None,
        }])

        res = client.post("/api/stories", json={
            "title": "Mi Relato", "content": "Contenido de al menos 20 caracteres aqui",
        }, headers={"Authorization": FAKE_TOKEN})
        assert res.status_code == 201

    def test_create_story_too_short(self):
        _mock_auth()
        res = client.post("/api/stories", json={
            "title": "Ok", "content": "Corto",
        }, headers={"Authorization": FAKE_TOKEN})
        assert res.status_code == 422

    def test_delete_story(self):
        _mock_auth()
        chain = mock_supabase.table.return_value.delete.return_value.eq.return_value.execute
        chain.return_value = _mock_table_response([])

        res = client.delete("/api/stories/s1", headers={"Authorization": FAKE_TOKEN})
        assert res.status_code == 204


# ═══════════════════════════════════════════════════════════════════
# 6. COMMENTS TESTS
# ═══════════════════════════════════════════════════════════════════

class TestComments:
    def test_get_video_comments(self):
        chain = (
            mock_supabase.table.return_value.select.return_value
            .eq.return_value.order.return_value.execute
        )
        chain.return_value = _mock_table_response([
            {"id": "c1", "video_id": "v1", "user_id": "u1", "content": "Buen video",
             "parent_comment_id": None, "parent_id": None, "created_at": "2026-01-01T00:00:00+00:00", "profiles": None},
        ])

        res = client.get("/api/videos/v1/comments")
        assert res.status_code == 200
        assert res.json()[0]["content"] == "Buen video"

    def test_add_video_comment(self):
        _mock_auth()
        chain = mock_supabase.table.return_value.insert.return_value.execute
        chain.return_value = _mock_table_response([{
            "id": "c-new", "video_id": "v1", "user_id": FAKE_USER_ID,
            "content": "Comentario", "parent_comment_id": None, "parent_id": None,
            "created_at": "2026-01-01T00:00:00+00:00", "profiles": None,
        }])

        res = client.post("/api/videos/v1/comments", json={"content": "Comentario"},
                          headers={"Authorization": FAKE_TOKEN})
        assert res.status_code == 201

    def test_get_story_comments(self):
        chain = (
            mock_supabase.table.return_value.select.return_value
            .eq.return_value.order.return_value.execute
        )
        chain.return_value = _mock_table_response([])

        res = client.get("/api/stories/s1/comments")
        assert res.status_code == 200

    def test_add_story_comment(self):
        _mock_auth()
        chain = mock_supabase.table.return_value.insert.return_value.execute
        chain.return_value = _mock_table_response([{
            "id": "c-new", "story_id": "s1", "user_id": FAKE_USER_ID,
            "content": "Mi opinion", "parent_id": None,
            "created_at": "2026-01-01T00:00:00+00:00", "profiles": None,
        }])

        res = client.post("/api/stories/s1/comments", json={"content": "Mi opinion"},
                          headers={"Authorization": FAKE_TOKEN})
        assert res.status_code == 201

    def test_delete_video_comment(self):
        _mock_auth()
        chain = mock_supabase.table.return_value.delete.return_value.eq.return_value.execute
        chain.return_value = _mock_table_response([])

        res = client.delete("/api/videos/comments/c1", headers={"Authorization": FAKE_TOKEN})
        assert res.status_code == 204


# ═══════════════════════════════════════════════════════════════════
# 7. REACTIONS TESTS
# ═══════════════════════════════════════════════════════════════════

class TestReactions:
    def test_get_video_reactions(self):
        chain = mock_supabase.table.return_value.select.return_value.eq.return_value.execute
        chain.return_value = _mock_table_response([
            {"id": "r1", "user_id": "u1", "emoji": "❤️", "created_at": "2026-01-01T00:00:00+00:00"},
        ])

        res = client.get("/api/videos/v1/reactions")
        assert res.status_code == 200
        assert res.json()[0]["emoji"] == "❤️"

    def test_toggle_video_reaction_add(self):
        _mock_auth()
        # No existing reaction
        chain = (
            mock_supabase.table.return_value.select.return_value
            .eq.return_value.eq.return_value.eq.return_value
            .maybe_single.return_value.execute
        )
        chain.return_value = _mock_table_response(None)
        # Insert
        mock_supabase.table.return_value.insert.return_value.execute.return_value = _mock_table_response([{}])

        res = client.post("/api/videos/v1/reactions", json={"emoji": "❤️"},
                          headers={"Authorization": FAKE_TOKEN})
        assert res.status_code == 200
        assert res.json()["action"] == "added"

    def test_toggle_video_reaction_remove(self):
        _mock_auth()
        # Existing reaction found
        chain = (
            mock_supabase.table.return_value.select.return_value
            .eq.return_value.eq.return_value.eq.return_value
            .maybe_single.return_value.execute
        )
        chain.return_value = _mock_table_response({"id": "r-existing"})
        # Delete
        mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value = _mock_table_response([])

        res = client.post("/api/videos/v1/reactions", json={"emoji": "❤️"},
                          headers={"Authorization": FAKE_TOKEN})
        assert res.status_code == 200
        assert res.json()["action"] == "removed"

    def test_get_story_reactions(self):
        chain = mock_supabase.table.return_value.select.return_value.eq.return_value.execute
        chain.return_value = _mock_table_response([])

        res = client.get("/api/stories/s1/reactions")
        assert res.status_code == 200


# ═══════════════════════════════════════════════════════════════════
# 8. RATINGS TESTS
# ═══════════════════════════════════════════════════════════════════

class TestRatings:
    def test_get_tour_ratings(self):
        chain = mock_supabase.table.return_value.select.return_value.eq.return_value.execute
        chain.return_value = _mock_table_response([
            {"id": "r1", "user_id": "u1", "tour_name": "catedral", "tour_slug": None, "rating": 5, "created_at": "2026-01-01T00:00:00+00:00"},
        ])

        res = client.get("/api/tours/catedral/ratings")
        assert res.status_code == 200

    def test_get_rating_stats(self):
        chain = mock_supabase.table.return_value.select.return_value.eq.return_value.execute
        chain.return_value = _mock_table_response([
            {"rating": 5}, {"rating": 3}, {"rating": 4},
        ])

        res = client.get("/api/tours/catedral/ratings/stats")
        assert res.status_code == 200
        data = res.json()
        assert data["average"] == 4.0
        assert data["count"] == 3

    def test_get_rating_stats_empty(self):
        chain = mock_supabase.table.return_value.select.return_value.eq.return_value.execute
        chain.return_value = _mock_table_response([])

        res = client.get("/api/tours/catedral/ratings/stats")
        assert res.status_code == 200
        assert res.json() == {"average": 0, "count": 0}

    def test_rate_tour(self):
        _mock_auth()
        chain = mock_supabase.table.return_value.upsert.return_value.execute
        chain.return_value = _mock_table_response([{
            "id": "r-new", "user_id": FAKE_USER_ID, "tour_name": "catedral",
            "tour_slug": None, "rating": 4, "created_at": "2026-01-01T00:00:00+00:00",
        }])

        res = client.put("/api/tours/catedral/ratings", json={"rating": 4},
                         headers={"Authorization": FAKE_TOKEN})
        assert res.status_code == 200
        assert res.json()["rating"] == 4

    def test_rate_tour_invalid_value(self):
        _mock_auth()
        res = client.put("/api/tours/catedral/ratings", json={"rating": 10},
                         headers={"Authorization": FAKE_TOKEN})
        assert res.status_code == 422

    def test_get_my_rating(self):
        _mock_auth()
        chain = (
            mock_supabase.table.return_value.select.return_value
            .eq.return_value.eq.return_value.maybe_single.return_value.execute
        )
        chain.return_value = _mock_table_response({"rating": 5})

        res = client.get("/api/tours/catedral/ratings/me", headers={"Authorization": FAKE_TOKEN})
        assert res.status_code == 200
        assert res.json()["rating"] == 5


# ═══════════════════════════════════════════════════════════════════
# 9. SOCIAL / FOLLOWS TESTS
# ═══════════════════════════════════════════════════════════════════

class TestSocial:
    def test_get_followers(self):
        chain = mock_supabase.table.return_value.select.return_value.eq.return_value.execute
        chain.return_value = _mock_table_response([
            {"follower_id": "u2", "following_id": FAKE_USER_ID, "created_at": "2026-01-01T00:00:00+00:00"},
        ])

        res = client.get(f"/api/users/{FAKE_USER_ID}/followers")
        assert res.status_code == 200
        assert len(res.json()) == 1

    def test_get_following(self):
        chain = mock_supabase.table.return_value.select.return_value.eq.return_value.execute
        chain.return_value = _mock_table_response([])

        res = client.get(f"/api/users/{FAKE_USER_ID}/following")
        assert res.status_code == 200

    def test_get_follow_counts(self):
        followers_result = _mock_table_response([], count=5)
        following_result = _mock_table_response([], count=3)
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
            followers_result, following_result
        ]

        res = client.get(f"/api/users/{FAKE_USER_ID}/follow-counts")
        assert res.status_code == 200

    def test_check_is_following_true(self):
        chain = (
            mock_supabase.table.return_value.select.return_value
            .eq.return_value.eq.return_value.maybe_single.return_value.execute
        )
        chain.return_value = _mock_table_response({"follower_id": FAKE_USER_ID})

        res = client.get(f"/api/users/{FAKE_USER_ID}/is-following/user-2")
        assert res.status_code == 200
        assert res.json()["is_following"] is True

    def test_follow_user(self):
        _mock_auth()
        chain = mock_supabase.table.return_value.insert.return_value.execute
        chain.return_value = _mock_table_response([{
            "follower_id": FAKE_USER_ID, "following_id": "user-2",
            "created_at": "2026-01-01T00:00:00+00:00",
        }])

        res = client.post("/api/users/user-2/follow", headers={"Authorization": FAKE_TOKEN})
        assert res.status_code == 201

    def test_follow_self_rejected(self):
        _mock_auth()
        res = client.post(f"/api/users/{FAKE_USER_ID}/follow", headers={"Authorization": FAKE_TOKEN})
        assert res.status_code == 400

    def test_unfollow_user(self):
        _mock_auth()
        chain = mock_supabase.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute
        chain.return_value = _mock_table_response([])

        res = client.delete("/api/users/user-2/follow", headers={"Authorization": FAKE_TOKEN})
        assert res.status_code == 204
