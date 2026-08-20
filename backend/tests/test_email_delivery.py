"""Transactional email uses a mocked Resend client; no test performs network delivery."""
from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch

from lib import email


def test_verification_email_uses_resend_sdk_without_network(monkeypatch):
    monkeypatch.setenv("EMAIL_DELIVERY_ENABLED", "true")
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
    monkeypatch.setenv("EMAIL_FROM", "HSDeckStash <hello@example.com>")
    monkeypatch.setenv("APP_BASE_URL", "https://decks.example.com")
    send = AsyncMock(return_value={"id": "email_test"})

    with patch.object(email.resend.Emails, "send_async", send):
        asyncio.run(email.send_verification_email("keeper@example.com", "safe-token"))

    send.assert_awaited_once()
    params = send.await_args.args[0]
    assert params["to"] == ["keeper@example.com"]
    assert "https://decks.example.com/verify-email?token=safe-token" in params["html"]
