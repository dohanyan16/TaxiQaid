"""Verify the known synthetic browser-test PDF artifacts, never private production schedules."""
import argparse
import datetime
import json
import re
import zipfile
from pathlib import Path

import fitz


def verify(data, iqama, week, expected_coordinates):
    document = fitz.open(stream=data, filetype="pdf")
    assert len(document) == 1, "Expected one landscape schedule page"
    page = document[0]
    assert abs(page.rect.width - 841.89) < 1 and abs(page.rect.height - 595.28) < 1
    assert page.get_images(), "TaxiQaid logo missing"
    text = page.get_text()
    assert set(re.findall(r"\b\d{10}\b", text)) == {iqama}, "Wrong personal identity"
    for label in ["WEEKLY SCHEDULE", "Driver Name:", "Driver Iqama:", "Car", "Starting Hour", "Ending Hour", "Starting Zone", "Petrol Station", "Not Configured"]:
        assert label in text, "Missing English label: " + label
    for label in ["Jam Mulai", "Jam Berakhir", "Zona Awal", "Pompa Bensin"]:
        assert label not in text, "Legacy translated label present"
    assert "00:30" not in text, "Invented reference station time"
    for day in range(7):
        date = datetime.date.fromisoformat(week) + datetime.timedelta(days=day)
        assert date.strftime("%d/%m/%Y") in text
    green = [item for item in page.get_drawings() if item.get("fill") and abs(item["fill"][0] - 146 / 255) < .01 and abs(item["fill"][1] - 208 / 255) < .01]
    assert len(green) == 5, "Rest Day must be green in all five rows"
    links = page.get_links()
    assert len(links) >= 6, "Missing map annotations"
    for link in links:
        uri = link.get("uri", "")
        assert uri.startswith("https://www.google.com/maps/search/?api=1&query=")
        coordinates = tuple(map(float, uri.split("query=", 1)[1].split(",")))
        assert coordinates == expected_coordinates, "Map points to another destination"
    # PDF text coordinates must stay on the page and text lines must not intersect the page edge.
    for block in page.get_text("dict")["blocks"]:
        if block["type"] != 0:
            continue
        for line in block["lines"]:
            x0, y0, x1, y1 = line["bbox"]
            assert 0 <= x0 < x1 <= page.rect.width and 0 <= y0 < y1 <= page.rect.height
    document.close()
    return len(links)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("output_dir", type=Path)
    arguments = parser.parse_args()
    catalog = json.loads((Path(__file__).parent.parent / "modules/people/roster/locations.json").read_text())
    stop = next(item for item in catalog["locations"] if item["name"] == "Kuday 1")
    destination = (stop["latitude"], stop["longitude"])
    annotations = verify((arguments.output_dir / "synthetic-personal.pdf").read_bytes(), "9000000000", "2026-11-08", destination)
    annotations += verify((arguments.output_dir / "resolved-personal.pdf").read_bytes(), "9000000000", "2026-11-08", (21.123, 39.456))
    with zipfile.ZipFile(arguments.output_dir / "synthetic-large-week.zip") as archive:
        assert len(archive.namelist()) == 812
        for filename in archive.namelist():
            identity = filename.split("_", 1)[0]
            annotations += verify(archive.read(filename), identity, "2026-11-15", destination)
    long_manifest = json.loads((arguments.output_dir / "synthetic-long-manifest.json").read_text())
    long_document = fitz.open(arguments.output_dir / "synthetic-long-personal.pdf")
    assert len(long_document) == 1
    long_page = long_document[0]
    long_text = " ".join(long_page.get_text().split())
    for value in long_manifest.values():
        assert " ".join(value.split()) in long_text, "A long source value was lost"
    depot = next(item for item in catalog["locations"] if item["name"] == "DEPOT")
    long_destinations = {tuple(map(float, item["uri"].split("query=", 1)[1].split(","))) for item in long_page.get_links()}
    assert long_destinations == {(10.0, 20.0), (21.123, 39.456), (depot["latitude"], depot["longitude"])}
    assert "01:45" in long_text
    for block in long_page.get_text("dict")["blocks"]:
        if block["type"] == 0:
            for line in block["lines"]:
                x0, y0, x1, y1 = line["bbox"]
                assert 0 <= x0 < x1 <= long_page.rect.width and 0 <= y0 < y1 <= long_page.rect.height
    annotations += len(long_page.get_links())
    long_document.close()
    print(json.dumps({"result": "PASS", "syntheticPDFs": 815, "landscapeA4": True, "englishLabels": True, "greenRestCells": True, "verifiedMapAnnotations": annotations, "pageBounds": True}))


if __name__ == "__main__":
    main()
