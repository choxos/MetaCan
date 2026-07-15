from ml.features import PAYLOAD_FRAME_PARITY, assert_payload_parity, render


def test_render_excludes_abstract_and_doi_when_frame_contract_is_used() -> None:
    # Given
    record = {
        "id": "W1",
        "doi": "10.1000/secret",
        "title": "Visible title",
        "abstract": "HIDDEN ABSTRACT TOKEN",
        "venue": "Visible Venue",
        "topic": None,
        "field": "Medicine",
        "lang": "en",
        "type": "article",
        "year": 2024,
    }

    # When
    assert_payload_parity(PAYLOAD_FRAME_PARITY)
    rendered = render(record, PAYLOAD_FRAME_PARITY)

    # Then
    assert "Visible title" in rendered
    assert "HIDDEN ABSTRACT TOKEN" not in rendered
    assert "10.1000/secret" not in rendered
