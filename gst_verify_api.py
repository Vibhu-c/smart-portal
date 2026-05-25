from __future__ import annotations

import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


GST_VERIFICATION_REPO_URL = "https://github.com/shubham-dube/GST-Verification-API"
GST_VERIFICATION_LICENSE_URL = "https://github.com/shubham-dube/GST-Verification-API/blob/main/LICENSE"
GSTVERIFY_BASE_URL = os.getenv("GSTVERIFY_BASE_URL", "https://api.gstverify.dubey.app").rstrip("/")
GSTVERIFY_API_KEY = os.getenv("GSTVERIFY_API_KEY", "").strip()
LOCAL_GST_VERIFY_API_URL = os.getenv("GST_VERIFICATION_API_URL", "").rstrip("/")

GST_STATE_NAMES = {
    "01": "Jammu and Kashmir",
    "02": "Himachal Pradesh",
    "03": "Punjab",
    "04": "Chandigarh",
    "05": "Uttarakhand",
    "06": "Haryana",
    "07": "Delhi",
    "08": "Rajasthan",
    "09": "Uttar Pradesh",
    "10": "Bihar",
    "11": "Sikkim",
    "12": "Arunachal Pradesh",
    "13": "Nagaland",
    "14": "Manipur",
    "15": "Mizoram",
    "16": "Tripura",
    "17": "Meghalaya",
    "18": "Assam",
    "19": "West Bengal",
    "20": "Jharkhand",
    "21": "Odisha",
    "22": "Chhattisgarh",
    "23": "Madhya Pradesh",
    "24": "Gujarat",
    "27": "Maharashtra",
    "29": "Karnataka",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "36": "Telangana",
    "37": "Andhra Pradesh",
}


def get_gst_verify_status():
    return {
        "hosted_configured": bool(GSTVERIFY_API_KEY),
        "local_configured": bool(LOCAL_GST_VERIFY_API_URL),
        "base_url": GSTVERIFY_BASE_URL,
        "local_url": LOCAL_GST_VERIFY_API_URL,
        "repo_url": GST_VERIFICATION_REPO_URL,
        "license_url": GST_VERIFICATION_LICENSE_URL,
        "license": "MIT License, Copyright (c) 2026 Shubham Dube",
        "source_note": "Compatible with the referenced MIT-licensed GST-Verification-API workflow.",
    }


def _get_json(url: str, timeout: int = 20):
    request = Request(url, headers={"Accept": "application/json"}, method="GET")
    try:
        with urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8") or "{}")
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise ValueError(f"GST verification API returned HTTP {exc.code}: {detail}") from exc
    except URLError as exc:
        raise ValueError(f"GST verification API is unreachable: {exc.reason}") from exc


def _post_json(url: str, payload: dict, headers: dict | None = None, timeout: int = 20):
    body = json.dumps(payload).encode("utf-8")
    request = Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            **(headers or {}),
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8") or "{}")
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise ValueError(f"GST verification API returned HTTP {exc.code}: {detail}") from exc
    except URLError as exc:
        raise ValueError(f"GST verification API is unreachable: {exc.reason}") from exc


def fetch_local_gst_captcha():
    if not LOCAL_GST_VERIFY_API_URL:
        raise ValueError("Set GST_VERIFICATION_API_URL to your local GST-Verification-API server URL first.")
    return _get_json(f"{LOCAL_GST_VERIFY_API_URL}/api/v1/getCaptcha")


def fetch_gst_taxpayer_details(gstin: str, captcha: str = "", session_id: str = ""):
    normalized_gstin = (gstin or "").strip().upper()
    if not normalized_gstin:
        raise ValueError("GSTIN is required for verification.")

    if GSTVERIFY_API_KEY:
        return _post_json(
            f"{GSTVERIFY_BASE_URL}/api/v1/gst/details",
            {
                "gstin": normalized_gstin,
                "GSTIN": normalized_gstin,
                "captcha": captcha.strip(),
                "sessionId": session_id.strip(),
            },
            headers={"X-API-Key": GSTVERIFY_API_KEY},
        )

    if LOCAL_GST_VERIFY_API_URL:
        if not captcha.strip() or not session_id.strip():
            raise ValueError("Local GST verification requires captcha and session id from /api/v1/getCaptcha.")
        return _post_json(
            f"{LOCAL_GST_VERIFY_API_URL}/api/v1/getGSTDetails",
            {
                "GSTIN": normalized_gstin,
                "gstin": normalized_gstin,
                "captcha": captcha.strip(),
                "sessionId": session_id.strip(),
            },
        )

    raise ValueError(
        "GST verification is not configured. Set GSTVERIFY_API_KEY for the hosted API, "
        "or GST_VERIFICATION_API_URL for a compatible local GST verification API server."
    )


def build_taxpayer_prefill(api_payload: dict):
    payload = api_payload or {}
    principal = payload.get("pradr") or {}
    if isinstance(principal, dict):
        principal_place = principal.get("adr") or principal.get("addr") or ""
    else:
        principal_place = str(principal)

    state_name = payload.get("stj") or payload.get("state") or payload.get("stateName") or ""
    legal_name = payload.get("lgnm") or payload.get("legalName") or payload.get("legal_name") or ""
    trade_name = payload.get("tradeNam") or payload.get("tradeName") or payload.get("trade_name") or legal_name
    business_type = payload.get("ctb") or payload.get("dty") or payload.get("businessType") or "Registered Taxpayer"
    status = payload.get("sts") or payload.get("status") or "Active"
    gstin = (payload.get("gstin") or payload.get("GSTIN") or "").strip().upper()

    return {
        "company_name": legal_name,
        "trade_name": trade_name,
        "gstin": gstin,
        "state_code": gstin[:2] if gstin else "",
        "state_name": state_name,
        "business_type": business_type,
        "registration_status": "Active" if str(status).lower() == "active" else status,
        "principal_place": principal_place,
        "auth_signatory": "",
    }


def build_local_taxpayer_prefill(gstin: str, existing_company: dict | None = None):
    normalized_gstin = (gstin or "").strip().upper()
    if existing_company:
        return {
            "company_name": existing_company.get("company_name") or "",
            "trade_name": existing_company.get("trade_name") or existing_company.get("company_name") or "",
            "gstin": existing_company.get("gstin") or normalized_gstin,
            "state_code": existing_company.get("state_code") or normalized_gstin[:2],
            "state_name": existing_company.get("state_name") or GST_STATE_NAMES.get(normalized_gstin[:2], ""),
            "business_type": existing_company.get("business_type") or "Registered Taxpayer",
            "registration_status": existing_company.get("registration_status") or "Active",
            "principal_place": existing_company.get("principal_place") or "",
            "auth_signatory": existing_company.get("auth_signatory") or "",
        }

    return {
        "company_name": "",
        "trade_name": "",
        "gstin": normalized_gstin,
        "state_code": normalized_gstin[:2],
        "state_name": GST_STATE_NAMES.get(normalized_gstin[:2], ""),
        "business_type": "Registered Taxpayer",
        "registration_status": "Active",
        "principal_place": "",
        "auth_signatory": "",
    }
