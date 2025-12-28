#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import random
import string
import sys
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple

import requests
from faker import Faker


# ----------------------------
# Low-level API client
# ----------------------------

@dataclass
class ApiConfig:
    base_url: str
    otp_code: str = "000000"  # debug default
    timeout_s: float = 20.0


class ApiError(RuntimeError):
    pass


class ApplyApiClient:
    def __init__(self, cfg: ApiConfig, token: Optional[str] = None):
        self.cfg = cfg
        self.token = token

    def with_token(self, token: str) -> "ApplyApiClient":
        return ApplyApiClient(self.cfg, token=token)

    def _url(self, path: str) -> str:
        return self.cfg.base_url.rstrip("/") + path

    def _headers(self, extra: Optional[Dict[str, str]] = None) -> Dict[str, str]:
        h: Dict[str, str] = {"Accept": "application/json"}
        if self.token:
            h["Authorization"] = f"Bearer {self.token}"
        if extra:
            h.update(extra)
        return h

    def request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        json_body: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
        files: Optional[Dict[str, Any]] = None,
        expected: Tuple[int, ...] = (200,),
    ) -> Any:
        url = self._url(path)
        try:
            r = requests.request(
                method=method.upper(),
                url=url,
                params=params,
                json=json_body,
                data=data,
                files=files,
                headers=self._headers(),
                timeout=self.cfg.timeout_s,
            )
        except requests.RequestException as e:
            raise ApiError(f"Request failed {method} {url}: {e}") from e

        if r.status_code not in expected:
            body = r.text
            raise ApiError(
                f"Unexpected status {r.status_code} for {method} {url}\n"
                f"Expected: {expected}\n"
                f"Response: {body[:2000]}"
            )

        if r.status_code == 204:
            return None

        ct = (r.headers.get("content-type") or "").lower()
        if "application/json" in ct:
            return r.json()
        try:
            return r.json()
        except Exception:
            return r.text


# ----------------------------
# Fake data factory
# ----------------------------

