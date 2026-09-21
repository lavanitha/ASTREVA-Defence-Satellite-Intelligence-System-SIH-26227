import sys
from pathlib import Path

from ingestion.cdse.download import download_node


PRODUCT_ID = "25762560-2907-416a-8218-88d2559d3812"

SAFE = (
    "S2B_MSIL2A_20260915T052639_N0512_R105_T43SGS_"
    "20260915T092127.SAFE"
)

GRANULE = "L2A_T43SGS_A049752_20260915T053807"

BANDS = {
    "B02_10m": "T43SGS_20260915T052639_B02_10m.jp2",
    "B03_10m": "T43SGS_20260915T052639_B03_10m.jp2",
    "B04_10m": "T43SGS_20260915T052639_B04_10m.jp2",
    "B08_10m": "T43SGS_20260915T052639_B08_10m.jp2",

    "B11_20m": "T43SGS_20260915T052639_B11_20m.jp2",
    "B12_20m": "T43SGS_20260915T052639_B12_20m.jp2",
    "SCL_20m": "T43SGS_20260915T052639_SCL_20m.jp2",
}


def main():

    output_dir = Path("data/raw/sentinel2/2026-09-15/T43SGS")
    output_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 80)
    print("SENTINEL-2 L2A BAND DOWNLOAD")
    print("=" * 80)
    print()
    print("Product:", SAFE)
    print("Granule:", GRANULE)
    print()

    for band, filename in BANDS.items():

        node_path = (
            f"/Nodes({SAFE})"
            f"/Nodes(GRANULE)"
            f"/Nodes({GRANULE})"
            f"/Nodes(IMG_DATA)"
        )

        if "_10m" in filename:
            node_path += "/Nodes(R10m)"
        else:
            node_path += "/Nodes(R20m)"

        node_path += f"/Nodes({filename})/$value"

        output_path = output_dir / filename

        print()
        print("-" * 80)
        print(f"Downloading {band}")
        print("Source:", node_path)
        print("Output:", output_path)
        print("-" * 80)

        download_node(
            product_id=PRODUCT_ID,
            node_path=node_path,
            output_path=str(output_path),
        )


if __name__ == "__main__":
    main()
