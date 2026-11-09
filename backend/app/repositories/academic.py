from datetime import date
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from app.models.base import generate_uuid
from app.models.academic import Classroom, Course, Batch, Subject, Lesson, LessonPlan, Timetable, AcademicAttendance, Exam, ExamMark, LessonPlanDocument, CourseCalendar
from app.models.student import Student, Trade, ParadeState, ParadeSubmission
from app.models.user import User, Role
from app.repositories.base import BaseRepository

class TradeRepository(BaseRepository[Trade]):
    def get_all(self, db: Session, include_inactive: bool = False) -> List[Trade]:
        query = db.query(Trade)
        if not include_inactive:
            query = query.filter(Trade.is_active == True)
        results = query.all()
        for t in results:
            t.courses_count = db.query(Course).filter(Course.trade_id == t.id).count()
        return results

    def get_by_code(self, db: Session, code: str) -> Optional[Trade]:
        return db.query(Trade).filter(Trade.code == code).first()

class ClassroomRepository(BaseRepository[Classroom]):
    def get_all(self, db: Session, include_inactive: bool = False) -> List[Classroom]:
        query = db.query(Classroom)
        if not include_inactive:
            query = query.filter(Classroom.is_active == True)
        results = query.all()
        for c in results:
            assigned_batch = db.query(Batch).filter(Batch.classroom_id == c.id, Batch.status == 'Active').first()
            c.is_occupied = assigned_batch is not None
            c.assigned_batch_name = assigned_batch.name if assigned_batch else None
        return results

    def get_by_code(self, db: Session, code: str) -> Optional[Classroom]:
        return db.query(Classroom).filter(Classroom.code == code).first()

