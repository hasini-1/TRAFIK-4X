from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False) # Roles: CONSTABLE, INSPECTOR, SENIOR_OFFICIAL, COMMAND_CENTER
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Onboarding Status & Approvals
    status = Column(String, default="PENDING_APPROVAL") # PENDING_APPROVAL, UNDER_VERIFICATION, ACTIVE, REJECTED, SUSPENDED
    approved_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    # Profile fields
    phone_number = Column(String, nullable=True)
    employee_id = Column(String, nullable=True)
    zone = Column(String, nullable=True)

    # Relationships
    created_events = relationship("Event", foreign_keys="[Event.created_by]", back_populates="creator")
    approved_events = relationship("Event", foreign_keys="[Event.approved_by]", back_populates="approver")
    approvals = relationship("Approval", back_populates="user")
    assignments = relationship("Assignment", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")
    notifications = relationship("Notification", back_populates="user")

class Event(Base):
    __tablename__ = 'events'

    event_id = Column(String, primary_key=True, index=True)
    event_type = Column(String, nullable=False)
    event_cause = Column(String, nullable=False)
    priority = Column(String, nullable=False)
    zone = Column(String, nullable=False)
    corridor = Column(String, nullable=False)
    requires_road_closure = Column(Boolean, nullable=False)
    impact_score = Column(Float, nullable=False)
    risk_band = Column(String, nullable=False)
    confidence_score = Column(Float, nullable=False)
    status = Column(String, default="DRAFT") # Statuses: DRAFT, PENDING_REVIEW, INSPECTOR_REVIEWED, APPROVED, REJECTED, ACTIVE, COMPLETED
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    approved_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    # SLA timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    activated_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Coordinates
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Locked predictions & NeuroTwin metadata
    neurotwin_scenarios = Column(String, nullable=True)
    neurotwin_similar_events = Column(String, nullable=True)
    neurotwin_plan_b = Column(String, nullable=True)
    congestion_prediction = Column(Float, nullable=True)
    ai_traffic_personnel = Column(Integer, nullable=True)
    final_traffic_personnel = Column(Integer, nullable=True)
    deployment_timeline = Column(String, nullable=True)
    ai_recommendation_summary = Column(String, nullable=True)

    # AI Recommendations (Preserved separately)
    ai_officers = Column(Integer, nullable=True)
    ai_barricades = Column(Integer, nullable=True)
    ai_tow_vehicles = Column(Integer, nullable=True)
    ai_response_level = Column(String, nullable=True)

    # Final approved resources (Edited/overridden by Inspector/Senior Official)
    final_officers = Column(Integer, nullable=True)
    final_barricades = Column(Integer, nullable=True)
    final_tow_vehicles = Column(Integer, nullable=True)
    final_response_level = Column(String, nullable=True)
    approved_scenario = Column(String, nullable=True)
    scenario_modified_by = Column(String, nullable=True)
    draft_version = Column(Integer, default=1, nullable=True)
    parent_event_id = Column(String, nullable=True)
    override_reason = Column(String, nullable=True)
    current_step = Column(Integer, default=1, nullable=True)

    # Outcome Capture fields (populated upon incident resolution)
    actual_delay = Column(Float, nullable=True)
    resources_used = Column(String, nullable=True)
    officers_deployed = Column(Integer, nullable=True)
    emergency_units_used = Column(String, nullable=True)
    road_clearance_time_minutes = Column(Float, nullable=True)
    response_time_minutes = Column(Float, nullable=True)
    resolution_time_minutes = Column(Float, nullable=True)

    # Citizen Impact fields
    road_closure_duration_minutes = Column(Float, nullable=True)
    number_affected_roads = Column(Integer, nullable=True)
    estimated_citizens_affected = Column(Integer, nullable=True)
    estimated_vehicles_affected = Column(Integer, nullable=True)
    traffic_diversions_used = Column(String, nullable=True)

    # Dynamic Planned Event and Learning fields
    expected_attendance = Column(Integer, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    event_date = Column(String, nullable=True)
    start_time = Column(String, nullable=True)
    end_time = Column(String, nullable=True)
    special_conditions = Column(String, nullable=True)
    lessons_learned = Column(String, nullable=True)
    success_rate = Column(Float, nullable=True)

    # Rejection & Resubmission fields
    rejected_by = Column(Integer, nullable=True)
    rejected_at = Column(DateTime, nullable=True)
    rejection_reason = Column(String, nullable=True)
    resubmitted_at = Column(DateTime, nullable=True)

    # Emergency Response telemetry fields
    accepted_by = Column(Integer, nullable=True)
    accepted_at = Column(DateTime, nullable=True)
    arrival_time = Column(DateTime, nullable=True)
    resolution_time = Column(DateTime, nullable=True)
    declined_by = Column(Integer, nullable=True)
    declined_at = Column(DateTime, nullable=True)
    decline_reason = Column(String, nullable=True)


    # Relationships
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_events")
    approver = relationship("User", foreign_keys=[approved_by], back_populates="approved_events")
    approvals = relationship("Approval", back_populates="event")
    assignments = relationship("Assignment", back_populates="event")
    audit_logs = relationship("AuditLog", back_populates="event")
    workflow_history = relationship("WorkflowHistory", back_populates="event", cascade="all, delete-orphan")

class Approval(Base):
    __tablename__ = 'approvals'

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String, ForeignKey('events.event_id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    action = Column(String, nullable=False) # e.g. APPROVED, REJECTED
    comments = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    event = relationship("Event", back_populates="approvals")
    user = relationship("User", back_populates="approvals")

class ApprovalHistory(Base):
    __tablename__ = 'approval_history'

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String, nullable=False)
    reviewer = Column(String, nullable=False)
    action = Column(String, nullable=False)
    comments = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class Assignment(Base):
    __tablename__ = 'assignments'

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String, ForeignKey('events.event_id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    role_assigned = Column(String, nullable=False) # e.g. INSPECTOR, CONSTABLE
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    event = relationship("Event", back_populates="assignments")
    user = relationship("User", back_populates="assignments")

class AuditLog(Base):
    __tablename__ = 'audit_logs'

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String, ForeignKey('events.event_id'), nullable=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    action = Column(String, nullable=False) # e.g. Event Created, Event Modified, Event Approved, etc.
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    event = relationship("Event", back_populates="audit_logs")
    user = relationship("User", back_populates="audit_logs")

class Notification(Base):
    __tablename__ = 'notifications'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    message = Column(String, nullable=False)
    priority = Column(String, default="LOW") # LOW, MEDIUM, HIGH, CRITICAL
    read = Column(Boolean, default=False)
    sender = Column(String, nullable=True, default="System")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Newly added fields for FIX 12
    receiver_role = Column(String, nullable=True)
    receiver_user = Column(Integer, nullable=True)
    title = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)

    # Relationships
    user = relationship("User", back_populates="notifications")

class Report(Base):
    __tablename__ = 'reports'

    id = Column(String, primary_key=True, index=True)
    event_id = Column(String, ForeignKey('events.event_id'), nullable=False)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    assigned_to = Column(Integer, ForeignKey('users.id'), nullable=True)
    status = Column(String, default="Draft") # Draft, Submitted, Under Review, Approved, Rejected
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Persistence aliases
    report_id = Column(String, nullable=True)
    report_status = Column(String, nullable=True)
    submitted_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    submitted_at = Column(DateTime, nullable=True)

    # Relationships
    event = relationship("Event")
    creator = relationship("User", foreign_keys=[created_by])
    assignee = relationship("User", foreign_keys=[assigned_to])

class EmergencyAlert(Base):
    __tablename__ = 'emergency_alerts'

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    alert_id = Column(String, unique=True, index=True, nullable=False)
    reported_by = Column(String, nullable=False)
    incident_type = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    location = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    description = Column(String, nullable=False)
    status = Column(String, default="CREATED")
    dispatch_source = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class EmergencyDispatch(Base):
    __tablename__ = 'emergency_dispatches'

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    dispatch_id = Column(String, unique=True, index=True, nullable=False)
    alert_id = Column(String, ForeignKey('emergency_alerts.alert_id'), nullable=False)
    dispatched_to = Column(String, nullable=True) # e.g. "EMERGENCY_RESPONSE"
    status = Column(String, default="PENDING")
    created_at = Column(DateTime, default=datetime.utcnow)

class WorkflowHistory(Base):
    __tablename__ = 'workflow_history'

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String, ForeignKey('events.event_id'), nullable=False)
    previous_status = Column(String, nullable=True)
    new_status = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    comments = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    event = relationship("Event", back_populates="workflow_history")
    user = relationship("User")

class GenomeCalibration(Base):
    __tablename__ = 'genome_calibrations'

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    event_id = Column(String, ForeignKey('events.event_id'), nullable=False)
    status = Column(String, default="Pending") # Pending, Calibrating, Completed
    prediction_error = Column(Float, nullable=True)
    congestion_accuracy = Column(Float, nullable=True)
    resource_accuracy = Column(Float, nullable=True)
    calibration_metrics = Column(String, nullable=True)
    calibration_report = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
