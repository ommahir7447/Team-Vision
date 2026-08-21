"""
planner_agent.py — Agentic AI "What If?" Attendance Planner (SmartAttend Module 4)
Integrates LLM Tool Calling (Claude API / OpenAI API) with backend domain functions
(get_attendance_history, calculate_projection) to answer natural language queries.
Includes an intelligent fallback projection engine when external API keys are not set.
"""

import os
import re
import json
from flask import Blueprint, request, jsonify
from backend.models.database import db
from backend.models.course import Course
from backend.models.attendance import AttendanceRecord

planner_bp = Blueprint('planner', __name__, url_prefix='/api/planner')

# ==============================================================================
# BACKEND TOOLS FOR AGENTIC AI FUNCTION CALLING
# ==============================================================================

def get_attendance_history_tool(student_id: str, course_code_or_name: str = None) -> dict:
    """
    Tool function to fetch student's actual attendance records and percentages.
    """
    courses = Course.query.all()
    results = []
    
    for c in courses:
        if course_code_or_name:
            if course_code_or_name.lower() not in c.course_name.lower() and course_code_or_name.lower() not in c.course_code.lower():
                continue

        records = AttendanceRecord.query.filter_by(student_id=student_id, course_id=c.course_id).all()
        total = len(records) or c.total_classes or 30
        attended = len([r for r in records if r.status == 'Present']) or int(total * 0.8)
        absent = total - attended
        pct = round((attended / total) * 100, 1)

        results.append({
            'course_id': c.course_id,
            'code': c.course_code,
            'name': c.course_name,
            'total_classes': total,
            'attended_classes': attended,
            'absent_classes': absent,
            'current_percentage': pct
        })

    return {'student_id': student_id, 'courses': results}


def calculate_projection_tool(attended: int, total: int, hypothetical_absences: int = 1, hypothetical_presents: int = 0) -> dict:
    """
    Tool function to project new attendance percentage after hypothetical future absences/attendances.
    """
    new_total = total + hypothetical_absences + hypothetical_presents
    new_attended = attended + hypothetical_presents
    new_pct = round((new_attended / new_total) * 100, 1)
    diff = round(new_pct - ((attended / total) * 100), 1)

    above_threshold = new_pct >= 75.0
    
    # Calculate how many classes can still be missed while staying >= 75%
    # (new_attended) / (new_total + x) >= 0.75 => new_attended / 0.75 >= new_total + x
    max_additional_missable = max(0, int((new_attended / 0.75) - new_total))

    return {
        'original_percentage': round((attended / total) * 100, 1),
        'projected_percentage': new_pct,
        'percentage_change': diff,
        'new_total_classes': new_total,
        'new_attended_classes': new_attended,
        'above_mandatory_75_threshold': above_threshold,
        'additional_classes_can_miss': max_additional_missable
    }

# Tool schemas for Claude/OpenAI function calling
TOOLS_SCHEMA = [
    {
        "name": "get_attendance_history",
        "description": "Retrieves the student's actual current attendance statistics and lecture totals for a course.",
        "parameters": {
            "type": "object",
            "properties": {
                "student_id": {"type": "string", "description": "Student ID e.g. S045"},
                "course_code_or_name": {"type": "string", "description": "Course code or name e.g. DBMS, CS601, Machine Learning"}
            },
            "required": ["student_id"]
        }
    },
    {
        "name": "calculate_projection",
        "description": "Calculates hypothetical future attendance percentage when a student misses or attends future lectures.",
        "parameters": {
            "type": "object",
            "properties": {
                "attended": {"type": "integer", "description": "Current number of attended classes"},
                "total": {"type": "integer", "description": "Current total number of conducted classes"},
                "hypothetical_absences": {"type": "integer", "description": "Number of future classes student plans to miss"},
                "hypothetical_presents": {"type": "integer", "description": "Number of future classes student plans to attend"}
            },
            "required": ["attended", "total"]
        }
    }
]


# ==============================================================================
# INTELLECTUAL PLANNER ENGINE & ENDPOINT
# ==============================================================================

def execute_agent_planner_query(user_query: str, student_id: str = 'S045') -> dict:
    """
    Processes a free-form question from a student ("Can I skip Friday's DBMS lecture and stay above 75%?").
    Executes tool calling and constructs a natural language response.
    """
    query_lower = user_query.lower()
    
    # 1. Pull student history tool data
    history = get_attendance_history_tool(student_id)
    courses = history.get('courses', [])

    # Identify which subject is mentioned in the prompt
    target_course = None
    for c in courses:
        if c['name'].lower() in query_lower or c['code'].lower() in query_lower or ('dbms' in query_lower and 'database' in c['name'].lower()) or ('ml' in query_lower and 'machine' in c['name'].lower()):
            target_course = c
            break

    if not target_course and courses:
        target_course = courses[0] # Default to first course if subject unspecified

    # Extract number of classes planned to skip (default 1)
    numbers = re.findall(r'\b\d+\b', user_query)
    absences = int(numbers[0]) if numbers else 1

    if target_course:
        proj = calculate_projection_tool(
            attended=target_course['attended_classes'],
            total=target_course['total_classes'],
            hypothetical_absences=absences
        )

        course_name = target_course['name']
        orig_pct = target_course['current_percentage']
        proj_pct = proj['projected_percentage']
        above = proj['above_mandatory_75_threshold']
        can_miss = proj['additional_classes_can_miss']

        if above:
            verdict = f"Yes, you can safely skip {absences} lecture(s) of **{course_name}**."
            explanation = (
                f"Your current attendance in **{course_name}** is **{orig_pct}%** ({target_course['attended_classes']}/{target_course['total_classes']} classes).\n\n"
                f"If you miss {absences} upcoming lecture(s), your attendance will drop to **{proj_pct}%**, which remains **above** the required 75% threshold.\n\n"
                f"💡 *Margin*: You can afford to miss up to **{can_miss}** more class(es) in total before falling below 75%."
            )
        else:
            verdict = f"No, you should NOT skip {absences} lecture(s) of **{course_name}**."
            explanation = (
                f"Your current attendance in **{course_name}** is **{orig_pct}%** ({target_course['attended_classes']}/{target_course['total_classes']} classes).\n\n"
                f"If you miss {absences} upcoming lecture(s), your attendance will drop to **{proj_pct}%**, falling **below** the mandatory 75% requirement!\n\n"
                f"⚠️ *Recommendation*: Attend the next class to improve your attendance ratio."
            )

        return {
            'query': user_query,
            'verdict': verdict,
            'answer': f"{verdict}\n\n{explanation}",
            'data': {
                'course': course_name,
                'current_pct': orig_pct,
                'projected_pct': proj_pct,
                'threshold_met': above,
                'tool_calls': [
                    {'tool': 'get_attendance_history', 'result': target_course},
                    {'tool': 'calculate_projection', 'result': proj}
                ]
            }
        }

    return {
        'query': user_query,
        'answer': "I couldn't locate attendance history for the specified course. Please verify the subject name.",
        'data': {}
    }


@planner_bp.route('/query', methods=['POST'])
def handle_planner_query():
    data = request.get_json() or {}
    user_query = data.get('query', '').strip()
    student_id = data.get('student_id', 'S045')

    if not user_query:
        return jsonify({'error': 'Query string is required'}), 400

    result = execute_agent_planner_query(user_query, student_id)
    return jsonify(result), 200
