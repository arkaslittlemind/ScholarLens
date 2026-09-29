from app.ops.prometheus import _points


def test_points_parse_prometheus_string_pairs():
    assert _points([[1700000000.5, "1.25"], ["1700000060", "0"]]) == [
        (1700000000, 1.25),
        (1700000060, 0.0),
    ]


def test_non_finite_values_become_none():
    points = _points([[1, "NaN"], [2, "+Inf"], [3, "-Inf"]])
    assert [value for _, value in points] == [None, None, None]
