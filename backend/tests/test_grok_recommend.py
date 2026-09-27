from app.services.grok import recommend_mode


def test_recommend_mode_skips_without_key(monkeypatch) -> None:
    monkeypatch.setattr("app.services.grok.settings.grok_api_key", None)
    monkeypatch.setattr("app.services.grok.settings.xai_api_key", None)
    result = recommend_mode(
        "A",
        "B",
        [
            {
                "mode": "walking",
                "duration_minutes": 30,
                "cost_usd": 0,
                "transfers": 0,
                "wait_minutes": 0,
                "ease_score": 7,
                "summary": "walk",
            }
        ],
    )
    assert result is None
