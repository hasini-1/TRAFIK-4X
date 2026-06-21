import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import CommandCard from './ui/CommandCard';
import { ChevronLeft, ChevronRight, Clock, MapPin, Eye, Trash2, Edit, Play } from 'lucide-react';

export default function CalendarView({ onSelectEvent, onCreateActiveEvent }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const initialFormData = {
    event_type: 'planned',
    event_cause: 'festival',
    priority: 'Medium',
    zone: 'Central Zone',
    corridor: 'MG Road Corridor',
    requires_road_closure: false,
    latitude: 12.9716,
    longitude: 77.5946,
    event_date: '',
    start_time: '09:00',
    end_time: '13:00',
    expected_attendance: 5000,
    duration_minutes: 240,
    special_conditions: ''
  };
  const [formData, setFormData] = useState(initialFormData);

  const isDateCompleted = (dateStr) => {
    return events.some(e => e.event_date === dateStr && (e.status || '').toUpperCase() === 'COMPLETED');
  };

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/events/calendar`);
      setEvents(res.data);
    } catch (err) {
      console.error("Failed to fetch calendar data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
    
    const handleRefresh = () => {
      fetchCalendarData();
    };
    window.addEventListener('refresh-notifications', handleRefresh);
    return () => {
      window.removeEventListener('refresh-notifications', handleRefresh);
    };
  }, []);

  const handleEventClick = (e) => {
    window.dispatchEvent(new CustomEvent('open-event-details', { detail: { event: e } }));
    if (onSelectEvent) onSelectEvent(e);
  };

  const handlePrev = () => {
    const next = new Date(currentDate);
    next.setMonth(currentDate.getMonth() - 1);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    next.setMonth(currentDate.getMonth() + 1);
    setCurrentDate(next);
  };

  // Helper: Month days generation
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Pad previous month days
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  // Format date to string key: YYYY-MM-DD (timezone-safe)
  const formatDateKey = (d) => {
    if (!d) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getEventColor = (e) => {
    const status = (e.status || '').toUpperCase();
    if (status === 'COMPLETED' || status === 'RESOLVED') return 'blue';
    if (['ACTIVE', 'ZONE ACTIVE', 'ZONE_ACTIVE'].includes(status)) return 'red';
    if (['APPROVED', 'ZONE_ASSIGNED'].includes(status)) return 'green';
    if (['PENDING_APPROVAL', 'PENDING APPROVAL', 'PENDING_REVIEW', 'SENT_TO_TC', 'UNDER_REVIEW', 'INSPECTOR_REVIEWED', 'SUBMITTED_TO_TC', 'SUBMITTED TO TC'].includes(status)) return 'yellow';
    return 'gray';
  };

  const getStatusBadgeStyle = (status) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED': return 'text-[#00ff66] border-[#00ff66]/30 bg-[#00ff66]/10';
      case 'ACTIVE': return 'text-[#ff7700] border-[#ff7700]/30 bg-[#ff7700]/10';
      case 'APPROVED': return 'text-[#00f0ff] border-[#00f0ff]/30 bg-[#00f0ff]/10';
      case 'REJECTED': return 'text-slate-400 border-slate-400/30 bg-slate-400/10';
      case 'PENDING_REVIEW': 
      case 'INSPECTOR_REVIEWED': return 'text-[#ffcc00] border-[#ffcc00]/30 bg-[#ffcc00]/10';
      default: return 'text-slate-350 border-cyber-border/30 bg-[#050b18]/40';
    }
  };

  const getPriorityBadgeStyle = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL': return 'text-[#ff0055] border-[#ff0055]/30 bg-[#ff0055]/10';
      case 'HIGH': return 'text-[#ff7700] border-[#ff7700]/30 bg-[#ff7700]/10';
      case 'MEDIUM': return 'text-[#ffcc00] border-[#ffcc00]/30 bg-[#ffcc00]/10';
      default: return 'text-[#00ff66] border-[#00ff66]/30 bg-[#00ff66]/10';
    }
  };

  // Get Calendar Title
  const getHeaderTitle = () => {
    return currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' }).toUpperCase();
  };

  // CRUD handlers
  const handleCreateSubmit = async (e, targetStatus = 'DRAFT') => {
    if (e) e.preventDefault();
    
    const dateStr = formData.event_date;
    if (isDateCompleted(dateStr)) {
      alert("This operational day has already been completed and cannot be reused for new event scheduling.");
      return;
    }

    // Validate fields before submission
    const errors = [];
    if (!formData.event_cause) errors.push("Event Cause is required.");
    if (!formData.priority) errors.push("Priority is required.");
    if (!formData.zone || !formData.zone.trim()) errors.push("Zone is required.");
    if (!formData.corridor || !formData.corridor.trim()) errors.push("Corridor is required.");
    if (!formData.event_date) {
      errors.push("Event Date is required.");
    } else {
      // Validate YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(formData.event_date)) {
        errors.push("Event Date must be in YYYY-MM-DD format.");
      }
    }
    if (!formData.start_time) errors.push("Start Time is required.");
    if (!formData.end_time) errors.push("End Time is required.");
    
    const latNum = parseFloat(formData.latitude);
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      errors.push("Latitude must be a valid number between -90 and 90.");
    }
    
    const lngNum = parseFloat(formData.longitude);
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      errors.push("Longitude must be a valid number between -180 and 180.");
    }
    
    const attendanceNum = parseInt(formData.expected_attendance);
    if (isNaN(attendanceNum) || attendanceNum <= 0) {
      errors.push("Expected Attendance must be a positive integer.");
    }
    
    const durationNum = parseInt(formData.duration_minutes);
    if (isNaN(durationNum) || durationNum <= 0) {
      errors.push("Duration must be a positive integer.");
    }

    if (errors.length > 0) {
      alert("Validation Errors:\n" + errors.join("\n"));
      return;
    }

    setLoading(true);
    try {
      // 1. Create/Save Event Draft in database
      const saveDraftRes = await axios.post(`${API_BASE_URL}/events/planner/save-draft`, {
        event_cause: formData.event_cause,
        priority: formData.priority,
        zone: formData.zone,
        corridor: formData.corridor,
        requires_road_closure: formData.requires_road_closure,
        latitude: latNum,
        longitude: lngNum,
        expected_attendance: attendanceNum,
        duration_minutes: durationNum,
        event_date: formData.event_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        special_conditions: formData.special_conditions || ""
      });
      
      const newEventId = saveDraftRes.data.event_id;
      
      // 2. If targetStatus is PENDING_APPROVAL, transition/submit it
      if (targetStatus === 'PENDING_APPROVAL') {
        await axios.post(`${API_BASE_URL}/events/planner/submit-to-commissioner`, {
          event_id: newEventId,
          comments: 'Created event from calendar.'
        });
      }
      
      // 3. Show success notification
      alert(targetStatus === 'PENDING_APPROVAL' 
        ? "Event scheduled and submitted for approval successfully!" 
        : "Event draft created successfully!"
      );

      // 4. Refresh and close modal
      await fetchCalendarData();
      setIsCreateModalOpen(false);

      if (targetStatus === 'PENDING_APPROVAL' && onCreateActiveEvent) {
        const fullEvent = {
          event_id: newEventId,
          event_type: 'planned',
          event_cause: formData.event_cause,
          priority: formData.priority,
          zone: formData.zone,
          corridor: formData.corridor,
          requires_road_closure: formData.requires_road_closure,
          latitude: latNum,
          longitude: lngNum,
          expected_attendance: attendanceNum,
          duration_minutes: durationNum,
          event_date: formData.event_date,
          start_time: formData.start_time,
          end_time: formData.end_time,
          special_conditions: formData.special_conditions || "",
          status: 'PENDING_APPROVAL'
        };
        onCreateActiveEvent(fullEvent);
      }
    } catch (err) {
      console.error("Failed to create and schedule event:", err);
      const serverErr = err.response?.data?.detail || err.message;
      alert("Error scheduling event: " + serverErr);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/events/update`, {
        event_id: formData.event_id,
        event_type: formData.event_type,
        event_cause: formData.event_cause,
        priority: formData.priority,
        zone: formData.zone,
        corridor: formData.corridor,
        requires_road_closure: formData.requires_road_closure,
        latitude: parseFloat(formData.latitude) || 12.9716,
        longitude: parseFloat(formData.longitude) || 77.5946,
        event_date: formData.event_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        expected_attendance: parseInt(formData.expected_attendance) || 5000,
        duration_minutes: parseInt(formData.duration_minutes) || 240,
        special_conditions: formData.special_conditions
      });
      
      await fetchCalendarData();
      setIsEditModalOpen(false);
    } catch (err) {
      console.error("Failed to update event details:", err);
      alert("Error updating event details.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm(`Are you sure you want to delete event ${eventId}? This action is irreversible.`)) {
      return;
    }
    setLoading(true);
    try {
      await axios.delete(`${API_BASE_URL}/events/delete/${eventId}`);
      await fetchCalendarData();
    } catch (err) {
      console.error("Failed to delete event:", err);
      alert("Error deleting event.");
    } finally {
      setLoading(false);
    }
  };

  // Render Month grid
  const renderMonthView = () => {
    const days = getDaysInMonth(currentDate);
    const dayLabels = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    return (
      <div className="space-y-3 select-none">
        <div className="grid grid-cols-7 gap-1 text-center font-bold font-mono text-[10px] text-slate-500 py-2 border-b border-cyber-border/20">
          {dayLabels.map(label => <div key={label}>{label}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, idx) => {
            if (!day) return <div key={idx} className="aspect-square bg-transparent border border-transparent rounded-lg"></div>;
            
            const dateKey = formatDateKey(day);
            const dayEvents = events.filter(e => e.event_date === dateKey);
            const isToday = formatDateKey(new Date()) === dateKey;
            const isSelected = formatDateKey(selectedDate) === dateKey;

            let cellClasses = "aspect-square p-2 border rounded-xl flex flex-col justify-between relative cursor-pointer transition-all min-h-[68px] ";

            if (isSelected) {
              cellClasses += "border-[#00d2ff] bg-[#00d2ff]/10 shadow-[0_0_10px_rgba(0,210,255,0.4)] z-20";
            } else if (isToday) {
              cellClasses += "border-[#00d2ff]/40 bg-[#00d2ff]/5 hover:border-[#00d2ff] hover:bg-[#00d2ff]/10";
            } else {
              cellClasses += "border-cyber-border/30 bg-[#050b18]/30 hover:border-slate-600 hover:bg-[#050b18]/60";
            }

            return (
              <div 
                key={idx} 
                onClick={() => setSelectedDate(day)}
                onDoubleClick={() => {
                  const dateStr = formatDateKey(day);
                  if (isDateCompleted(dateStr)) {
                    alert("This operational day has already been completed and cannot be reused for new event scheduling.");
                    return;
                  }
                  setSelectedDate(day);
                  setFormData({
                    ...initialFormData,
                    event_date: dateStr
                  });
                  setIsCreateModalOpen(true);
                }}
                className={cellClasses}
                style={isSelected ? { border: '2px solid #00d2ff', boxShadow: '0 0 10px rgba(0, 210, 255, 0.4)', backgroundColor: 'rgba(0, 210, 255, 0.08)' } : (isToday ? { border: '1.5px dashed #00d2ff', backgroundColor: 'rgba(0, 210, 255, 0.03)' } : {})}
              >
                <span className={`text-xs font-mono font-bold ${isSelected || isToday ? 'text-[#00d2ff] font-black' : 'text-slate-400'}`}>
                  {day.getDate()}
                </span>

                {isToday && (
                  <span className="absolute top-1.5 right-1.5 text-[7px] font-black font-mono px-1 py-0.2 bg-[#00d2ff] text-[#030611] rounded-sm tracking-tighter">
                    TODAY
                  </span>
                )}
                
                {/* Event Markings */}
                <div className="flex flex-wrap gap-1 mt-1 max-h-[25px] overflow-hidden">
                  {dayEvents.map((e, eIdx) => {
                    const dotColor = getEventColor(e);
                    const colorClasses = {
                      green: 'bg-[#00ff66] shadow-[0_0_4px_rgba(0,255,102,0.6)]',
                      blue: 'bg-[#3b82f6] shadow-[0_0_4px_rgba(59,130,246,0.6)]',
                      orange: 'bg-[#ff7700] shadow-[0_0_4px_rgba(255,119,0,0.6)]',
                      red: 'bg-[#ff0055] shadow-[0_0_4px_rgba(255,0,85,0.6)]',
                      yellow: 'bg-[#ffcc00] shadow-[0_0_4px_rgba(255,204,0,0.6)]',
                      gray: 'bg-slate-500 shadow-[0_0_4px_rgba(100,116,139,0.6)]'
                    };
                    return (
                      <span 
                        key={e.event_id || eIdx}
                        className={`w-1.5 h-1.5 rounded-full ${colorClasses[dotColor] || 'bg-slate-400'}`}
                        title={`${e.event_id}: ${e.event_cause}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCreateModal = () => {
    if (!isCreateModalOpen) return null;
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 font-mono select-none">
        <div className="bg-[#080c1e] border border-cyber-accent rounded-2xl w-full max-w-xl p-5 shadow-[0_0_30px_rgba(0,210,255,0.3)] space-y-4 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center border-b border-cyber-border/40 pb-2.5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-orbitron">Schedule New Planned Event</h3>
            <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white text-xs bg-transparent border-none cursor-pointer">CLOSE [X]</button>
          </div>
          <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-500 uppercase font-bold text-[10px]">Event Cause</label>
                <select 
                  value={formData.event_cause} 
                  onChange={(e) => setFormData({...formData, event_cause: e.target.value})}
                  className="w-full bg-[#050b18] border border-cyber-border/80 p-2 rounded-lg text-white font-mono outline-none"
                >
                  <option value="festival">Festival</option>
                  <option value="political_rally">Political Rally</option>
                  <option value="sporting_event">Sporting Event</option>
                  <option value="marathon">Marathon</option>
                  <option value="concert">Concert</option>
                  <option value="vip_movement">VIP Movement</option>
                  <option value="protest">Protest</option>
                  <option value="construction">Construction</option>
                  <option value="other">Other / General</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-slate-500 uppercase font-bold text-[10px]">Priority</label>
                <select 
                  value={formData.priority} 
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  className="w-full bg-[#050b18] border border-cyber-border/80 p-2 rounded-lg text-white font-mono outline-none"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-500 uppercase font-bold text-[10px]">Zone</label>
                <input 
                  type="text" 
                  value={formData.zone} 
                  onChange={(e) => setFormData({...formData, zone: e.target.value})}
                  className="w-full bg-[#050b18] border border-cyber-border/80 p-2 rounded-lg text-white font-mono outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-500 uppercase font-bold text-[10px]">Corridor / Main Route</label>
                <input 
                  type="text" 
                  value={formData.corridor} 
                  onChange={(e) => setFormData({...formData, corridor: e.target.value})}
                  className="w-full bg-[#050b18] border border-cyber-border/80 p-2 rounded-lg text-white font-mono outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-slate-500 uppercase font-bold text-[10px]">Event Date</label>
                <input 
                  type="date" 
                  value={formData.event_date} 
                  onChange={(e) => setFormData({...formData, event_date: e.target.value})}
                  className="w-full bg-[#050b18] border border-cyber-border/80 p-2 rounded-lg text-white font-mono outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-500 uppercase font-bold text-[10px]">Start Time</label>
                <input 
                  type="time" 
                  value={formData.start_time} 
                  onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                  className="w-full bg-[#050b18] border border-cyber-border/80 p-2 rounded-lg text-white font-mono outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-500 uppercase font-bold text-[10px]">End Time</label>
                <input 
                  type="time" 
                  value={formData.end_time} 
                  onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                  className="w-full bg-[#050b18] border border-cyber-border/80 p-2 rounded-lg text-white font-mono outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-500 uppercase font-bold text-[10px]">Latitude</label>
                <input 
                  type="number" 
                  step="0.000001"
                  value={formData.latitude} 
                  onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                  className="w-full bg-[#050b18] border border-cyber-border/80 p-2 rounded-lg text-white font-mono outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-500 uppercase font-bold text-[10px]">Longitude</label>
                <input 
                  type="number" 
                  step="0.000001"
                  value={formData.longitude} 
                  onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                  className="w-full bg-[#050b18] border border-cyber-border/80 p-2 rounded-lg text-white font-mono outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-500 uppercase font-bold text-[10px]">Expected Attendance</label>
                <input 
                  type="number" 
                  value={formData.expected_attendance} 
                  onChange={(e) => setFormData({...formData, expected_attendance: e.target.value})}
                  className="w-full bg-[#050b18] border border-cyber-border/80 p-2 rounded-lg text-white font-mono outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-500 uppercase font-bold text-[10px]">Duration (Minutes)</label>
                <input 
                  type="number" 
                  value={formData.duration_minutes} 
                  onChange={(e) => setFormData({...formData, duration_minutes: e.target.value})}
                  className="w-full bg-[#050b18] border border-cyber-border/80 p-2 rounded-lg text-white font-mono outline-none"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 py-1.5 select-none">
              <input 
                type="checkbox" 
                id="road_closure_create"
                checked={formData.requires_road_closure} 
                onChange={(e) => setFormData({...formData, requires_road_closure: e.target.checked})}
                className="w-4 h-4 rounded border-cyber-border/80 bg-[#050b18] accent-cyber-accent outline-none cursor-pointer"
              />
              <label htmlFor="road_closure_create" className="text-slate-300 font-bold uppercase tracking-wider text-[10px] cursor-pointer">Requires Road Closure (Exclusion Zone)</label>
            </div>

            <div className="space-y-1">
              <label className="text-slate-500 uppercase font-bold text-[10px]">Special Conditions</label>
              <textarea 
                value={formData.special_conditions} 
                onChange={(e) => setFormData({...formData, special_conditions: e.target.value})}
                placeholder="vip, weather (rain), bypass directives..."
                className="w-full bg-[#050b18] border border-cyber-border/80 p-2 rounded-lg text-white font-mono outline-none h-16 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2 border-t border-cyber-border/40">
              <button
                type="button"
                onClick={(e) => handleCreateSubmit(e, 'DRAFT')}
                className="flex-1 py-2.5 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 font-orbitron font-bold text-center rounded-xl cursor-pointer transition-all uppercase"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={(e) => handleCreateSubmit(e, 'PENDING_APPROVAL')}
                className="flex-1 py-2.5 bg-cyber-accent text-slate-950 font-orbitron font-bold text-center rounded-xl cursor-pointer border-none shadow-[0_0_15px_rgba(0,210,255,0.25)] hover:bg-[#00f0ff] transition-all uppercase"
              >
                Create Event
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderEditModal = () => {
    if (!isEditModalOpen) return null;
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 font-mono select-none">
        <div className="bg-[#080c1e] border border-cyber-accent rounded-2xl w-full max-w-xl p-5 shadow-[0_0_30px_rgba(0,210,255,0.3)] space-y-4 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center border-b border-cyber-border/40 pb-2.5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-orbitron">Edit Scheduled Event details</h3>
            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white text-xs bg-transparent border-none cursor-pointer">CLOSE [X]</button>
          </div>
          <form onSubmit={handleUpdateSubmit} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-500 uppercase font-bold text-[10px]">Event Cause</label>
                <select 
                  value={formData.event_cause} 
                  onChange={(e) => setFormData({...formData, event_cause: e.target.value})}
                  className="w-full bg-[#050b18] border border-cyber-border/80 p-2 rounded-lg text-white font-mono outline-none"
                >
                  <option value="festival">Festival</option>
                  <option value="political_rally">Political Rally</option>
                  <option value="sporting_event">Sporting Event</option>
                  <option value="marathon">Marathon</option>
                  <option value="concert">Concert</option>
                  <option value="vip_movement">VIP Movement</option>
                  <option value="protest">Protest</option>
                  <option value="construction">Construction</option>
                  <option value="other">Other / General</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-slate-500 uppercase font-bold text-[10px]">Priority</label>
                <select 
                  value={formData.priority} 
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  className="w-full bg-[#050b18] border border-cyber-border/80 p-2 rounded-lg text-white font-mono outline-none"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-500 uppercase font-bold text-[10px]">Zone</label>
                <input 
                  type="text" 
                  value={formData.zone} 
                  onChange={(e) => setFormData({...formData, zone: e.target.value})}
                  className="w-full bg-[#050b18] border border-cyber-border/80 p-2 rounded-lg text-white font-mono outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-500 uppercase font-bold text-[10px]">Corridor / Main Route</label>
                <input 
                  type="text" 
                  value={formData.corridor} 
                  onChange={(e) => setFormData({...formData, corridor: e.target.value})}
                  className="w-full bg-[#050b18] border border-cyber-border/80 p-2 rounded-lg text-white font-mono outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-slate-500 uppercase font-bold text-[10px]">Event Date</label>
                <input 
                  type="date" 
                  value={formData.event_date} 
                  onChange={(e) => setFormData({...formData, event_date: e.target.value})}
                  className="w-full bg-[#050b18] border border-cyber-border/80 p-2 rounded-lg text-white font-mono outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-500 uppercase font-bold text-[10px]">Start Time</label>
                <input 
                  type="time" 
                  value={formData.start_time} 
                  onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                  className="w-full bg-[#050b18] border border-cyber-border/80 p-2 rounded-lg text-white font-mono outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-500 uppercase font-bold text-[10px]">End Time</label>
                <input 
                  type="time" 
                  value={formData.end_time} 
                  onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                  className="w-full bg-[#050b18] border border-cyber-border/80 p-2 rounded-lg text-white font-mono outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-500 uppercase font-bold text-[10px]">Latitude</label>
                <input 
                  type="number" 
                  step="0.000001"
                  value={formData.latitude} 
                  onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                  className="w-full bg-[#050b18] border border-cyber-border/80 p-2 rounded-lg text-white font-mono outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-500 uppercase font-bold text-[10px]">Longitude</label>
                <input 
                  type="number" 
                  step="0.000001"
                  value={formData.longitude} 
                  onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                  className="w-full bg-[#050b18] border border-cyber-border/80 p-2 rounded-lg text-white font-mono outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-500 uppercase font-bold text-[10px]">Expected Attendance</label>
                <input 
                  type="number" 
                  value={formData.expected_attendance} 
                  onChange={(e) => setFormData({...formData, expected_attendance: e.target.value})}
                  className="w-full bg-[#050b18] border border-cyber-border/80 p-2 rounded-lg text-white font-mono outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-500 uppercase font-bold text-[10px]">Duration (Minutes)</label>
                <input 
                  type="number" 
                  value={formData.duration_minutes} 
                  onChange={(e) => setFormData({...formData, duration_minutes: e.target.value})}
                  className="w-full bg-[#050b18] border border-cyber-border/80 p-2 rounded-lg text-white font-mono outline-none"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 py-1.5 select-none">
              <input 
                type="checkbox" 
                id="road_closure_edit"
                checked={formData.requires_road_closure} 
                onChange={(e) => setFormData({...formData, requires_road_closure: e.target.checked})}
                className="w-4 h-4 rounded border-cyber-border/80 bg-[#050b18] accent-cyber-accent outline-none cursor-pointer"
              />
              <label htmlFor="road_closure_edit" className="text-slate-300 font-bold uppercase tracking-wider text-[10px] cursor-pointer">Requires Road Closure (Exclusion Zone)</label>
            </div>

            <div className="space-y-1">
              <label className="text-slate-500 uppercase font-bold text-[10px]">Special Conditions</label>
              <textarea 
                value={formData.special_conditions} 
                onChange={(e) => setFormData({...formData, special_conditions: e.target.value})}
                placeholder="vip, weather (rain), bypass directives..."
                className="w-full bg-[#050b18] border border-cyber-border/80 p-2 rounded-lg text-white font-mono outline-none h-16 resize-none"
              />
            </div>

            <button 
              type="submit" 
              className="w-full py-2.5 bg-[#3b82f6] hover:bg-blue-600 text-white font-orbitron font-bold text-center rounded-xl cursor-pointer border-none shadow-[0_0_15px_rgba(59,130,246,0.25)] transition-all uppercase"
            >
              Confirm and Save Changes
            </button>
          </form>
        </div>
      </div>
    );
  };

  const selectedDateKey = formatDateKey(selectedDate);
  const selectedDayEvents = events.filter(e => e.event_date === selectedDateKey);

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6">
      
      {/* LEFT PANEL (35%): Calendar Component */}
      <div className="w-full lg:w-[38%] flex flex-col">
        <CommandCard title="Operations Calendar" className="h-full">
          <div className="space-y-4">
            
            {/* Navigation Header */}
            <div className="flex justify-between items-center border-b border-cyber-border/40 pb-3 font-mono text-xs select-none">
              <div className="flex items-center gap-3 w-full justify-between">
                <button 
                  onClick={handlePrev}
                  className="p-1.5 border border-cyber-border rounded hover:border-[#00d2ff] hover:text-[#00d2ff] text-slate-400 bg-transparent cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <span className="font-bold text-white tracking-wider font-orbitron text-xs sm:text-sm">{getHeaderTitle()}</span>
                
                <button 
                  onClick={handleNext}
                  className="p-1.5 border border-cyber-border rounded hover:border-[#00d2ff] hover:text-[#00d2ff] text-slate-400 bg-transparent cursor-pointer transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Monthly Grid */}
            {loading ? (
              <div className="py-20 text-center font-mono text-slate-500 text-xs animate-pulse">
                Loading Operations Calendar...
              </div>
            ) : (
              <div className="min-h-[300px]">
                {renderMonthView()}
              </div>
            )}

          </div>
        </CommandCard>
      </div>

      {/* RIGHT PANEL (65%): Selected Day Events */}
      <div className="w-full lg:w-[62%] flex flex-col">
        <CommandCard 
          title={`Operations for ${selectedDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`}
          headerRight={
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-[#00d2ff]">
                {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'Incident' : 'Incidents'} Registered
              </span>
              <button
                onClick={() => {
                  const dateStr = formatDateKey(selectedDate);
                  if (isDateCompleted(dateStr)) {
                    alert("This operational day has already been completed and cannot be reused for new event scheduling.");
                    return;
                  }
                  setFormData({
                    ...initialFormData,
                    event_date: dateStr
                  });
                  setIsCreateModalOpen(true);
                }}
                className="px-2.5 py-1 bg-slate-900 border border-slate-700 hover:bg-slate-850 text-slate-300 rounded text-[9px] font-bold font-orbitron cursor-pointer select-none transition-all uppercase"
              >
                Save Draft
              </button>
              <button
                onClick={() => {
                  const dateStr = formatDateKey(selectedDate);
                  if (isDateCompleted(dateStr)) {
                    alert("This operational day has already been completed and cannot be reused for new event scheduling.");
                    return;
                  }
                  setFormData({
                    ...initialFormData,
                    event_date: dateStr
                  });
                  setIsCreateModalOpen(true);
                }}
                className="px-2.5 py-1 bg-cyber-accent hover:bg-[#00f0ff] text-slate-950 rounded text-[9px] font-bold font-orbitron cursor-pointer select-none transition-all uppercase"
              >
                Create Event
              </button>
            </div>
          }
          className="h-full"
        >
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {selectedDayEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center border border-dashed border-cyber-border/30 rounded-2xl bg-[#050b18]/25 select-none">
                <svg className="w-16 h-16 text-slate-650 mb-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l4 4m0-4l-4 4" />
                </svg>
                <h4 className="text-sm font-bold text-slate-350 font-orbitron uppercase tracking-wider">No Events Scheduled</h4>
                <p className="text-xs text-slate-500 font-mono mt-2 max-w-sm">
                  There are no active, completed, or upcoming operations registered for this date. Select another day on the calendar roster or click "+ Schedule Event" to register a new one.
                </p>
              </div>
            ) : (
              selectedDayEvents.map((e, index) => (
                <div 
                  key={e.event_id || index}
                  onClick={() => handleEventClick(e)}
                  className="glass-card-exact p-4 rounded-xl border border-cyber-border/40 hover:border-[#00d2ff]/40 transition-all flex flex-col gap-3 relative group cursor-pointer"
                >
                  {/* Decorative corner brackets */}
                  <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-[#00d2ff]/20 group-hover:border-[#00d2ff]/50"></div>
                  <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-[#00d2ff]/20 group-hover:border-[#00d2ff]/50"></div>

                  {/* Header: Cause, Type, Status & Priority */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 block">EVENT ID: {e.event_id}</span>
                      <h4 className="text-sm font-bold text-white capitalize tracking-wide font-orbitron mt-0.5">{e.event_cause.replace(/_/g, ' ')}</h4>
                      <span className="text-xs text-slate-400 font-mono mt-0.5 block">{e.event_type}</span>
                    </div>
                    
                    <div className="flex sm:flex-col items-start sm:items-end gap-2 shrink-0">
                      <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${getStatusBadgeStyle(e.status)}`}>
                        {e.status.replace(/_/g, ' ')}
                      </span>
                      <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${getPriorityBadgeStyle(e.priority)}`}>
                        {e.priority} PRIORITY
                      </span>
                    </div>
                  </div>

                  {/* Technical details block */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#050b18]/60 p-3 rounded-lg border border-cyber-border/30 text-xs font-mono">
                    
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase">Operational Window</span>
                      <div className="flex items-center gap-1.5 mt-1 text-slate-300 font-bold">
                        <Clock className="w-3.5 h-3.5 text-[#00d2ff]" />
                        <span>{e.start_time} - {e.end_time}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase">Operational Impact</span>
                      <div className="text-sm font-bold text-[#00d2ff] mt-1 flex items-center gap-1">
                        <span>Score:</span>
                        <span className="text-white font-black font-orbitron text-base">{e.impact_score}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase">Citizen Impact</span>
                      <div className="text-sm font-bold text-[#ff7700] mt-1 flex items-center gap-1">
                        <span>Score:</span>
                        <span className="text-white font-black font-orbitron text-base">
                          {e.citizen_impact_score || Math.round(e.impact_score * 0.85)}
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Footer metadata & Action Buttons */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-t border-cyber-border/20 pt-3 mt-1">
                    <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {e.corridor} &bull; {e.zone}
                    </span>
                    
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      {['DRAFT', 'SIMULATED'].includes((e.status || '').toUpperCase()) && (
                        <button
                          onClick={(evt) => {
                            evt.stopPropagation();
                            window.dispatchEvent(new CustomEvent('edit-draft-in-planner', { detail: e }));
                          }}
                          className="px-3 py-2 rounded-lg border border-[#00ff66] bg-[#00ff66]/10 hover:bg-[#00ff66] text-[#00ff66] hover:text-[#030611] text-[10px] font-bold font-orbitron tracking-wider cursor-pointer transition-all flex items-center gap-1 shadow-[0_0_8px_rgba(0,255,102,0.15)]"
                        >
                          <Play className="w-3 h-3 animate-pulse" />
                          RESUME PLANNING
                        </button>
                      )}
                      <button
                        onClick={(evt) => {
                          evt.stopPropagation();
                          setFormData({
                            event_id: e.event_id,
                            event_type: e.event_type,
                            event_cause: e.event_cause,
                            priority: e.priority,
                            zone: e.zone,
                            corridor: e.corridor,
                            requires_road_closure: e.requires_road_closure,
                            latitude: e.latitude || 12.9716,
                            longitude: e.longitude || 77.5946,
                            event_date: e.event_date,
                            start_time: e.start_time || '09:00',
                            end_time: e.end_time || '13:00',
                            expected_attendance: e.expected_attendance || 5000,
                            duration_minutes: e.duration_minutes || 240,
                            special_conditions: e.special_conditions || ''
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="px-3 py-2 rounded-lg border border-cyber-accent/60 bg-[#050b18] hover:bg-cyber-accent hover:text-slate-950 text-cyber-accent text-[10px] font-bold font-orbitron tracking-wider cursor-pointer transition-all flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" />
                        EDIT
                      </button>
                      <button
                        onClick={(evt) => {
                          evt.stopPropagation();
                          handleDeleteEvent(e.event_id);
                        }}
                        className="px-3 py-2 rounded-lg border border-[#ff0055]/60 bg-[#050b18] hover:bg-[#ff0055] hover:text-white text-[#ff0055] text-[10px] font-bold font-orbitron tracking-wider cursor-pointer transition-all flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        DELETE
                      </button>
                      <button
                        onClick={(evt) => {
                          evt.stopPropagation();
                          handleEventClick(e);
                        }}
                        className="px-3 py-2 rounded-lg border border-[#00d2ff] bg-[#00d2ff]/10 hover:bg-[#00d2ff] text-[#00d2ff] hover:text-[#030611] text-[10px] font-bold font-orbitron tracking-wider cursor-pointer transition-all flex items-center justify-center gap-2 shadow-[0_0_8px_rgba(0,210,255,0.15)] hover:shadow-[0_0_12px_rgba(0,210,255,0.4)]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        VIEW DETAILS
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CommandCard>
      </div>

      {renderCreateModal()}
      {renderEditModal()}
    </div>
  );
}
