import json
import re
from pathlib import Path

import requests

from ingestion.cdse.auth import get_access_token


CATALOGUE_URL = (
    "https://catalogue.dataspace.copernicus.eu/odata/v1/Products"
)

# Northern India Development AOI
MIN_LON = 77.90
MIN_LAT = 32.55
MAX_LON = 78.15
MAX_LAT = 32.75

START_DATE = "2026-09-10T00:00:00.000Z"
END_DATE = "2026-09-17T23:59:59.999Z"

OUTPUT_FILE = Path("data/raw/sentinel2/catalogue.json")


def parse_product_name(name):
    """
    Extract useful Sentinel-2 metadata from SAFE product name.
    """

    match = re.match(
        r"(S2[A-C])_"
        r"(MSIL[12]A)_"
        r"(\d{8}T\d{6})_"
        r"N(\d{4})_"
        r"R(\d{3})_"
        r"(T\d{2}[A-Z]{3})_",
        name,
    )

    if not match:
        return {
            "platform": None,
            "processing_level": None,
            "sensing_time": None,
            "processing_baseline": None,
            "relative_orbit": None,
            "tile": None,
        }

    return {
        "platform": match.group(1),
        "processing_level": match.group(2),
        "sensing_time": match.group(3),
        "processing_baseline": match.group(4),
        "relative_orbit": match.group(5),
        "tile": match.group(6),
    }


def main():

    token = get_access_token()

    headers = {
        "Authorization": f"Bearer {token}"
    }

    polygon = (
        f"POLYGON(("
        f"{MIN_LON} {MIN_LAT}, "
        f"{MAX_LON} {MIN_LAT}, "
        f"{MAX_LON} {MAX_LAT}, "
        f"{MIN_LON} {MAX_LAT}, "
        f"{MIN_LON} {MIN_LAT}"
        f"))"
    )

    aoi = (
        f"geography'SRID=4326;"
        f"{polygon}'"
    )

    filter_query = (
        "Collection/Name eq 'SENTINEL-2' "
        "and "
        f"OData.CSC.Intersects(area={aoi}) "
        "and "
        f"ContentDate/Start ge {START_DATE} "
        "and "
        f"ContentDate/Start le {END_DATE}"
    )

    params = {
        "$filter": filter_query,
        "$orderby": "ContentDate/Start desc",
        "$top": "20",
        "$select": (
            "Id,"
            "Name,"
            "ContentDate,"
            "Online,"
            "GeoFootprint"
        ),
    }

    print("Querying CDSE catalogue...")
    print()
    print("AOI:")
    print(polygon)
    print()
    print("Date range:")
    print(START_DATE, "→", END_DATE)
    print()

    response = requests.get(
        CATALOGUE_URL,
        params=params,
        headers=headers,
        timeout=60,
    )

    print("HTTP status:", response.status_code)

    if not response.ok:
        print("CDSE response:")
        print(response.text)

    response.raise_for_status()

    products = response.json().get("value", [])

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    records = []

    for product in products:

        name = product.get("Name", "")
        metadata = parse_product_name(name)

        record = {
            "id": product.get("Id"),
            "name": name,
            "acquisition": product.get("ContentDate", {}).get("Start"),
            "online": product.get("Online"),
            "geofootprint": product.get("GeoFootprint"),
            **metadata,
        }

        records.append(record)

    output = {
        "query": {
            "aoi": {
                "min_lon": MIN_LON,
                "min_lat": MIN_LAT,
                "max_lon": MAX_LON,
                "max_lat": MAX_LAT,
            },
            "start_date": START_DATE,
            "end_date": END_DATE,
        },
        "products": records,
    }

    OUTPUT_FILE.write_text(
        json.dumps(output, indent=2),
        encoding="utf-8",
    )

    print()
    print("=" * 80)
    print(f"Found {len(records)} Sentinel-2 products")
    print("=" * 80)

    for i, product in enumerate(records, 1):

        print()
        print(f"[{i}]")
        print("Name:", product["name"])
        print("ID:", product["id"])
        print("Acquisition:", product["acquisition"])
        print("Level:", product["processing_level"])
        print("Tile:", product["tile"])
        print("Platform:", product["platform"])
        print("Online:", product["online"])

    print()
    print("=" * 80)
    print("Catalogue saved to:")
    print(OUTPUT_FILE)
    print("=" * 80)


if __name__ == "__main__":
    main()
