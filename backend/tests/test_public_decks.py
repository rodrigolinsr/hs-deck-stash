import uuid

import httpx

from .conftest import api_url
from .test_tscheck_duplicate_deck_code import DEMO_EMAIL, DEMO_PASSWORD


def test_owner_can_publish_and_another_user_can_import_a_public_deck():
    with httpx.Client(timeout=30.0) as owner:
        login = owner.post(api_url("/auth/login"), json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
        assert login.status_code == 200, login.text
        decks = owner.get(api_url("/decks"))
        assert decks.status_code == 200, decks.text
        deck_id = decks.json()[0]["id"]

        published = owner.post(api_url(f"/decks/{deck_id}/publish"))
        assert published.status_code == 200, published.text
        assert published.json()["is_public"] is True

        with httpx.Client(timeout=30.0) as visitor:
            public = visitor.get(api_url(f"/public/decks/{deck_id}"))
            assert public.status_code == 200, public.text
            assert public.json()["id"] == deck_id
            assert public.json()["author_name"]
            assert public.json()["author_username"]

            discovery = visitor.get(api_url("/public/decks"))
            assert discovery.status_code == 200, discovery.text
            matching = next(deck for deck in discovery.json() if deck["id"] == deck_id)
            assert matching["author_username"] == public.json()["author_username"]

            profile = visitor.get(api_url(f"/public/decks/players/{public.json()['author_username']}"))
            assert profile.status_code == 200, profile.text
            assert any(deck["id"] == deck_id for deck in profile.json()["decks"])

        email = f"public-import-{uuid.uuid4().hex[:10]}@example.com"
        username = f"public-import-{uuid.uuid4().hex[:10]}"
        with httpx.Client(timeout=30.0) as importer:
            signup = importer.post(api_url("/auth/signup"), json={"email": email, "password": "password123", "display_name": username})
            assert signup.status_code == 200, signup.text
            imported = importer.post(api_url(f"/public/decks/{deck_id}/import"))
            assert imported.status_code == 200, imported.text
            assert imported.json()["is_public"] is False
            duplicate = importer.post(api_url(f"/public/decks/{deck_id}/import"))
            assert duplicate.status_code == 409, duplicate.text

        private = owner.post(api_url(f"/decks/{deck_id}/unpublish"))
        assert private.status_code == 200, private.text
        assert private.json()["is_public"] is False
