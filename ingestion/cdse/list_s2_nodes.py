import sys
import requests

from ingestion.cdse.auth import get_access_token


BASE_URL = "https://download.dataspace.copernicus.eu/odata/v1/Products"


def list_nodes(url, headers, prefix=""):
    response = requests.get(
        url,
        headers=headers,
        timeout=60,
    )

    if not response.ok:
        print("\nHTTP status:", response.status_code)
        print(response.text)
        response.raise_for_status()

    data = response.json()

    # CDSE Nodes API returns the children under "result"
    nodes = data.get("result", [])

    for node in nodes:

        name = node.get("Name")
        children = node.get("ChildrenNumber", 0)

        print(f"{prefix}{name} (children={children})")

        if children > 0:
            child_url = node["Nodes"]["uri"]

            list_nodes(
                child_url,
                headers,
                prefix + "  "
            )


def main():

    if len(sys.argv) != 3:
        print(
            "Usage:\n"
            "python -m ingestion.cdse.list_s2_nodes "
            "<PRODUCT_ID> <SAFE_NAME>"
        )
        sys.exit(1)

    product_id = sys.argv[1]
    safe_name = sys.argv[2]

    token = get_access_token()

    headers = {
        "Authorization": f"Bearer {token}"
    }

    root_url = (
        f"{BASE_URL}({product_id})"
        f"/Nodes({safe_name})/Nodes"
    )

    print("=" * 80)
    print("SENTINEL-2 PRODUCT TREE")
    print("=" * 80)
    print()

    list_nodes(root_url, headers)


if __name__ == "__main__":
    main()
