"""
predictor.py — Defaulter Prediction & Statistical Analytics (SmartAttend Module 4)
Analyzes historical attendance records per student, projects expected final percentages,
and flags students at risk of falling below the mandatory 75% cutoff.
"""

def analyze_student_defaulter_risk(attended: int, total: int, upcoming_classes: int = 10, threshold: float = 75.0) -> dict:
    """
    Computes current attendance percentage, projects trajectory under hypothetical absences,
    and returns risk classification ('Low', 'Moderate', 'High', 'Critical').
    """
    if total == 0:
        return {'current_pct': 100.0, 'risk_level': 'Low', 'max_missable': upcoming_classes}

    current_pct = round((attended / total) * 100.0, 1)
    
    # Calculate how many remaining classes student can afford to miss while remaining >= threshold
    # (attended) / (total + upcoming_classes) >= threshold / 100
    # or if student attends all future classes vs misses some
    
    max_total = total + upcoming_classes
    # Minimum attended needed out of max_total
    min_attended_needed = int(np_ceil((threshold / 100.0) * max_total))
    max_missable = max(0, (attended + upcoming_classes) - min_attended_needed)

    if current_pct < 65.0:
        risk_level = 'Critical'
    elif current_pct < 75.0:
        risk_level = 'High'
    elif current_pct < 80.0:
        risk_level = 'Moderate'
    else:
        risk_level = 'Low'

    return {
        'current_pct': current_pct,
        'risk_level': risk_level,
        'max_missable_future_classes': max_missable,
        'is_defaulter': current_pct < threshold,
        'summary': f"Current attendance is {current_pct}%. Risk level: {risk_level}."
    }


def np_ceil(val: float) -> int:
    import math
    return math.ceil(val)


def get_class_defaulter_report(students_data: list, threshold: float = 75.0) -> dict:
    """
    Scans an entire class registry and generates a faculty summary of at-risk students.
    """
    at_risk = []
    defaulters = []

    for s in students_data:
        attended = s.get('attended', 0)
        total = s.get('total', 1)
        res = analyze_student_defaulter_risk(attended, total, threshold=threshold)
        
        entry = {
            'student_id': s.get('student_id') or s.get('id'),
            'name': s.get('name'),
            'current_pct': res['current_pct'],
            'risk_level': res['risk_level']
        }

        if res['is_defaulter']:
            defaulters.append(entry)
        elif res['risk_level'] in ['High', 'Moderate']:
            at_risk.append(entry)

    return {
        'total_defaulters': len(defaulters),
        'total_at_risk': len(at_risk),
        'defaulters': defaulters,
        'at_risk': at_risk
    }
