import os
import requests


TOKEN_URL = (
    "https://identity.dataspace.copernicus.eu"
    "/auth/realms/CDSE/protocol/openid-connect/token"
)


def get_access_token():
    username = os.environ.get("CDSE_USERNAME")
    password = os.environ.get("CDSE_PASSWORD")

    if not username or not password:
        raise RuntimeError(
            "CDSE_USERNAME and CDSE_PASSWORD environment variables are required."
        )

    data = {
        "client_id": "cdse-public",
        "grant_type": "password",
        "username": username,
        "password": password,
    }

    response = requests.post(
        TOKEN_URL,
        data=data,
        timeout=60,
    )

    response.raise_for_status()

    token_data = response.json()

    return token_data["access_token"]
