from lib.hsreplay import index_records, match_record


def test_matches_an_exact_main_deck_and_sideboard():
    payload = {
        "series": {
            "data": {
                "HUNTER": [{
                    "deck_id": "matching-deck",
                    "deck_list": "[[10,2],[20,1]]",
                    "deck_sideboard": "[[20,[30,1],[40,2]]]",
                    "total_games": 100,
                    "win_rate": 55.5,
                }]
            }
        }
    }

    record = match_record(
        index_records(payload),
        [{"dbf_id": 20, "count": 1}, {"dbf_id": 10, "count": 2}],
        [
            {"dbf_id": 40, "count": 2, "owner_dbf_id": 20},
            {"dbf_id": 30, "count": 1, "owner_dbf_id": 20},
        ],
    )

    assert record is not None
    assert record["deck_id"] == "matching-deck"


def test_does_not_match_when_only_the_sideboard_differs():
    payload = {
        "series": {
            "data": {
                "HUNTER": [{
                    "deck_id": "matching-deck",
                    "deck_list": "[[10,2]]",
                    "deck_sideboard": "[[10,[20,1]]]",
                    "total_games": 100,
                }]
            }
        }
    }

    record = match_record(
        index_records(payload),
        [{"dbf_id": 10, "count": 2}],
        [{"dbf_id": 21, "count": 1, "owner_dbf_id": 10}],
    )

    assert record is None