class CourseRepository(BaseRepository[Course]):
    def get_all(self, db: Session, status: Optional[str] = None) -> List[Course]:
        from app.schemas.academic import calculate_duration_from_dates, get_date_aware_status
        if status and status.upper() in ["ONGOING", "ACTIVE"]:
            return self.get_ongoing_courses(db)

        query = db.query(Course).filter(Course.deleted_at == None)
        if status and status.upper() != "ALL":
            st = status.upper()
            if st in ["PASSED OUT", "PASSED_OUT", "COMPLETED"]:
                query = query.filter(Course.status.in_(['PASSED OUT', 'PASSED_OUT', 'COMPLETED']))
            elif st == "UPCOMING":
                query = query.filter(Course.status == 'UPCOMING')
            else:
                query = query.filter(Course.status == status)

        results = query.order_by(Course.created_at.desc()).all()
        for c in results:
            trade = db.query(Trade).filter(Trade.id == c.trade_id).first() if c.trade_id else None
            c.trade_name = trade.label if trade else "General"
            c.batches_count = db.query(Batch).filter(Batch.course_id == c.id).count()
            if c.start_date and c.end_date:
                _, c.duration_formatted = calculate_duration_from_dates(c.start_date, c.end_date)
            else:
                c.duration_formatted = f"{c.duration_weeks} Weeks" if c.duration_weeks else "N/A"
            c.date_status = get_date_aware_status(c.start_date, c.end_date, c.status or ("Active" if c.is_active else "Inactive"))
        return results

    def get_ongoing_courses(self, db: Session) -> List[Course]:
        from app.schemas.academic import calculate_duration_from_dates, get_date_aware_status
        courses = (
            db.query(Course)
            .filter(
                Course.deleted_at == None,
                Course.is_active == True,
                ~Course.status.in_(['PASSED OUT', 'PASSED_OUT', 'COMPLETED', 'ARCHIVED', 'INACTIVE', 'CANCELLED', 'UPCOMING'])
            )
            .order_by(Course.code.asc(), Course.name.asc())
            .all()
        )
        ongoing_list = []
        for c in courses:
            date_status = get_date_aware_status(c.start_date, c.end_date, c.status or "ONGOING")
            if date_status == "ONGOING":
                trade = db.query(Trade).filter(Trade.id == c.trade_id).first() if c.trade_id else None
                c.trade_name = trade.label if trade else "General"
                c.batches_count = db.query(Batch).filter(Batch.course_id == c.id).count()
                if c.start_date and c.end_date:
                    _, c.duration_formatted = calculate_duration_from_dates(c.start_date, c.end_date)
                else:
                    c.duration_formatted = f"{c.duration_weeks} Weeks" if c.duration_weeks else "N/A"
                c.date_status = "ONGOING"
                ongoing_list.append(c)
        return ongoing_list

    def get_by_id(self, db: Session, id: str) -> Optional[Course]:
        from app.schemas.academic import calculate_duration_from_dates, get_date_aware_status
        c = db.query(Course).filter(Course.id == id, Course.deleted_at == None).first()
        if c:
            trade = db.query(Trade).filter(Trade.id == c.trade_id).first() if c.trade_id else None
            c.trade_name = trade.label if trade else "General"
            c.batches_count = db.query(Batch).filter(Batch.course_id == c.id).count()
            if c.start_date and c.end_date:
                _, c.duration_formatted = calculate_duration_from_dates(c.start_date, c.end_date)
            else:
                c.duration_formatted = f"{c.duration_weeks} Weeks" if c.duration_weeks else "N/A"
            c.date_status = get_date_aware_status(c.start_date, c.end_date, c.status or ("Active" if c.is_active else "Inactive"))
        return c

    def get_by_trade(self, db: Session, trade_id: str, status: Optional[str] = None) -> List[Course]:
        from app.schemas.academic import calculate_duration_from_dates, get_date_aware_status
        trade_obj = db.query(Trade).filter(
            (Trade.id == trade_id) | (Trade.code == trade_id) | (Trade.label == trade_id)
        ).first()

        target_ids = {trade_id}
        if trade_obj:
            target_ids.add(trade_obj.id)
            if trade_obj.code:
                target_ids.add(trade_obj.code)

        query = db.query(Course).filter(
            Course.trade_id.in_(list(target_ids)),
            Course.deleted_at == None
        )
        if status and status.upper() != "ALL":
            st = status.upper()
            if st in ["PASSED OUT", "PASSED_OUT", "COMPLETED"]:
                query = query.filter(Course.status.in_(['PASSED OUT', 'PASSED_OUT', 'COMPLETED']))
            elif st in ["ONGOING", "ACTIVE"]:
                query = query.filter(
                    Course.is_active == True,
                    Course.status.in_(['ONGOING', 'Active', 'ACTIVE', None])
                )
            elif st == "UPCOMING":
                query = query.filter(Course.status == 'UPCOMING')

        results = query.order_by(Course.created_at.desc()).all()
        for c in results:
            trade = db.query(Trade).filter(Trade.id == c.trade_id).first() if c.trade_id else None
            c.trade_name = trade.label if trade else "General"
            c.batches_count = db.query(Batch).filter(Batch.course_id == c.id).count()
            if c.start_date and c.end_date:
                _, c.duration_formatted = calculate_duration_from_dates(c.start_date, c.end_date)
            else:
                c.duration_formatted = f"{c.duration_weeks} Weeks" if c.duration_weeks else "N/A"
            c.date_status = get_date_aware_status(c.start_date, c.end_date, c.status or ("Active" if c.is_active else "Inactive"))
        return results

    def get_passed_out_courses(
        self,
        db: Session,
        trade_id: Optional[str] = None,
        search_query: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Server-side paginated retrieval of historical / passed-out courses.
        """
        from app.schemas.academic import calculate_duration_from_dates
        query = db.query(Course).filter(
            Course.deleted_at == None,
            Course.status.in_(['PASSED OUT', 'PASSED_OUT', 'COMPLETED'])
        )
        if trade_id:
            query = query.filter(Course.trade_id == trade_id)
        if search_query:
            pattern = f"%{search_query}%"
            query = query.filter(
                or_(
                    Course.code.like(pattern),
                    Course.name.like(pattern)
                )
            )

        total = query.count()
        results = query.order_by(Course.end_date.desc()).offset(skip).limit(limit).all()
        for c in results:
            trade = db.query(Trade).filter(Trade.id == c.trade_id).first() if c.trade_id else None
            c.trade_name = trade.label if trade else "General"
            c.batches_count = db.query(Batch).filter(Batch.course_id == c.id).count()
            if c.start_date and c.end_date:
                _, c.duration_formatted = calculate_duration_from_dates(c.start_date, c.end_date)
            else:
                c.duration_formatted = f"{c.duration_weeks} Weeks" if c.duration_weeks else "N/A"
            c.date_status = "PASSED OUT"

        return {"total": total, "items": results, "skip": skip, "limit": limit}

    def get_enrollment_options(self, db: Session) -> List[Dict[str, Any]]:
        """
        Retrieves active courses and batches for Student Registration -> Course Enrollment.
        Guarantees single source of truth from Academic Activity master records.
        Strictly excludes completed / passed-out courses from active enrollment.
        """
        from app.schemas.academic import calculate_duration_from_dates, get_date_aware_status
        today = date.today()
        active_courses = db.query(Course).filter(
            Course.is_active == True,
            Course.deleted_at.is_(None),
            Course.status != 'PASSED OUT'
        ).order_by(Course.created_at.desc()).all()

        options = []
        for c in active_courses:
            trade = db.query(Trade).filter(Trade.id == c.trade_id).first() if c.trade_id else None
            trade_name = trade.label if trade else "General"

            # Query active batches for this course
            active_batches = db.query(Batch).filter(
                Batch.course_id == c.id,
                Batch.deleted_at.is_(None),
                Batch.status.notin_(['PASSED OUT', 'PASSED_OUT', 'ARCHIVED', 'DELETED', 'Inactive'])
            ).order_by(Batch.created_at.desc()).all()

            if active_batches:
                for b in active_batches:
                    b_trade = db.query(Trade).filter(Trade.id == b.trade_id).first() if b.trade_id else trade
                    b_classroom = db.query(Classroom).filter(Classroom.id == b.classroom_id).first() if b.classroom_id else None
                    b_instructor = db.query(User).filter(User.id == b.instructor_id).first() if b.instructor_id else None
                    
                    enrolled_count = db.query(Student).filter(
                        Student.course_id == c.id,
                        (Student.batch == b.name) | (Student.batch == c.code),
                        Student.deleted_at == None
                    ).count()

                    start_d = b.intake_date or c.start_date
                    end_d = b.passing_out_date or c.end_date

                    if b.intake_date and b.passing_out_date:
                        _, dur_fmt = calculate_duration_from_dates(b.intake_date, b.passing_out_date)
                    elif c.start_date and c.end_date:
                        _, dur_fmt = calculate_duration_from_dates(c.start_date, c.end_date)
                    else:
                        dur_fmt = f"{c.duration_weeks or 24} Weeks"

                    options.append({
                        "course_id": c.id,
                        "course_code": c.code,
                        "course_name": c.name,
                        "course_full_title": f"{c.code} {c.name}",
                        "trade_id": b.trade_id or c.trade_id,
                        "trade_name": b_trade.label if b_trade else trade_name,
                        "course_type": c.course_type or "Basic",
                        "duration_weeks": c.duration_weeks or 24,
                        "duration_formatted": dur_fmt,
                        "intake_capacity": b.capacity or c.intake_capacity or 30,
                        "batch_id": b.id,
                        "batch_name": b.name,
                        "classroom_id": b.classroom_id,
                        "classroom_name": b_classroom.name if b_classroom else "Unassigned",
                        "instructor_id": b.instructor_id,
                        "instructor_name": b_instructor.full_name if b_instructor else "Unassigned",
                        "instructor_rank": b_instructor.rank if b_instructor else None,
                        "instructor_service_number": b_instructor.service_number if b_instructor else None,
                        "start_date": start_d,
                        "end_date": end_d,
                        "status": b.status or "Active",
                        "date_status": get_date_aware_status(start_d, end_d, b.status or "Active"),
                        "is_active": True,
                        "enrolled_count": enrolled_count
                    })
            else:
                # Active course without batches configured yet
                enrolled_count = db.query(Student).filter(
                    Student.course_id == c.id,
                    Student.deleted_at == None
                ).count()

                if c.start_date and c.end_date:
                    _, dur_fmt = calculate_duration_from_dates(c.start_date, c.end_date)
                else:
                    dur_fmt = f"{c.duration_weeks or 24} Weeks"

                options.append({
                    "course_id": c.id,
                    "course_code": c.code,
                    "course_name": c.name,
                    "course_full_title": f"{c.code} {c.name}",
                    "trade_id": c.trade_id,
                    "trade_name": trade_name,
                    "course_type": c.course_type or "Basic",
                    "duration_weeks": c.duration_weeks or 24,
                    "duration_formatted": dur_fmt,
                    "intake_capacity": c.intake_capacity or 30,
                    "batch_id": None,
                    "batch_name": c.code,
                    "classroom_id": None,
                    "classroom_name": "Unassigned",
                    "instructor_id": None,
                    "instructor_name": "Unassigned",
                    "instructor_rank": None,
                    "instructor_service_number": None,
                    "start_date": c.start_date,
                    "end_date": c.end_date,
                    "status": "Active",
                    "date_status": get_date_aware_status(c.start_date, c.end_date, "Active"),
                    "is_active": True,
                    "enrolled_count": enrolled_count
                })

        return options


class BatchRepository(BaseRepository[Batch]):
    def get_all(self, db: Session, status: Optional[str] = None) -> List[Batch]:
        from app.schemas.academic import calculate_duration_from_dates, get_date_aware_status
        query = db.query(Batch).filter(Batch.deleted_at == None)
        if status and status.upper() != "ALL":
            st = status.upper()
            if st in ["PASSED OUT", "PASSED_OUT", "COMPLETED"]:
                query = query.filter(Batch.status.in_(['PASSED OUT', 'PASSED_OUT', 'COMPLETED']))
            elif st in ["ACTIVE", "ONGOING"]:
                query = query.filter(Batch.status.in_(['Active', 'ACTIVE', 'ONGOING']))
            else:
                query = query.filter(Batch.status == status)

        results = query.order_by(Batch.created_at.desc()).all()
        for b in results:
            course = db.query(Course).filter(Course.id == b.course_id).first()
            trade = db.query(Trade).filter(Trade.id == b.trade_id).first() if b.trade_id else None
            classroom = db.query(Classroom).filter(Classroom.id == b.classroom_id).first() if b.classroom_id else None
            instructor = db.query(User).filter(User.id == b.instructor_id).first() if b.instructor_id else None
            
            b.course_name = course.name if course else "N/A"
            b.trade_name = trade.label if trade else "N/A"
            b.classroom_name = classroom.name if classroom else "Unassigned"
            b.instructor_name = instructor.full_name if instructor else "Unassigned"
            b.instructor_service_number = instructor.service_number if instructor else None
            b.instructor_rank = instructor.rank if instructor else None
            b.student_count = db.query(Student).filter(Student.course_id == b.course_id).count()

            start_d = b.intake_date or (course.start_date if course else None)
            end_d = b.passing_out_date or (course.end_date if course else None)

            if b.intake_date and b.passing_out_date:
                _, b.duration_formatted = calculate_duration_from_dates(b.intake_date, b.passing_out_date)
            elif course and course.start_date and course.end_date:
                _, b.duration_formatted = calculate_duration_from_dates(course.start_date, course.end_date)
            elif course and course.duration_weeks:
                b.duration_formatted = f"{course.duration_weeks} Weeks"
            else:
                b.duration_formatted = "N/A"

            b.date_status = get_date_aware_status(start_d, end_d, b.status or "Active")
        return results

    def get_by_course_and_batch(self, db: Session, course_id: Optional[str] = None,
                                batch_name: Optional[str] = None,
                                trade: Optional[str] = None) -> Optional[Batch]:
        """Find active batch record for a course, batch name, or trade."""
        query = db.query(Batch).filter(Batch.status == 'Active')
        if course_id:
            query = query.filter(Batch.course_id == course_id)
        if batch_name:
            query = query.filter((Batch.name == batch_name) | (Batch.id == batch_name))
        if trade:
            trade_obj = db.query(Trade).filter((Trade.label == trade) | (Trade.code == trade) | (Trade.id == trade)).first()
            if trade_obj:
                query = query.filter(Batch.trade_id == trade_obj.id)

        batch = query.first()
        if not batch and trade:
            # Fallback by trade only
            trade_obj = db.query(Trade).filter((Trade.label == trade) | (Trade.code == trade) | (Trade.id == trade)).first()
            if trade_obj:
                batch = db.query(Batch).filter(Batch.trade_id == trade_obj.id, Batch.status == 'Active').first()
        return batch

    def get_instructor_for_batch(self, db: Session, trade: Optional[str] = None,
                                 course_id: Optional[str] = None,
                                 batch_name: Optional[str] = None) -> Optional[User]:
        """Resolve the assigned instructor User object for a given Course/Batch."""
        batch = self.get_by_course_and_batch(db, course_id=course_id, batch_name=batch_name, trade=trade)
        if batch and batch.instructor_id:
            return db.query(User).filter(User.id == batch.instructor_id, User.deleted_at == None).first()
        return None

class InstructorRepository:
    def get_instructors(self, db: Session) -> List[Dict[str, Any]]:
        """
        Retrieves active instructors from the User Management Module (SSOT).
        Queries users with role 'Instructor' or designation containing Instructor.
        """
        query = db.query(User).join(Role, User.role_id == Role.id, isouter=True)\
                  .filter(User.deleted_at == None, User.is_active == True)
        
        users = query.all()
        instructors = []
        for u in users:
            is_inst = (u.role and u.role.name == 'Instructor') or \
                      (u.designation and 'instructor' in u.designation.lower()) or \
                      (u.assigned_module and 'academic' in u.assigned_module.lower())
            if is_inst:
                assigned_count = db.query(Batch).filter(Batch.instructor_id == u.id, Batch.status == 'Active').count()
                instructors.append({
                    "id": u.id,
                    "username": u.username,
                    "full_name": u.full_name,
                    "service_number": u.service_number,
                    "rank": u.rank,
                    "department": u.department,
                    "designation": u.designation,
                    "email": u.email,
                    "mobile_number": u.mobile_number,
                    "assigned_batches_count": assigned_count
                })
        
        # Fallback if no specific role set: return all active staff/officers
        if not instructors:
            all_users = db.query(User).filter(User.deleted_at == None, User.is_active == True).limit(20).all()
            for u in all_users:
                assigned_count = db.query(Batch).filter(Batch.instructor_id == u.id, Batch.status == 'Active').count()
                instructors.append({
                    "id": u.id,
                    "username": u.username,
                    "full_name": u.full_name,
                    "service_number": u.service_number,
                    "rank": u.rank,
                    "department": u.department,
                    "designation": u.designation,
                    "email": u.email,
                    "mobile_number": u.mobile_number,
                    "assigned_batches_count": assigned_count
                })
        return instructors

class SubjectRepository(BaseRepository[Subject]):
    def get_by_course(self, db: Session, course_id: str) -> List[Subject]:
        results = (
            db.query(Subject)
            .options(joinedload(Subject.course))
            .filter(Subject.course_id == course_id, Subject.deleted_at == None)
            .order_by(Subject.code.asc(), Subject.name.asc())
            .all()
        )
        for s in results:
            s.course_name = s.course.name if s.course else None
        return results

class LessonRepository(BaseRepository[Lesson]):
    def get_by_subject(self, db: Session, subject_id: str) -> List[Lesson]:
        return db.query(Lesson).filter(Lesson.subject_id == subject_id).all()

class LessonPlanRepository(BaseRepository[LessonPlan]):
    def get_by_lesson(self, db: Session, lesson_id: str) -> Optional[LessonPlan]:
        plan = db.query(LessonPlan).filter(LessonPlan.lesson_id == lesson_id).first()
        if plan:
            lesson = db.query(Lesson).filter(Lesson.id == plan.lesson_id).first()
            instructor = db.query(User).filter(User.id == plan.instructor_id).first()
            plan.lesson_name = lesson.name if lesson else None
            plan.instructor_name = instructor.full_name if instructor else None
        return plan

class TimetableRepository(BaseRepository[Timetable]):
    def get_schedule(self, db: Session, course_id: str, schedule_date: date) -> List[Timetable]:
        results = db.query(Timetable).filter(
            Timetable.course_id == course_id,
            Timetable.date == schedule_date
        ).order_by(Timetable.period_number).all()
        
        # Auto-provision default timetable period sessions if none exist for course on this date
        if not results:
            course_obj = db.query(Course).filter(Course.id == course_id).first()
            if course_obj:
                subjects = db.query(Subject).filter(
                    Subject.course_id == course_id,
                    Subject.deleted_at == None
                ).all()
                if not subjects:
                    default_sub = Subject(
                        id=generate_uuid(),
                        course_id=course_id,
                        code=f"{course_obj.code if course_obj.code else 'CRS'}-MOD1",
                        name=f"{course_obj.name} Core Modules",
                        periods=40
                    )
                    db.add(default_sub)
                    db.commit()
                    db.refresh(default_sub)
                    subjects = [default_sub]

                batch_obj = db.query(Batch).filter(Batch.course_id == course_id).first()
                inst_id = batch_obj.instructor_id if (batch_obj and batch_obj.instructor_id) else None
                loc = f"{course_obj.code} Hall"
                if batch_obj and batch_obj.classroom_id:
                    cl_obj = db.query(Classroom).filter(Classroom.id == batch_obj.classroom_id).first()
                    if cl_obj:
                        loc = cl_obj.name

                for p_num in range(1, 5):
                    sub = subjects[(p_num - 1) % len(subjects)]
                    les = db.query(Lesson).filter(Lesson.subject_id == sub.id).first()
                    if not les:
                        les = Lesson(
                            id=generate_uuid(),
                            subject_id=sub.id,
                            name=f"Module Lesson 0{p_num}: {sub.name}",
                            description="Core theory and trade practical application"
                        )
                        db.add(les)
                        db.commit()
                        db.refresh(les)

                    new_tt = Timetable(
                        id=generate_uuid(),
                        course_id=course_id,
                        subject_id=sub.id,
                        lesson_id=les.id,
                        instructor_id=inst_id,
                        period_number=p_num,
                        date=schedule_date,
                        location=loc
                    )
                    db.add(new_tt)
                db.commit()

                results = db.query(Timetable).filter(
                    Timetable.course_id == course_id,
                    Timetable.date == schedule_date
                ).order_by(Timetable.period_number).all()

        for t in results:
            course = db.query(Course).filter(Course.id == t.course_id).first()
            subject = db.query(Subject).filter(Subject.id == t.subject_id).first()
            lesson = db.query(Lesson).filter(Lesson.id == t.lesson_id).first() if t.lesson_id else None
            instructor = db.query(User).filter(User.id == t.instructor_id).first() if t.instructor_id else None
            
            t.course_name = course.name if course else None
            t.subject_name = subject.name if subject else None
            t.lesson_name = lesson.name if lesson else None
            t.instructor_name = instructor.full_name if instructor else None
            
        return results

class AttendanceRepository(BaseRepository[AcademicAttendance]):
    def get_by_timetable(self, db: Session, timetable_id: str) -> List[AcademicAttendance]:
        results = db.query(AcademicAttendance).filter(AcademicAttendance.timetable_id == timetable_id).all()
        for att in results:
            student = db.query(Student).filter(Student.id == att.student_id).first()
            if student:
                att.student_name = student.full_name
                att.student_service_number = student.service_number
                att.student_rank = student.rank or 'LAC'
                att.student_trade = student.trade or 'General'
                att.student_batch = student.batch or 'N/A'
                
                # Fetch parade state
                tt = db.query(Timetable).filter(Timetable.id == timetable_id).first()
                if tt:
                    p_state = db.query(ParadeState).filter(
                        ParadeState.student_id == student.id,
                        ParadeState.date == tt.date
                    ).first()
                    att.parade_state = p_state.status if p_state else 'Present'
        return results

    def map_parade_to_attendance_status(self, parade_status: str) -> str:
        s = (parade_status or 'Present').strip().upper()
        if 'SICK' in s:
            return 'SICK_REPORT'
        elif 'COURSE' in s or 'VISIT' in s:
            return 'COURSE_VISIT'
        elif 'LEAVE' in s:
            return 'LEAVE'
        elif 'HOSPITAL' in s:
            return 'HOSPITAL'
        elif 'AWOL' in s or 'ABSENT' in s:
            return 'ABSENT'
        elif 'DUTY' in s or 'EXCUSED' in s or 'DETACHED' in s:
            return 'EXCUSED'
        return 'PRESENT'

    def get_session_details(self, db: Session, timetable_id: str) -> Optional[Dict[str, Any]]:
        tt = db.query(Timetable).filter(Timetable.id == timetable_id).first()
        if not tt:
            return None

        course = db.query(Course).filter(Course.id == tt.course_id).first()
        trade_obj = db.query(Trade).filter(Trade.id == course.trade_id).first() if course and course.trade_id else None
        trade_label = trade_obj.label if trade_obj else (course.trade_name if course else 'General')
        instructor = db.query(User).filter(User.id == tt.instructor_id).first() if tt.instructor_id else None
        subject = db.query(Subject).filter(Subject.id == tt.subject_id).first() if tt.subject_id else None
        lesson = db.query(Lesson).filter(Lesson.id == tt.lesson_id).first() if tt.lesson_id else None

        # Verify Parade State approval
        # Check parade submission for date & trade
        ps_sub = None
        if trade_label:
            ps_sub = db.query(ParadeSubmission).filter(
                ParadeSubmission.date == tt.date,
                ParadeSubmission.trade == trade_label
            ).first()
            if not ps_sub and trade_obj:
                ps_sub = db.query(ParadeSubmission).filter(
                    ParadeSubmission.date == tt.date,
                    ParadeSubmission.trade == trade_obj.code
                ).first()

        is_parade_approved = True if (ps_sub and ps_sub.status == 'APPROVED') else False
        parade_submission_status = ps_sub.status if ps_sub else 'NOT_SUBMITTED'

        # Fetch trainees belonging to this course/trade for course-wise parade state roster
        from sqlalchemy import or_
        student_query = db.query(Student).filter(Student.status != 'Passed Out')
        trade_conds = [Student.course_id == tt.course_id]
        if trade_label and trade_label != 'General':
            trade_conds.append(Student.trade == trade_label)
        if trade_obj and trade_obj.label:
            trade_conds.append(Student.trade == trade_obj.label)
        if trade_obj and trade_obj.code:
            trade_conds.append(Student.trade == trade_obj.code)

        students = student_query.filter(or_(*trade_conds)).order_by(Student.service_number.asc()).all()

        # Fetch existing academic attendance records for this session
        existing_records = {
            att.student_id: att for att in db.query(AcademicAttendance).filter(
                AcademicAttendance.timetable_id == timetable_id
            ).all()
        }

        # Build trainee list
        student_items = []
        for s in students:
            p_state = db.query(ParadeState).filter(
                ParadeState.student_id == s.id,
                ParadeState.date == tt.date
            ).first()
            p_status = p_state.status if p_state else 'Present'

            existing_att = existing_records.get(s.id)
            if existing_att:
                att_id = existing_att.id
                att_status = existing_att.status
                remarks = existing_att.remarks
            else:
                att_id = None
                att_status = self.map_parade_to_attendance_status(p_status)
                remarks = None

            student_items.append({
                'student_id': s.id,
                'service_number': s.service_number,
                'rank': s.rank or 'LAC',
                'full_name': s.full_name,
                'trade': s.trade or trade_label or 'General',
                'batch': s.batch or (course.batch_code if hasattr(course, 'batch_code') else '26/1'),
                'parade_state': p_status,
                'attendance_id': att_id,
                'attendance_status': att_status,
                'remarks': remarks
            })

        return {
            'timetable_id': tt.id,
            'course_id': course.id if course else tt.course_id,
            'course_code': course.code if course else 'COURSE',
            'course_name': course.name if course else 'Course',
            'trade_name': trade_label,
            'batch': students[0].batch if (students and students[0].batch) else '26/1',
            'classroom_location': tt.location or 'Main Lecture Hall',
            'instructor_id': tt.instructor_id,
            'instructor_name': instructor.full_name if instructor else 'Assigned Instructor',
            'date': tt.date,
            'period_number': tt.period_number,
            'subject_name': subject.name if subject else 'Subject',
            'lesson_name': lesson.name if lesson else None,
            'is_parade_approved': is_parade_approved,
            'parade_submission_status': parade_submission_status,
            'students': student_items
        }

    def get_class_wise_report(
        self, db: Session, course_id: Optional[str] = None, start_date: Optional[date] = None,
        end_date: Optional[date] = None, location: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        q = db.query(Timetable)
        if course_id:
            q = q.filter(Timetable.course_id == course_id)
        if start_date:
            q = q.filter(Timetable.date >= start_date)
        if end_date:
            q = q.filter(Timetable.date <= end_date)
        if location:
            q = q.filter(Timetable.location == location)

        timetables = q.order_by(Timetable.date.desc(), Timetable.period_number.asc()).all()
        report_items = []
        for tt in timetables:
            course = db.query(Course).filter(Course.id == tt.course_id).first()
            subject = db.query(Subject).filter(Subject.id == tt.subject_id).first()
            instructor = db.query(User).filter(User.id == tt.instructor_id).first()
            records = db.query(AcademicAttendance).filter(AcademicAttendance.timetable_id == tt.id).all()

            counts = {
                'PRESENT': 0, 'LATE': 0, 'SICK_REPORT': 0, 'COURSE_VISIT': 0,
                'LEAVE': 0, 'HOSPITAL': 0, 'ABSENT': 0, 'EXCUSED': 0
            }
            for r in records:
                st = (r.status or 'PRESENT').strip().upper()
                if st in counts:
                    counts[st] += 1
                elif 'SICK' in st:
                    counts['SICK_REPORT'] += 1
                elif 'PRESENT' in st:
                    counts['PRESENT'] += 1
                elif 'LATE' in st:
                    counts['LATE'] += 1
                elif 'ABSENT' in st or 'AWOL' in st:
                    counts['ABSENT'] += 1
                else:
                    counts['EXCUSED'] += 1

            total_students = len(records)
            report_items.append({
                'timetable_id': tt.id,
                'date': tt.date,
                'period_number': tt.period_number,
                'course_name': course.name if course else 'Course',
                'batch': '26/1',
                'classroom_location': tt.location or 'Main Hall',
                'instructor_name': instructor.full_name if instructor else 'Instructor',
                'subject_name': subject.name if subject else 'Subject',
                'total_students': total_students,
                'present_count': counts['PRESENT'],
                'late_count': counts['LATE'],
                'sick_report_count': counts['SICK_REPORT'],
                'course_visit_count': counts['COURSE_VISIT'],
                'leave_count': counts['LEAVE'],
                'hospital_count': counts['HOSPITAL'],
                'absent_count': counts['ABSENT'],
                'excused_count': counts['EXCUSED']
            })
        return report_items

    def get_student_attendance_history(
        self, db: Session, student_id: str, start_date: Optional[date] = None, end_date: Optional[date] = None
    ) -> List[Dict[str, Any]]:
        q = db.query(AcademicAttendance, Timetable).join(
            Timetable, AcademicAttendance.timetable_id == Timetable.id
        ).filter(AcademicAttendance.student_id == student_id)

        if start_date:
            q = q.filter(Timetable.date >= start_date)
        if end_date:
            q = q.filter(Timetable.date <= end_date)

        results = q.order_by(Timetable.date.desc(), Timetable.period_number.asc()).all()
        items = []
        for att, tt in results:
            course = db.query(Course).filter(Course.id == tt.course_id).first()
            subject = db.query(Subject).filter(Subject.id == tt.subject_id).first()
            items.append({
                'date': tt.date,
                'course_name': course.name if course else 'Course',
                'subject_name': subject.name if subject else 'Subject',
                'classroom_location': tt.location or 'Main Hall',
                'period_number': tt.period_number,
                'status': att.status,
                'remarks': att.remarks
            })
        return items

    def get_classroom_wise_report(
        self, db: Session, location: str, start_date: Optional[date] = None, end_date: Optional[date] = None
    ) -> List[Dict[str, Any]]:
        q = db.query(Timetable).filter(Timetable.location == location)
        if start_date:
            q = q.filter(Timetable.date >= start_date)
        if end_date:
            q = q.filter(Timetable.date <= end_date)

        timetables = q.all()
        total_sessions = len(timetables)
        total_records = 0
        p_count = 0
        l_count = 0
        a_count = 0
        o_count = 0

        for tt in timetables:
            atts = db.query(AcademicAttendance).filter(AcademicAttendance.timetable_id == tt.id).all()
            total_records += len(atts)
            for a in atts:
                st = (a.status or '').strip().upper()
                if st == 'PRESENT':
                    p_count += 1
                elif st == 'LATE':
                    l_count += 1
                elif st == 'ABSENT':
                    a_count += 1
                else:
                    o_count += 1

        return [{
            'location': location,
            'total_sessions': total_sessions,
            'total_records': total_records,
            'present_count': p_count,
            'late_count': l_count,
            'absent_count': a_count,
            'other_count': o_count
        }]

class ExamRepository(BaseRepository[Exam]):
    def get_by_course(self, db: Session, course_id: str) -> List[Exam]:
        results = db.query(Exam).filter(Exam.course_id == course_id, Exam.deleted_at == None).all()
        for ex in results:
            course = db.query(Course).filter(Course.id == ex.course_id).first()
            subj = db.query(Subject).filter(Subject.id == ex.subject_id).first()
            ex.course_name = course.name if course else None
            ex.subject_name = subj.name if subj else None
        return results

    def get_result_sheet(self, db: Session, exam_id: str) -> Optional[Dict[str, Any]]:
        exam = db.query(Exam).filter(Exam.id == exam_id, Exam.deleted_at == None).first()
        if not exam:
            return None

        course = db.query(Course).filter(Course.id == exam.course_id).first()
        subject = db.query(Subject).filter(Subject.id == exam.subject_id).first()
        trade_obj = db.query(Trade).filter(Trade.id == course.trade_id).first() if course and course.trade_id else None
        trade_label = trade_obj.label if trade_obj else (getattr(course, 'trade_name', None))

        # Check parade submission for date & trade
        ps_sub = None
        if trade_label:
            ps_sub = db.query(ParadeSubmission).filter(
                ParadeSubmission.date == exam.date,
                ParadeSubmission.trade == trade_label
            ).first()
            if not ps_sub and trade_obj:
                ps_sub = db.query(ParadeSubmission).filter(
                    ParadeSubmission.date == exam.date,
                    ParadeSubmission.trade == trade_obj.code
                ).first()

        parade_submission_status = ps_sub.status if ps_sub else 'NOT_SUBMITTED'
        is_trade_parade_approved = (ps_sub.status == 'APPROVED') if ps_sub else False

        # Trainees belonging to this course/trade
        from sqlalchemy import or_
        student_query = db.query(Student).filter(Student.status != 'Passed Out')
        trade_conds = [Student.course_id == exam.course_id]
        if trade_label and trade_label != 'General':
            trade_conds.append(Student.trade == trade_label)
        if trade_obj and trade_obj.label:
            trade_conds.append(Student.trade == trade_obj.label)
        if trade_obj and trade_obj.code:
            trade_conds.append(Student.trade == trade_obj.code)

        students = student_query.filter(or_(*trade_conds)).order_by(Student.service_number.asc()).all()

        existing_marks = {
            m.student_id: m for m in db.query(ExamMark).filter(ExamMark.exam_id == exam_id).all()
        }

        # Statuses that prohibit sitting exam
        ineligible_keywords = ['LEAVE', 'HOSPITAL', 'AWOL', 'COURSE', 'SICK', 'DETACHED']

        student_items = []
        summary_counts = {
            'total_trainees': len(students),
            'eligible_count': 0,
            'sat_exam_count': 0,
            'did_not_sit_count': 0,
            'present_count': 0,
            'leave_count': 0,
            'hospital_count': 0,
            'awol_count': 0,
            'course_visit_count': 0,
            'sick_report_count': 0,
            'other_count': 0,
            'overridden_count': 0,
            'pass_count': 0,
            'fail_count': 0
        }

        for s in students:
            p_state = db.query(ParadeState).filter(
                ParadeState.student_id == s.id,
                ParadeState.date == exam.date
            ).first()

            is_p_approved = False
            p_sub_status = parade_submission_status
            if p_state:
                if p_state.submission_id:
                    sub = db.query(ParadeSubmission).filter(ParadeSubmission.id == p_state.submission_id).first()
                    if sub:
                        p_sub_status = sub.status
                        is_p_approved = (sub.status == 'APPROVED')
                elif is_trade_parade_approved:
                    is_p_approved = True
            elif is_trade_parade_approved:
                is_p_approved = True

            raw_status = p_state.status if p_state else 'Present'
            norm_status_upper = raw_status.strip().upper()

            is_status_ineligible = any(kw in norm_status_upper for kw in ineligible_keywords)

            existing_m = existing_marks.get(s.id)
            is_overridden = bool(existing_m and existing_m.is_overridden)
            override_reason = existing_m.override_reason if existing_m else None
            overridden_by_name = None
            overridden_at = None
            original_parade_status = existing_m.original_parade_status if existing_m else None

            if existing_m and existing_m.overridden_by:
                u = db.query(User).filter(User.id == existing_m.overridden_by).first()
                if u:
                    overridden_by_name = u.full_name
                overridden_at = existing_m.overridden_at

            entered_by_name = None
            if existing_m and existing_m.entered_by:
                u = db.query(User).filter(User.id == existing_m.entered_by).first()
                if u:
                    entered_by_name = u.full_name

            # can_sit_exam logic:
            if is_p_approved and is_status_ineligible:
                can_sit_exam = True if is_overridden else False
            else:
                can_sit_exam = True

            marks_entry_allowed = can_sit_exam

            # Result status calculation
            if existing_m and existing_m.marks_obtained is not None and existing_m.marks_obtained >= 0:
                marks_val = existing_m.marks_obtained
                if marks_val >= exam.pass_marks:
                    result_status = 'PASS'
                    summary_counts['pass_count'] += 1
                else:
                    result_status = 'FAIL'
                    summary_counts['fail_count'] += 1
                summary_counts['sat_exam_count'] += 1
            elif is_p_approved and not can_sit_exam:
                marks_val = None
                if 'LEAVE' in norm_status_upper:
                    result_status = 'LEAVE'
                elif 'HOSPITAL' in norm_status_upper:
                    result_status = 'IN HOSPITAL'
                elif 'AWOL' in norm_status_upper:
                    result_status = 'AWOL'
                elif 'COURSE' in norm_status_upper or 'VISIT' in norm_status_upper:
                    result_status = 'COURSE VISIT'
                elif 'SICK' in norm_status_upper:
                    result_status = 'SICK REPORT'
                elif 'DETACHED' in norm_status_upper:
                    result_status = 'DETACHED DUTY'
                else:
                    result_status = norm_status_upper
            else:
                marks_val = None
                result_status = 'ELIGIBLE'

            if can_sit_exam:
                summary_counts['eligible_count'] += 1
            else:
                summary_counts['did_not_sit_count'] += 1

            if is_overridden:
                summary_counts['overridden_count'] += 1

            if 'PRESENT' in norm_status_upper:
                summary_counts['present_count'] += 1
            elif 'LEAVE' in norm_status_upper:
                summary_counts['leave_count'] += 1
            elif 'HOSPITAL' in norm_status_upper:
                summary_counts['hospital_count'] += 1
            elif 'AWOL' in norm_status_upper:
                summary_counts['awol_count'] += 1
            elif 'COURSE' in norm_status_upper or 'VISIT' in norm_status_upper:
                summary_counts['course_visit_count'] += 1
            elif 'SICK' in norm_status_upper:
                summary_counts['sick_report_count'] += 1
            else:
                summary_counts['other_count'] += 1

            student_items.append({
                'student_id': s.id,
                'service_number': s.service_number,
                'student_name': s.full_name,
                'rank': s.rank or 'LAC',
                'trade': s.trade or trade_label or 'General',
                'batch': s.batch or '26/1',
                'parade_state_status': raw_status,
                'parade_submission_status': p_sub_status,
                'is_parade_approved': is_p_approved,
                'can_sit_exam': can_sit_exam,
                'marks_entry_allowed': marks_entry_allowed,
                'marks_obtained': marks_val,
                'result_status': result_status,
                'remarks': existing_m.remarks if existing_m else None,
                'is_overridden': is_overridden,
                'override_reason': override_reason,
                'overridden_by_name': overridden_by_name,
                'overridden_at': overridden_at,
                'original_parade_status': original_parade_status,
                'entered_by_name': entered_by_name
            })

        return {
            'exam_id': exam.id,
            'course_id': course.id if course else exam.course_id,
            'course_name': course.name if course else 'Course',
            'course_code': course.code if course else None,
            'trade_name': trade_label,
            'subject_id': subject.id if subject else exam.subject_id,
            'subject_name': subject.name if subject else 'Subject',
            'subject_code': subject.code if subject else None,
            'exam_type': exam.type,
            'exam_date': exam.date,
            'max_marks': exam.max_marks,
            'pass_marks': exam.pass_marks,
            'is_parade_approved': is_trade_parade_approved,
            'parade_submission_status': parade_submission_status,
            'summary': summary_counts,
            'students': student_items
        }

    def get_student_academic_progress(self, db: Session, student_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves Phase Test academic progression for a trainee.
        Uses existing examination & mark records ordered chronologically.
        Computes accurate percentages, grades, and summary KPIs.
        """
        student = db.query(Student).filter(Student.id == student_id, Student.deleted_at == None).first()
        if not student:
            return None

        course = db.query(Course).filter(Course.id == student.course_id).first() if student.course_id else None

        # Query all ExamMark records for this trainee
        marks_records = (
            db.query(ExamMark, Exam, Subject, Course)
            .join(Exam, ExamMark.exam_id == Exam.id)
            .outerjoin(Subject, Exam.subject_id == Subject.id)
            .outerjoin(Course, Exam.course_id == Course.id)
            .filter(
                ExamMark.student_id == student_id,
                Exam.deleted_at == None
            )
            .order_by(Exam.date.asc(), Exam.created_at.asc())
            .all()
        )

        phase_tests = []
        phase_index = 1

        def calculate_grade(pct: Optional[float], st: str) -> Optional[str]:
            if pct is None:
                return None
            if pct >= 85.0:
                return "Distinction (A+)"
            elif pct >= 75.0:
                return "Distinction (A)"
            elif pct >= 65.0:
                return "Credit (B)"
            elif pct >= 50.0:
                return "Pass (C)"
            else:
                return "Fail (F)"

        for em, exam_obj, subj_obj, crs_obj in marks_records:
            max_m = float(exam_obj.max_marks) if exam_obj.max_marks else 100.0
            pass_m = float(exam_obj.pass_marks) if exam_obj.pass_marks else 50.0
            obtained_m = float(em.marks_obtained) if em.marks_obtained is not None else None
            
            pct = None
            if obtained_m is not None and max_m > 0:
                pct = round((obtained_m / max_m) * 100.0, 2)

            grade_val = calculate_grade(pct, em.status or "")

            # Phase test title
            p_name = f"Phase Test {phase_index}"
            if subj_obj and subj_obj.name:
                p_name = f"Phase {phase_index} - {subj_obj.name}"
            elif exam_obj.type:
                p_name = f"Phase {phase_index} ({exam_obj.type})"

            phase_tests.append({
                "exam_id": exam_obj.id,
                "phase_test_name": p_name,
                "exam_type": exam_obj.type or "Phase Test",
                "date": exam_obj.date,
                "course_id": crs_obj.id if crs_obj else exam_obj.course_id,
                "course_name": crs_obj.name if crs_obj else None,
                "course_code": crs_obj.code if crs_obj else None,
                "subject_id": subj_obj.id if subj_obj else exam_obj.subject_id,
                "subject_code": subj_obj.code if subj_obj else None,
                "subject_name": subj_obj.name if subj_obj else None,
                "max_marks": max_m,
                "pass_marks": pass_m,
                "marks_obtained": obtained_m,
                "percentage": pct,
                "grade": grade_val,
                "status": em.status or ("Pass" if (obtained_m is not None and obtained_m >= pass_m) else "Fail" if obtained_m is not None else "Pending"),
                "remarks": em.remarks,
                "is_overridden": bool(em.is_overridden),
                "original_parade_status": em.original_parade_status
            })
            phase_index += 1

        # Summary statistics calculation
        total_count = len(phase_tests)
        completed_tests = [t for t in phase_tests if t["percentage"] is not None and t["status"] not in ["Absent", "Pending"]]
        completed_count = len(completed_tests)
        
        passed_count = sum(
            1 for t in phase_tests 
            if (t["marks_obtained"] is not None and t["marks_obtained"] >= t["pass_marks"]) or (t["status"] and t["status"].lower() == "pass")
        )
        failed_count = sum(
            1 for t in phase_tests 
            if (t["marks_obtained"] is not None and t["marks_obtained"] < t["pass_marks"]) or (t["status"] and t["status"].lower() == "fail")
        )

        percentages = [t["percentage"] for t in completed_tests if t["percentage"] is not None]
        avg_pct = round(sum(percentages) / len(percentages), 2) if percentages else None
        latest_pct = completed_tests[-1]["percentage"] if completed_tests else None
        highest_pct = max(percentages) if percentages else None
        lowest_pct = min(percentages) if percentages else None

        summary = {
            "total_tests_count": total_count,
            "completed_tests_count": completed_count,
            "passed_tests_count": passed_count,
            "failed_tests_count": failed_count,
            "average_percentage": avg_pct,
            "latest_percentage": latest_pct,
            "highest_percentage": highest_pct,
            "lowest_percentage": lowest_pct
        }

        return {
            "student_id": student.id,
            "service_number": student.service_number,
            "full_name": student.full_name,
            "initials": student.initials,
            "rank": student.rank,
            "trade": student.trade,
            "course_id": student.course_id,
            "course_name": course.name if course else None,
            "course_code": course.code if course else None,
            "batch": student.batch,
            "summary": summary,
            "phase_tests": phase_tests
        }

class ExamMarkRepository(BaseRepository[ExamMark]):
    def get_by_exam(self, db: Session, exam_id: str) -> List[ExamMark]:
        results = db.query(ExamMark).filter(ExamMark.exam_id == exam_id).all()
        for em in results:
            student = db.query(Student).filter(Student.id == em.student_id).first()
            if student:
                em.student_name = student.full_name
                em.student_service_number = student.service_number
        return results

class LessonPlanDocumentRepository(BaseRepository[LessonPlanDocument]):
    def _enrich(self, db: Session, doc: LessonPlanDocument) -> LessonPlanDocument:
        """Attach joined fields to a LessonPlanDocument instance."""
        course = db.query(Course).filter(Course.id == doc.course_id).first() if doc.course_id else None
        trade = None
        if course and course.trade_id:
            trade = db.query(Trade).filter(Trade.id == course.trade_id).first()
        uploader = db.query(User).filter(User.id == doc.uploaded_by).first() if doc.uploaded_by else None
        lesson = db.query(Lesson).filter(Lesson.id == doc.lesson_id).first() if doc.lesson_id else None

        doc.course_name = course.name if course else None
        doc.course_code = course.code if course else None
        doc.trade_name = trade.label if trade else None
        doc.trade_id = trade.id if trade else None
        doc.uploader_name = uploader.full_name if uploader else None
        doc.uploader_service_number = uploader.service_number if uploader else None
        doc.lesson_name = lesson.name if lesson else None
        return doc

    def get_by_id(self, db: Session, doc_id: str) -> Optional[LessonPlanDocument]:
        doc = db.query(LessonPlanDocument).filter(LessonPlanDocument.id == doc_id).first()
        if doc:
            self._enrich(db, doc)
        return doc

    def get_by_course(self, db: Session, course_id: str, status: str = 'Active') -> List[LessonPlanDocument]:
        query = db.query(LessonPlanDocument).filter(LessonPlanDocument.course_id == course_id)
        if status and status != 'All':
            query = query.filter(LessonPlanDocument.status == status)
        results = query.order_by(LessonPlanDocument.uploaded_at.desc()).all()
        for doc in results:
            self._enrich(db, doc)
        return results

    def search(
        self,
        db: Session,
        search: Optional[str] = None,
        course_id: Optional[str] = None,
        trade_id: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[LessonPlanDocument]:
        query = db.query(LessonPlanDocument)

        if status and status != 'All':
            query = query.filter(LessonPlanDocument.status == status)
        else:
            # Default: show Active only
            query = query.filter(LessonPlanDocument.status == 'Active')

        if course_id:
            query = query.filter(LessonPlanDocument.course_id == course_id)

        if trade_id:
            # Join through courses to filter by trade
            course_ids = [c.id for c in db.query(Course).filter(Course.trade_id == trade_id).all()]
            query = query.filter(LessonPlanDocument.course_id.in_(course_ids))

        if search:
            search_term = f"%{search}%"
            from sqlalchemy import or_
            query = query.filter(
                or_(
                    LessonPlanDocument.title.ilike(search_term),
                    LessonPlanDocument.original_file_name.ilike(search_term),
                    LessonPlanDocument.subject_name.ilike(search_term),
                    LessonPlanDocument.description.ilike(search_term)
                )
            )

        results = query.order_by(LessonPlanDocument.uploaded_at.desc()).offset(skip).limit(limit).all()
        for doc in results:
            self._enrich(db, doc)
        return results

trade_repo = TradeRepository(Trade)
classroom_repo = ClassroomRepository(Classroom)
course_repo = CourseRepository(Course)
batch_repo = BatchRepository(Batch)
instructor_repo = InstructorRepository()
subject_repo = SubjectRepository(Subject)
lesson_repo = LessonRepository(Lesson)
lesson_plan_repo = LessonPlanRepository(LessonPlan)
lesson_plan_doc_repo = LessonPlanDocumentRepository(LessonPlanDocument)
timetable_repo = TimetableRepository(Timetable)
attendance_repo = AttendanceRepository(AcademicAttendance)
exam_repo = ExamRepository(Exam)
exam_mark_repo = ExamMarkRepository(ExamMark)

class CourseCalendarRepository(BaseRepository[CourseCalendar]):
    def _enrich(self, db: Session, entry: CourseCalendar) -> CourseCalendar:
        """Attach joined fields for course, trade, and instructor."""
        if entry.course_id:
            c = db.query(Course).filter(Course.id == entry.course_id).first()
            if c:
                entry.course_name = c.name
                entry.course_code = c.code
                if c.trade_id:
                    t = db.query(Trade).filter(Trade.id == c.trade_id).first()
                    if t:
                        entry.trade_name = t.label

        if entry.instructor_id:
            u = db.query(User).filter(User.id == entry.instructor_id).first()
            if u:
                rank = u.rank or ""
                name = u.full_name or u.username or ""
                entry.instructor_name = f"{rank} {name}".strip()
                entry.instructor_service_number = u.service_number
        else:
            entry.instructor_name = None
            entry.instructor_service_number = None

        if entry.subject_id:
            sub = db.query(Subject).filter(Subject.id == entry.subject_id).first()
            if sub:
                entry.subject_code = sub.code
                entry.subject_name = sub.name
            else:
                entry.subject_code = None
                entry.subject_name = None
        else:
            entry.subject_code = None
            entry.subject_name = None

        if not hasattr(entry, 'instructor_status') or not entry.instructor_status:
            entry.instructor_status = 'ASSIGNED' if entry.instructor_id else 'NOT_ASSIGNED'

        return entry

    def get_by_course(self, db: Session, course_id: str, status: str = 'Active') -> List[CourseCalendar]:
        query = db.query(CourseCalendar).filter(CourseCalendar.course_id == course_id)
        if status and status != 'All':
            query = query.filter(CourseCalendar.status == status)
        entries = query.order_by(CourseCalendar.serial_number.asc()).all()
        for e in entries:
            self._enrich(db, e)
        return entries

    def get_by_id(self, db: Session, calendar_id: str) -> Optional[CourseCalendar]:
        entry = db.query(CourseCalendar).filter(CourseCalendar.id == calendar_id).first()
        if entry:
            self._enrich(db, entry)
        return entry

    def get_next_serial_number(self, db: Session, course_id: str) -> int:
        max_sn = db.query(func.max(CourseCalendar.serial_number)).filter(
            CourseCalendar.course_id == course_id
        ).scalar()
        return (max_sn or 0) + 1

    def reorder_entries(self, db: Session, course_id: str, ordered_ids: List[str]) -> List[CourseCalendar]:
        for idx, cid in enumerate(ordered_ids, start=1):
            db.query(CourseCalendar).filter(
                CourseCalendar.id == cid,
                CourseCalendar.course_id == course_id
            ).update({"serial_number": idx}, synchronize_session=False)
        db.commit()
        return self.get_by_course(db, course_id)

    def get_calendar_events_by_date_range(
        self,
        db: Session,
        start_date: date,
        end_date: date,
        trade_id: Optional[str] = None,
        course_id: Optional[str] = None,
        batch_id: Optional[str] = None,
        instructor_id: Optional[str] = None,
        instructor_status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Fetch course calendar events overlapping with the requested date range with filters."""
        query = db.query(CourseCalendar).join(Course, CourseCalendar.course_id == Course.id).filter(
            CourseCalendar.status == 'Active',
            Course.deleted_at == None,
            CourseCalendar.commencement_date <= end_date,
            CourseCalendar.completion_date >= start_date
        )

        if trade_id:
            query = query.filter(Course.trade_id == trade_id)

        if course_id:
            query = query.filter(CourseCalendar.course_id == course_id)

        if instructor_id:
            query = query.filter(CourseCalendar.instructor_id == instructor_id)

        if instructor_status and instructor_status.upper() != 'ALL':
            query = query.filter(CourseCalendar.instructor_status == instructor_status.upper())

        if batch_id:
            query = query.join(Batch, Batch.course_id == Course.id).filter(Batch.id == batch_id)

        entries = query.order_by(CourseCalendar.commencement_date.asc(), CourseCalendar.serial_number.asc()).all()
        results = []
        for e in entries:
            self._enrich(db, e)
            
            # Fetch active batch names for course
            active_batches = db.query(Batch).filter(Batch.course_id == e.course_id, Batch.status == 'Active').all()
            batch_names = ", ".join([b.name for b in active_batches]) if active_batches else "N/A"

            inst_name = e.instructor_name if (e.instructor_status == 'ASSIGNED' and e.instructor_name) else "INSTRUCTOR NOT ASSIGNED"

            results.append({
                "id": e.id,
                "course_id": e.course_id,
                "course_name": getattr(e, 'course_name', 'N/A'),
                "course_code": getattr(e, 'course_code', ''),
                "trade_id": getattr(e.course, 'trade_id', None) if getattr(e, 'course', None) else None,
                "trade_name": getattr(e, 'trade_name', None),
                "batch_name": batch_names,
                "activity": e.phase_name,
                "serial_number": e.serial_number,
                "start_date": e.commencement_date,
                "end_date": e.completion_date,
                "instructor_id": e.instructor_id,
                "instructor_name": inst_name,
                "instructor_status": e.instructor_status,
                "theory_periods": e.theory_periods,
                "practical_periods": e.practical_periods,
                "total_periods": e.total_periods,
                "working_days": e.working_days,
                "remarks": e.remarks
            })
        return results

course_calendar_repo = CourseCalendarRepository(CourseCalendar)


