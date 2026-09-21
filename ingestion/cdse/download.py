import os
from pathlib import Path

import requests

from ingestion.cdse.auth import get_access_token


BASE_URL = "https://download.dataspace.copernicus.eu"


def download_node(
    product_id: str,
    node_path: str,
    output_path: str,
    chunk_size: int = 8 * 1024 * 1024,
):
    """
    Download a CDSE product node using an authenticated access token.

    node_path should look like:
    /Nodes(SAFE)/Nodes(measurement)/Nodes(filename.tiff)/$value
    """

    url = (
        f"{BASE_URL}/odata/v1/Products({product_id})"
        f"{node_path}"
    )

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)

    token = get_access_token()

    headers = {
        "Authorization": f"Bearer {token}"
    }

    existing_size = output.stat().st_size if output.exists() else 0

    if existing_size > 0:
        headers["Range"] = f"bytes={existing_size}-"
        print(f"Resuming download from byte {existing_size:,}")
    else:
        print("Starting new download...")

    with requests.get(
        url,
        headers=headers,
        stream=True,
        timeout=120,
    ) as response:

        if existing_size > 0 and response.status_code == 416:
            print("File already appears to be complete.")
            return

        response.raise_for_status()

        if existing_size > 0 and response.status_code == 206:
            mode = "ab"
        else:
            mode = "wb"
            existing_size = 0

        total = response.headers.get("Content-Length")

        if total:
            total = int(total) + existing_size
            print(f"Total size: {total / (1024**3):.2f} GB")

        downloaded = existing_size

        with open(output, mode) as f:
            for chunk in response.iter_content(chunk_size=chunk_size):

                if not chunk:
                    continue

                f.write(chunk)
                downloaded += len(chunk)

                if total:
                    percent = downloaded / total * 100
                    print(
                        f"\rDownloaded: "
                        f"{downloaded / (1024**2):,.1f} MB "
                        f"({percent:.1f}%)",
                        end="",
                        flush=True,
                    )

        print("\nDownload complete.")
        print(f"Saved to: {output}")


if __name__ == "__main__":

    PRODUCT_ID = "80645f56-4001-4507-84a7-0311169bd738"

    SAFE = (
        "S1D_IW_GRDH_1SDV_20260913T005021_20260913T005046_"
        "004552_008782_47E5.SAFE"
    )

    FILENAME = (
        "s1d-iw-grd-vv-20260913t005021-20260913t005046-"
        "004552-008782-001.tiff"
    )

    node_path = (
        f"/Nodes({SAFE})"
        f"/Nodes(measurement)"
        f"/Nodes({FILENAME})"
        f"/$value"
    )

    output_path = (
        "data/raw/sentinel1/"
        "2026-09-13/"
        "S1D_T43SGS/"
        "VV.tiff"
    )

    download_node(
        product_id=PRODUCT_ID,
        node_path=node_path,
        output_path=output_path,
    )