class DataFactory:
    def __init__(self, seed: int):
        self.faker = Faker()
        Faker.seed(seed)
        random.seed(seed)

        self.home_universities = [
            "Islamic Azad University, Science and Research Branch",
            "University of Tehran",
            "Sharif University of Technology",
            "Amirkabir University of Technology",
            "Tarbiat Modares University",
        ]
        self.home_majors = [
            "Computer Engineering",
            "Computer Science",
            "Data Science",
            "Electrical Engineering",
            "Software Engineering",
            "Artificial Intelligence",
        ]
        self.target_countries = [
            ("Netherlands", ["Amsterdam", "Delft", "Eindhoven", "Utrecht"]),
            ("France", ["Paris", "Lyon", "Grenoble", "Strasbourg"]),
            ("Germany", ["Munich", "Berlin", "Aachen", "Karlsruhe"]),
            ("Italy", ["Milan", "Padua", "Bologna", "Turin"]),
            ("Sweden", ["Stockholm", "Lund", "Gothenburg", "Uppsala"]),
        ]
        self.target_universities = [
            ("Vrije Universiteit Amsterdam", "Netherlands"),
            ("University of Amsterdam", "Netherlands"),
            ("TU Delft", "Netherlands"),
            ("Université Paris Dauphine-PSL", "France"),
            ("Université Grenoble Alpes", "France"),
            ("RWTH Aachen University", "Germany"),
            ("Technical University of Munich", "Germany"),
            ("Politecnico di Milano", "Italy"),
            ("University of Padova", "Italy"),
            ("KTH Royal Institute of Technology", "Sweden"),
        ]
        self.degree_levels = ["masters", "phd", "mba", "postdoc"]
        self.application_statuses = [
            "preparing", "submitted", "under_review", "interview",
            "accepted", "rejected", "waitlisted", "withdrawn",
        ]
        self.activity_types = [
            "work_experience", "research", "teaching_assistant", "volunteer",
            "community_leadership", "publication", "award", "project", "other",
        ]
        self.document_types = [
            "cv", "statement_of_purpose", "motivation_letter",
            "recommendation_letter", "transcript", "certificate", "portfolio", "other",
        ]
        self.test_templates = [
            ("English", "IELTS"),
            ("English", "TOEFL"),
            ("French", "DELF"),
            ("German", "TestDaF"),
        ]

        # Tracker-specific
        self.tracker_statuses = [
            "researching", "preparing", "submitted", "interview",
            "accepted", "rejected", "waitlisted",
        ]
        self.tracker_priorities = ["reach", "target", "safety"]
        self.checklist_templates = [
            ["SOP", "CV", "Transcript", "Recommendation Letters", "Portfolio"],
            ["SOP", "CV", "Transcript", "IELTS/TOEFL", "GRE (if needed)"],
            ["Motivation Letter", "CV", "Transcript", "Recommendation Letters"],
        ]

    def phone_ir_like(self) -> str:
        return "+98" + "9" + "".join(random.choice(string.digits) for _ in range(10))

    def applicant_create(self) -> Dict[str, Any]:
        graduation_year = random.randint(2019, 2025)
        degree_level = random.choice(["Bachelor's", "Master's", "PhD"])
        is_anonymous = random.random() < 0.3
        is_premium = random.random() < 0.25

        display_name = (
            self.faker.first_name() + " " + self.faker.last_name()
            if not is_anonymous
            else self.faker.user_name()
        )

        gpa_scale = random.choice(["4.0", "20", "100"])
        if gpa_scale == "4.0":
            overall_gpa = f"{round(random.uniform(2.8, 3.95), 2)}/4.0"
        elif gpa_scale == "20":
            overall_gpa = f"{round(random.uniform(14.0, 19.7), 1)}/20"
        else:
            overall_gpa = f"{random.randint(70, 97)}/100"

        return {
            "display_name": display_name[:100],
            "is_anonymous": is_anonymous,
            "is_premium": is_premium,
            "view_price": 50 if is_premium else 20,
            "university": random.choice(self.home_universities)[:200],
            "faculty": random.choice(["Engineering", "Computer Engineering", "Science", None]),
            "major": random.choice(self.home_majors)[:200],
            "degree_level": degree_level[:50],
            "graduation_year": graduation_year,
            "overall_gpa": overall_gpa,
            "last_two_years_gpa": None,
            "gpa_scale": gpa_scale,
            "bio": self.faker.text(max_nb_chars=250)[:1000],
            "email": self.faker.email() if not is_anonymous else None,
        }

    def language_credential(self) -> Dict[str, Any]:
        language, test_type = random.choice(self.test_templates)

        if test_type == "IELTS":
            overall = round(random.choice([6.0, 6.5, 7.0, 7.5, 8.0, 8.5]), 1)
            subs = [overall + random.choice([-0.5, 0, 0.5]) for _ in range(4)]
            subs = [max(4.5, min(9.0, s)) for s in subs]
            overall_str = f"{overall}"
            rs, ws, ss, ls = [f"{s:.1f}" for s in subs]
        elif test_type == "TOEFL":
            overall = random.randint(85, 115)
            subs = [random.randint(18, 30) for _ in range(4)]
            overall_str = str(overall)
            rs, ws, ss, ls = [str(s) for s in subs]
        elif test_type == "DELF":
            overall_str = random.choice(["B1", "B2", "C1"])
            rs = ws = ss = ls = None
        else:  # TestDaF
            overall_str = random.choice(["TDN3", "TDN4", "TDN5"])
            rs = ws = ss = ls = None

        test_date = date.today() - timedelta(days=random.randint(30, 900))
        valid_until = test_date + timedelta(days=2 * 365)

        return {
            "language": language[:50],
            "test_type": test_type[:50],
            "overall_score": overall_str[:20],
            "reading_score": rs,
            "writing_score": ws,
            "speaking_score": ss,
            "listening_score": ls,
            "test_date": test_date.isoformat(),
            "valid_until": valid_until.isoformat(),
            "notes": random.choice([
                "Prepared using online mock tests and weekly speaking practice.",
                "Focus on writing task structure and time management.",
                "Took the exam after 3 months of intensive study.",
                None,
            ]),
        }

    def activity(self) -> Dict[str, Any]:
        activity_type = random.choice(self.activity_types)
        org = random.choice([
            "University Lab", "Startup", "Research Group", "NGO",
            "Student Association", "Tech Community", "Company",
        ])
        title = random.choice([
            "Research Assistant", "Backend Engineer Intern", "Teaching Assistant",
            "Volunteer Coordinator", "Project Lead", "Contributor",
        ])
        start = date.today() - timedelta(days=random.randint(200, 1500))
        ongoing = random.random() < 0.3
        end = None if ongoing else start + timedelta(days=random.randint(60, 600))

        return {
            "activity_type": activity_type,
            "title": title[:200],
            "organization": org[:200],
            "location": random.choice(["Tehran, IR", "Remote", "Helsinki, FI", None]),
            "description": self.faker.text(max_nb_chars=400)[:2000],
            "start_date": start.isoformat(),
            "end_date": None if end is None else end.isoformat(),
            "is_ongoing": ongoing,
            "url": random.choice([self.faker.url(), None]),
            "impact_note": random.choice([
                "Strengthened my SOP with concrete impact metrics.",
                "Helped me secure strong recommendation letters.",
                "Built a portfolio project referenced in interviews.",
                None,
            ]),
        }

    def application(
        self,
        *,
        application_year: int,
        known_university: Optional[Dict[str, Any]] = None,
        known_course: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        if known_course:
            program_name = known_course.get("course_name") or "MSc Computer Science"
            degree_level = known_course.get("degree_level") or "masters"
        else:
            program_name = random.choice([
                "MSc Computer Science",
                "MSc Data Science",
                "MSc Artificial Intelligence",
                "MSc Big Data Engineering",
                "PhD Computer Science",
                "MBA Technology Management",
            ])
            degree_level = "phd" if program_name.startswith("PhD") else "masters"

        status = random.choice(self.application_statuses)
        deadline = date(application_year, random.randint(1, 12), random.randint(1, 28))
        submitted = deadline - timedelta(days=random.randint(0, 30)) if status != "preparing" else None

        decision = None
        if status in {"accepted", "rejected", "waitlisted"}:
            decision = deadline + timedelta(days=random.randint(30, 120))

        scholarship_applied = random.random() < 0.55
        scholarship_received = scholarship_applied and (status == "accepted") and (random.random() < 0.45)

        uni_name = None
        country = None
        city = None
        university_id = None

        if known_university:
            uni_name = known_university.get("name")
            country = known_university.get("country")
            city = known_university.get("city")
            university_id = known_university.get("id")
        else:
            uni_name, country = random.choice(self.target_universities)
            cities = [cs for (cty, cs) in self.target_countries if cty == country]
            city = random.choice(cities[0] if cities else ["City"])

        notes = None
        if random.random() < 0.6:
            notes = (
                "Timeline: shortlisting → SOP refinement → submission.\n"
                "Tip: contact profs early, and tailor SOP to lab + curriculum."
            )

        return {
            "university_id": university_id,
            "university_name": uni_name[:200] if uni_name else None,
            "country": country[:100] if country else None,
            "city": city[:100] if city else None,
            "program_name": program_name[:300],
            "department": random.choice(["Computer Science", "Engineering", "AI", None]),
            "degree_level": degree_level,
            "application_year": application_year,
            "application_round": random.choice([f"Fall {application_year}", f"Spring {application_year}", None]),
            "application_deadline": deadline.isoformat(),
            "submitted_date": None if submitted is None else submitted.isoformat(),
            "status": status,
            "decision_date": None if decision is None else decision.isoformat(),
            "scholarship_applied": scholarship_applied,
            "scholarship_received": scholarship_received,
            "scholarship_name": "Merit Scholarship" if scholarship_received else None,
            "scholarship_amount": "Full tuition" if scholarship_received else None,
            "notes": notes,
            "interview_experience": random.choice([
                "Two rounds: technical + motivation. Focused on past projects.",
                None,
            ]),
            "how_found": random.choice(["University website", "Reddit", "Alumni", "Professor's page", None]),
            "would_recommend": random.choice([True, False, None]),
        }

    def university_create(self) -> Dict[str, Any]:
        name, country = random.choice(self.target_universities)
        cities = [cs for (cty, cs) in self.target_countries if cty == country]
        city = random.choice(cities[0] if cities else ["City"])
        return {
            "name": name[:200],
            "country": country[:100],
            "city": city[:100],
            "website": self.faker.url(),
            "logo_url": None,
            "description": self.faker.text(max_nb_chars=300)[:2000],
        }

    def course_create(self, university_id: int) -> Dict[str, Any]:
        degree_level = random.choice(self.degree_levels)
        course_name = random.choice([
            "MSc Computer Science",
            "MSc Data Science",
            "MSc Artificial Intelligence",
            "PhD Computer Science",
            "MBA Technology Management",
        ])
        deadline = date.today() + timedelta(days=random.randint(30, 240))
        return {
            "course_name": course_name[:300],
            "department": random.choice(["Computer Science", "Engineering", "AI", None]),
            "degree_level": "phd" if course_name.startswith("PhD") else degree_level,
            "website_url": self.faker.url(),
            "description": self.faker.text(max_nb_chars=400)[:3000],
            "language_requirements": random.choice(["IELTS 6.5", "TOEFL 90", "DELF B2", None]),
            "minimum_gpa": random.choice(["3.0/4.0", "16/20", None]),
            "application_deadline": deadline.isoformat(),
            "tuition_fees": random.choice(["€12,000/year", "€0 (funded)", "€3,000/year", None]),
            "duration_months": random.choice([12, 18, 24, 36, None]),
            "scholarships_available": random.random() < 0.5,
            "notes": random.choice(["Competitive, apply early.", None]),
            "university_id": university_id,
        }

    def document_upload_payload(
        self, *, used_for_university: Optional[str], used_for_program: Optional[str]
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        doc_type = random.choice(self.document_types)
        title = {
            "cv": "CV",
            "statement_of_purpose": "Statement of Purpose",
            "motivation_letter": "Motivation Letter",
            "recommendation_letter": "Recommendation Letter",
            "transcript": "Transcript",
            "certificate": "Certificate",
            "portfolio": "Portfolio",
            "other": "Document",
        }[doc_type]

        content = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n"
        filename = f"{doc_type}.pdf"
        mime = "application/pdf"
        data = {
            "document_type": doc_type,
            "title": title,
            "description": random.choice([self.faker.sentence(nb_words=10), None]),
            "is_public": random.random() < 0.8,
            "used_for_university": used_for_university,
            "used_for_program": used_for_program,
        }
        files = {
            "file": (filename, BytesIO(content), mime),
        }
        return data, files

    # -------- Tracker payload --------
    def tracked_program_create(
        self,
        *,
        known_university: Optional[Dict[str, Any]] = None,
        known_course: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        status = random.choice(self.tracker_statuses)
        priority = random.choice(self.tracker_priorities)

        # future deadline window (value-first)
        deadline = date.today() + timedelta(days=random.randint(10, 210))

        checklist_names = random.choice(self.checklist_templates)
        checklist = [{"name": n, "done": (random.random() < 0.35)} for n in checklist_names]

        notes = None
        if random.random() < 0.65:
            notes = random.choice([
                "Need to finalize SOP + reach out for recommendations.",
                "Shortlisted. Working on CV + portfolio + transcript translation.",
                "Waiting for GRE decision; focusing on IELTS meanwhile.",
            ])

        if known_course and known_course.get("id"):
            # Use catalog entry: course_id only, backend will infer university/country
            return {
                "course_id": int(known_course["id"]),
                "deadline": deadline.isoformat(),
                "status": status,
                "priority": priority,
                "notes": notes,
                "documents_checklist": checklist,
            }

        # Custom entry
        if known_university:
            uni_name = known_university.get("name") or "Unknown University"
            country = known_university.get("country") or "Unknown Country"
        else:
            uni_name, country = random.choice(self.target_universities)

        custom_program_name = random.choice([
            "MSc Computer Science",
            "MSc Data Science",
            "MSc Artificial Intelligence",
            "MSc Big Data Engineering",
            "PhD Computer Science",
        ])

        return {
            "custom_program_name": custom_program_name,
            "university_name": uni_name,
            "country": country,
            "deadline": deadline.isoformat(),
            "status": status,
            "priority": priority,
            "notes": notes,
            "documents_checklist": checklist,
        }


# ----------------------------
# Seeder orchestrator
# ----------------------------

class Seeder:
    def __init__(self, api: ApplyApiClient, factory: DataFactory, *, verbose: bool = True):
        self.api = api
        self.f = factory
        self.verbose = verbose

    def log(self, msg: str) -> None:
        if self.verbose:
            print(msg, file=sys.stderr)

    # --- Auth flow ---
    def create_user_via_otp(self, phone: str, display_name: Optional[str] = None) -> Dict[str, Any]:
        self.log(f"[auth] send otp -> {phone}")
        _ = self.api.request(
            "POST",
            "/api/v1/auth/send-otp",
            json_body={"phone": phone},
            expected=(200, 422),
        )

        self.log(f"[auth] verify otp -> {phone}")
        resp = self.api.request(
            "POST",
            "/api/v1/auth/verify-otp",
            json_body={"phone": phone, "code": self.api.cfg.otp_code},
            expected=(200,),
        )
        token = resp["access_token"]
        user = resp["user"]

        c = self.api.with_token(token)

        if display_name:
            try:
                _ = c.request(
                    "PATCH",
                    "/api/v1/auth/update-profile",
                    params={"display_name": display_name},
                    expected=(200,),
                )
            except ApiError as e:
                self.log(f"[warn] update-profile failed (continuing): {e}")

        return {"token": token, "user": user}

    # --- Domain creation ---
    def try_create_university(self, client: ApplyApiClient) -> Optional[Dict[str, Any]]:
        payload = self.f.university_create()
        try:
            uni = client.request(
                "POST",
                "/api/v1/universities/",
                json_body=payload,
                expected=(201,),
            )
            self.log(f"[uni] created id={uni.get('id')} name={uni.get('name')}")
            return uni
        except ApiError as e:
            self.log(f"[warn] create_university not allowed or failed (skipping universities): {e}")
            return None

    def try_create_course(self, client: ApplyApiClient, university_id: int) -> Optional[Dict[str, Any]]:
        payload = self.f.course_create(university_id)
        try:
            course = client.request(
                "POST",
                "/api/v1/courses/",
                json_body=payload,
                expected=(201,),
            )
            self.log(f"[course] created id={course.get('id')} uni_id={university_id}")
            return course
        except ApiError as e:
            self.log(f"[warn] create_course not allowed or failed (skipping courses): {e}")
            return None

    # -------- Tracker --------
    def add_tracked_program(
        self,
        client: ApplyApiClient,
        *,
        known_university: Optional[Dict[str, Any]] = None,
        known_course: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        payload = self.f.tracked_program_create(
            known_university=known_university,
            known_course=known_course,
        )
        try:
            tp = client.request(
                "POST",
                "/api/v1/tracker/programs",
                json_body=payload,
                expected=(200, 201),
            )
            self.log(
                f"[tracker] created id={tp.get('id')} "
                f"uni={tp.get('university_name')} status={tp.get('status')}"
            )
            return tp
        except ApiError as e:
            self.log(f"[warn] add_tracked_program failed (skipping tracker): {e}")
            return None

    def create_applicant(self, client: ApplyApiClient) -> Dict[str, Any]:
        payload = self.f.applicant_create()
        applicant = client.request(
            "POST",
            "/api/v1/applicants/",
            json_body=payload,
            expected=(201,),
        )
        self.log(f"[applicant] created id={applicant.get('id')} name={applicant.get('display_name')}")
        return applicant

    def add_language(self, client: ApplyApiClient, applicant_id: int) -> Dict[str, Any]:
        payload = self.f.language_credential()
        lang = client.request(
            "POST",
            f"/api/v1/applicants/{applicant_id}/languages/",
            json_body=payload,
            expected=(201,),
        )
        self.log(f"[lang] applicant_id={applicant_id} id={lang.get('id')} {lang.get('test_type')}")
        return lang

    def add_activity(self, client: ApplyApiClient, applicant_id: int) -> Dict[str, Any]:
        payload = self.f.activity()
        act = client.request(
            "POST",
            f"/api/v1/applicants/{applicant_id}/activities/",
            json_body=payload,
            expected=(201,),
        )
        self.log(f"[activity] applicant_id={applicant_id} id={act.get('id')} {act.get('activity_type')}")
        return act

    def upload_document(
        self,
        client: ApplyApiClient,
        applicant_id: int,
        *,
        used_for_university: Optional[str],
        used_for_program: Optional[str],
    ) -> Dict[str, Any]:
        data, files = self.f.document_upload_payload(
            used_for_university=used_for_university,
            used_for_program=used_for_program,
        )
        doc = client.request(
            "POST",
            f"/api/v1/applicants/{applicant_id}/documents/",
            data=data,
            files=files,
            expected=(201,),
        )
        self.log(f"[doc] applicant_id={applicant_id} id={doc.get('id')} type={doc.get('document_type')}")
        return doc

    def add_application(
        self,
        client: ApplyApiClient,
        applicant_id: int,
        *,
        application_year: int,
        known_university: Optional[Dict[str, Any]],
        known_course: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        payload = self.f.application(
            application_year=application_year,
            known_university=known_university,
            known_course=known_course,
        )
        app = client.request(
            "POST",
            f"/api/v1/applicants/{applicant_id}/applications/",
            json_body=payload,
            expected=(201,),
        )
        self.log(f"[application] applicant_id={applicant_id} id={app.get('id')} status={app.get('status')}")
        return app

    def purchase_access(self, reader_client: ApplyApiClient, applicant_id: int) -> Optional[Dict[str, Any]]:
        try:
            resp = reader_client.request(
                "POST",
                f"/api/v1/subscriptions/purchase/{applicant_id}",
                expected=(200,),
            )
            self.log(f"[purchase] applicant_id={applicant_id} success={resp.get('success')}")
            return resp
        except ApiError as e:
            self.log(f"[warn] purchase_access failed (skipping): {e}")
            return None


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Seed Apply SRBIAU API with consistent fake data.")
    p.add_argument("--base-url", default=os.getenv("APPLY_BASE_URL", "http://localhost:8000"))
    p.add_argument("--otp-code", default=os.getenv("APPLY_OTP_CODE", "000000"))
    p.add_argument("--seed", type=int, default=int(os.getenv("APPLY_SEED", "42")))

    p.add_argument("--contributors", type=int, default=5, help="How many contributor users to create")
    p.add_argument("--universities", type=int, default=6, help="How many target universities to try to create")
    p.add_argument("--courses-per-uni", type=int, default=3, help="How many courses per created university")
    p.add_argument("--langs-per-applicant", type=int, default=2)
    p.add_argument("--acts-per-applicant", type=int, default=3)
    p.add_argument("--docs-per-applicant", type=int, default=2)
    p.add_argument("--apps-per-applicant", type=int, default=4)

    # Tracker additions
    p.add_argument("--tracked-per-user", type=int, default=3, help="Tracked programs per contributor user")
    p.add_argument("--tracked-per-user-reader", type=int, default=2, help="Tracked programs for reader user (if created)")

    p.add_argument("--do-purchases", action="store_true", help="Create a reader user and purchase access to some applicants")
    p.add_argument("--purchase-count", type=int, default=5)

    p.add_argument("--quiet", action="store_true")
    return p.parse_args()


def main() -> None:
    args = parse_args()

    cfg = ApiConfig(base_url=args.base_url, otp_code=args.otp_code)
    api = ApplyApiClient(cfg)
    factory = DataFactory(seed=args.seed)
    seeder = Seeder(api, factory, verbose=not args.quiet)

    created = {
        "users": [],
        "universities": [],
        "courses": [],
        "tracked_programs": [],
        "applicants": [],
        "languages": [],
        "activities": [],
        "documents": [],
        "applications": [],
        "purchases": [],
    }

    # 1) Create contributor users
    contributor_clients: List[ApplyApiClient] = []
    for _ in range(args.contributors):
        phone = factory.phone_ir_like()
        dn = f"{factory.faker.first_name()} {factory.faker.last_name()}"
        u = seeder.create_user_via_otp(phone, display_name=dn)
        created["users"].append(u["user"])
        contributor_clients.append(api.with_token(u["token"]))

    # 2) Try creating universities + courses
    known_universities: List[Dict[str, Any]] = []
    known_courses_by_uni: Dict[int, List[Dict[str, Any]]] = {}

    catalog_client = contributor_clients[0] if contributor_clients else api

    for _ in range(args.universities):
        uni = seeder.try_create_university(catalog_client)
        if not uni:
            break
        known_universities.append(uni)
        created["universities"].append(uni)

        uni_id = int(uni["id"])
        known_courses_by_uni[uni_id] = []
        for _ in range(args.courses_per_uni):
            c = seeder.try_create_course(catalog_client, uni_id)
            if not c:
                break
            known_courses_by_uni[uni_id].append(c)
            created["courses"].append(c)

    # 3) Each contributor creates tracker + applicant + related objects
    for cclient in contributor_clients:
        chosen_uni = random.choice(known_universities) if known_universities else None
        chosen_course = None
        if chosen_uni:
            courses = known_courses_by_uni.get(int(chosen_uni["id"]), [])
            chosen_course = random.choice(courses) if courses else None

        # --- Tracker programs (value-first entry point) ---
        for _ in range(max(0, args.tracked_per_user)):
            tp = seeder.add_tracked_program(
                cclient,
                known_university=chosen_uni,
                known_course=chosen_course if (random.random() < 0.6) else None,  # mix catalog/custom
            )
            if tp:
                created["tracked_programs"].append(tp)

        # --- Applicant profile (contributor) ---
        applicant = seeder.create_applicant(cclient)
        created["applicants"].append(applicant)
        applicant_id = int(applicant["id"])

        for _ in range(args.langs_per_applicant):
            created["languages"].append(seeder.add_language(cclient, applicant_id))

        for _ in range(args.acts_per_applicant):
            created["activities"].append(seeder.add_activity(cclient, applicant_id))

        applications_this_applicant: List[Dict[str, Any]] = []
        current_year = datetime.utcnow().year
        base_year = random.choice([current_year - 2, current_year - 1, current_year])
        for j in range(args.apps_per_applicant):
            app_year = max(2000, min(2100, base_year + (j % 2)))
            a = seeder.add_application(
                cclient,
                applicant_id,
                application_year=app_year,
                known_university=chosen_uni,
                known_course=chosen_course,
            )
            applications_this_applicant.append(a)
            created["applications"].append(a)

        used_uni_name = chosen_uni.get("name") if chosen_uni else None
        used_prog_name = chosen_course.get("course_name") if chosen_course else None
        if not used_prog_name and applications_this_applicant:
            used_prog_name = applications_this_applicant[0].get("program_name")

        for _ in range(args.docs_per_applicant):
            created["documents"].append(
                seeder.upload_document(
                    cclient,
                    applicant_id,
                    used_for_university=used_uni_name,
                    used_for_program=used_prog_name,
                )
            )

    # 4) Purchases (optional) + reader tracker
    if args.do_purchases and created["applicants"]:
        reader_phone = factory.phone_ir_like()
        reader = seeder.create_user_via_otp(reader_phone, display_name="Reader User")
        created["users"].append(reader["user"])
        reader_client = api.with_token(reader["token"])

        # reader also has tracker programs
        for _ in range(max(0, args.tracked_per_user_reader)):
            tp = seeder.add_tracked_program(reader_client)
            if tp:
                created["tracked_programs"].append(tp)

        targets = [a["id"] for a in created["applicants"]]
        random.shuffle(targets)
        for aid in targets[: args.purchase_count]:
            p = seeder.purchase_access(reader_client, int(aid))
            if p:
                created["purchases"].append(p)

    summary = {k: len(v) for k, v in created.items()}
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
