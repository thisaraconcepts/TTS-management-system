import pytest
from datetime import date, timedelta
from app.models.academic import Course, Subject, Exam
from app.models.user import User, Role

def get_auth_headers(client):
    res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "Admin@123"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_ongoing_course_endpoint_and_filtering(client, db_session):
    headers = get_auth_headers(client)

    today = date.today()

    # 1. Create Ongoing Course with multiple subjects
    c_ongoing_multi = Course(
        code="CRS-ONGOING-01",
        name="Ongoing Multi-Subject Course",
        status="ONGOING",
        start_date=today - timedelta(days=10),
        end_date=today + timedelta(days=60),
        is_active=True
    )
    # 2. Create Ongoing Course with one subject
    c_ongoing_single = Course(
        code="CRS-ONGOING-02",
        name="Ongoing Single-Subject Course",
        status="ONGOING",
        start_date=today - timedelta(days=5),
        end_date=today + timedelta(days=45),
        is_active=True
    )
    # 3. Create Ongoing Course with zero subjects
    c_ongoing_empty = Course(
        code="CRS-ONGOING-03",
        name="Ongoing Empty-Subject Course",
        status="ONGOING",
        start_date=today - timedelta(days=2),
        end_date=today + timedelta(days=30),
        is_active=True
    )
    # 4. Create Completed Course
    c_completed = Course(
        code="CRS-COMPLETED-01",
        name="Completed History Course",
        status="PASSED OUT",
        start_date=today - timedelta(days=120),
        end_date=today - timedelta(days=30),
        is_active=True
    )
    # 5. Create Archived Course
    c_archived = Course(
        code="CRS-ARCHIVED-01",
        name="Archived Inactive Course",
        status="ARCHIVED",
        is_active=False
    )
    db_session.add_all([c_ongoing_multi, c_ongoing_single, c_ongoing_empty, c_completed, c_archived])
    db_session.commit()

    # Add subjects
    s_multi_1 = Subject(course_id=c_ongoing_multi.id, code="SUB-M1", name="Avionics Systems 1", periods=40)
    s_multi_2 = Subject(course_id=c_ongoing_multi.id, code="SUB-M2", name="Radar Fundamentals", periods=30)
    s_single_1 = Subject(course_id=c_ongoing_single.id, code="SUB-S1", name="Basic Aerodynamics", periods=25)
    s_completed = Subject(course_id=c_completed.id, code="SUB-OLD", name="Historical Subject", periods=20)
    db_session.add_all([s_multi_1, s_multi_2, s_single_1, s_completed])
    db_session.commit()

    # TEST: GET /api/v1/academic/courses/ongoing
    res_ongoing = client.get("/api/v1/academic/courses/ongoing", headers=headers)
    assert res_ongoing.status_code == 200
    ongoing_data = res_ongoing.json()
    ongoing_codes = [c["code"] for c in ongoing_data]

    # Verify ongoing courses are present
    assert "CRS-ONGOING-01" in ongoing_codes
    assert "CRS-ONGOING-02" in ongoing_codes
    assert "CRS-ONGOING-03" in ongoing_codes
    # Verify completed, archived, and inactive courses are excluded
    assert "CRS-COMPLETED-01" not in ongoing_codes
    assert "CRS-ARCHIVED-01" not in ongoing_codes

    # TEST 1: Course with multiple subjects
    res_sub_multi = client.get(f"/api/v1/academic/courses/{c_ongoing_multi.id}/subjects", headers=headers)
    assert res_sub_multi.status_code == 200
    sub_multi_data = res_sub_multi.json()
    assert len(sub_multi_data) == 2
    assert {s["code"] for s in sub_multi_data} == {"SUB-M1", "SUB-M2"}

    # Also verify alias /subjects/{course_id}
    res_alias = client.get(f"/api/v1/academic/subjects/{c_ongoing_multi.id}", headers=headers)
    assert res_alias.status_code == 200
    assert len(res_alias.json()) == 2

    # TEST 2: Course with single subject
    res_sub_single = client.get(f"/api/v1/academic/courses/{c_ongoing_single.id}/subjects", headers=headers)
    assert res_sub_single.status_code == 200
    sub_single_data = res_sub_single.json()
    assert len(sub_single_data) == 1
    assert sub_single_data[0]["code"] == "SUB-S1"

    # TEST 3: Course without assigned subjects
    res_sub_empty = client.get(f"/api/v1/academic/courses/{c_ongoing_empty.id}/subjects", headers=headers)
    assert res_sub_empty.status_code == 200
    assert res_sub_empty.json() == []

    # TEST 7: Invalid course ID for subject retrieval
    res_inv_course = client.get("/api/v1/academic/courses/non-existent-course-id/subjects", headers=headers)
    assert res_inv_course.status_code == 404

    # TEST 8: Subject belonging to another course is rejected when scheduling exam
    exam_mismatch_payload = {
        "course_id": c_ongoing_single.id,
        "subject_id": s_multi_1.id,  # belongs to c_ongoing_multi, NOT c_ongoing_single!
        "type": "Phase Test",
        "date": str(today + timedelta(days=5)),
        "max_marks": 100,
        "pass_marks": 50
    }
    res_mismatch = client.post("/api/v1/academic/exams", json=exam_mismatch_payload, headers=headers)
    assert res_mismatch.status_code == 400
    assert "does not belong to course" in res_mismatch.json()["detail"]

    # TEST 4 & 5: Concluded / Archived course rejection on scheduling
    exam_archived_payload = {
        "course_id": c_archived.id,
        "subject_id": s_multi_1.id,
        "type": "Phase Test",
        "date": str(today),
        "max_marks": 100,
        "pass_marks": 50
    }
    res_archived = client.post("/api/v1/academic/exams", json=exam_archived_payload, headers=headers)
    assert res_archived.status_code == 400

    # TEST 9: API Request validation failures (invalid marks, missing fields, invalid exam type)
    bad_marks_payload = {
        "course_id": c_ongoing_multi.id,
        "subject_id": s_multi_1.id,
        "type": "Phase Test",
        "date": str(today + timedelta(days=10)),
        "max_marks": 100,
        "pass_marks": 150  # pass > max!
    }
    res_bad_marks = client.post("/api/v1/academic/exams", json=bad_marks_payload, headers=headers)
    assert res_bad_marks.status_code == 400

    # TEST 10: Successful Examination scheduling with valid course and subject
    valid_exam_date = today + timedelta(days=15)
    valid_exam_payload = {
        "course_id": c_ongoing_multi.id,
        "subject_id": s_multi_1.id,
        "type": "Phase Test",
        "date": str(valid_exam_date),
        "max_marks": 100,
        "pass_marks": 50
    }
    res_valid = client.post("/api/v1/academic/exams", json=valid_exam_payload, headers=headers)
    assert res_valid.status_code == 200
    valid_exam_data = res_valid.json()
    assert valid_exam_data["course_id"] == c_ongoing_multi.id
    assert valid_exam_data["subject_id"] == s_multi_1.id
    assert valid_exam_data["course_name"] == c_ongoing_multi.name
    assert valid_exam_data["subject_name"] == s_multi_1.name

    # Verify record in database
    created_exam = db_session.query(Exam).filter(Exam.id == valid_exam_data["id"]).first()
    assert created_exam is not None
    assert created_exam.course_id == c_ongoing_multi.id
    assert created_exam.subject_id == s_multi_1.id
    assert created_exam.date == valid_exam_date
