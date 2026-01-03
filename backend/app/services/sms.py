import requests
from typing import Any, Dict, List


class SMSIRClient:
    BASE_URL = "https://api.sms.ir/v1/send/verify"

    def __init__(self, api_key: str, timeout: int = 10):
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "Accept": "text/plain",
            "X-API-KEY": api_key,
        })
        self.timeout = timeout

    def send_verification(
        self,
        mobile: str,
        template_id: int,
        parameters: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        payload = {
            "Mobile": mobile,
            "TemplateId": template_id,
            "Parameters": parameters,
        }

        response = self.session.post(
            self.BASE_URL,
            json=payload,
            timeout=self.timeout,
        )
        # Helpful debugging if it fails again
        if not response.ok:
            raise RuntimeError(
                f"SMS.ir error {response.status_code}: {response.text}"
            )
        response.raise_for_status()
        return response.json()