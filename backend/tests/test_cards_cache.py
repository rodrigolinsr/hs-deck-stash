from lib.cards import _should_cache


def test_cache_includes_noncollectible_cards_that_can_appear_in_deckstrings():
    assert _should_cache({"collectible": False, "type": "WEAPON"})
    assert _should_cache({"collectible": False, "type": "SPELL"})
    assert _should_cache({"collectible": False, "type": "MINION"})
    assert _should_cache({"collectible": True, "type": "ENCHANTMENT"})
    assert not _should_cache({"collectible": False, "type": "ENCHANTMENT"})
