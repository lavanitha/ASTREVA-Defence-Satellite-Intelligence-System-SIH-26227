import sys
import requests

from ingestion.cdse.auth import get_access_token


PRODUCT_ID = sys.argv[1]

BASE_URL = (
    f"https://catalogue.dataspace.copernicus.eu/odata/v1/Products"
    f"({PRODUCT_ID})"
)

NODES_URL = (
    f"https://catalogue.dataspace.copernicus.eu/odata/v1/Products"
    f"({PRODUCT_ID})/Nodes"
)


def main():

    token = get_access_token()

    headers = {
        "Authorization": f"Bearer {token}"
    }

    print("Product:", PRODUCT_ID)
    print()
    print("Querying product nodes...")

    response = requests.get(
        NODES_URL,
        headers=headers,
        timeout=60,
    )

    print("HTTP status:", response.status_code)

    if not response.ok:
        print(response.text)

    response.raise_for_status()

    data = response.json()

    nodes = data.get("result", data.get("value", []))

    print()
    print("=" * 80)
    print("ROOT NODES")
    print("=" * 80)

    for node in nodes:
        print(node)


if __name__ == "__main__":
    main()
