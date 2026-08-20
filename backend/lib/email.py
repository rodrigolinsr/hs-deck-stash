"""Transactional email delivery through Resend."""
from __future__ import annotations

import logging
import os
from html import escape

import resend

logger = logging.getLogger(__name__)


def _settings() -> tuple[str, str] | None:
    # Delivery is opt-in: tests and local development must never accidentally send
    # real email merely because a developer has a Resend key in their environment.
    if os.environ.get("EMAIL_DELIVERY_ENABLED", "false").casefold() != "true":
        logger.info("Transactional email skipped: delivery is disabled")
        return None
    api_key = os.environ.get("RESEND_API_KEY")
    sender = os.environ.get("EMAIL_FROM")
    if not api_key or not sender:
        logger.warning("Transactional email skipped: RESEND_API_KEY or EMAIL_FROM is not configured")
        return None
    resend.api_key = api_key
    return sender, os.environ.get("APP_BASE_URL", "http://localhost:3000").rstrip("/")


async def send_verification_email(email: str, token: str) -> None:
    settings = _settings()
    if not settings:
        return
    sender, base_url = settings
    link = f"{base_url}/verify-email?token={token}"
    await resend.Emails.send_async({
        "from": sender, "to": [email], "subject": "Verify your HSDeckStash email",
        "html": f"<p>Welcome to HSDeckStash.</p><p><a href=\"{escape(link, quote=True)}\">Verify your email address</a></p><p>This link expires in 24 hours.</p>",
        "text": f"Welcome to HSDeckStash. Verify your email: {link}\n\nThis link expires in 24 hours.",
    })


async def send_password_reset_email(email: str, token: str) -> None:
    settings = _settings()
    if not settings:
        return
    sender, base_url = settings
    link = f"{base_url}/reset-password?token={token}"
    await resend.Emails.send_async({
        "from": sender, "to": [email], "subject": "Reset your HSDeckStash password",
        "html": f"<p>We received a request to reset your HSDeckStash password.</p><p><a href=\"{escape(link, quote=True)}\">Choose a new password</a></p><p>This link expires in one hour. If you did not request this, you can ignore this email.</p>",
        "text": f"Reset your HSDeckStash password: {link}\n\nThis link expires in one hour. If you did not request this, you can ignore this email.",
    })
