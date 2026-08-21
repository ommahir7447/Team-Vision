/**
 * api.js — SmartAttend Data Layer
 * Hierarchy: Subject → Program → Semester → Section → {stats, students, trend, activity}
 * Replace each async function body with fetch() when Flask backend is ready.
 */

export const API_BASE = 'http://localhost:5000/api';
export const USE_MOCK = true;

/* ── TREND LABELS (shared) ── */
const WEEKS = ['Wk 1','Wk 2','Wk 3','Wk 4','Wk 5','Wk 6','Wk 7','Wk 8'];

/* ================================================================
   MOCK CLASS REGISTRY
   Hierarchy: Subject → Program → Semester → Section → classData
   ================================================================ */
const MOCK_CLASSES = {

  'Machine Learning': {
    'B.Tech CSE': {
      'Semester 7': {
        'Section B': {
          stats: { total:38, present:32, absent:4, flagged:2, rate:84.2 },
          trend: { labels:WEEKS, datasets:[{ label:'Attendance %', data:[88,85,82,80,84,81,83,84] }] },
          students: [
            { id:'22BCS701', name:'Aarav Mehta',    status:'Present', confidence:0.97, time:'09:02 AM', type:'Auto'   },
            { id:'22BCS702', name:'Bhavya Shah',    status:'Present', confidence:0.91, time:'09:04 AM', type:'Auto'   },
            { id:'22BCS703', name:'Chirag Patel',   status:'Absent',  confidence:null,  time:'—',        type:null     },
            { id:'22BCS704', name:'Diya Joshi',     status:'Present', confidence:0.88, time:'09:07 AM', type:'Auto'   },
            { id:'22BCS705', name:'Esha Trivedi',   status:'Flagged', confidence:0.63, time:'09:09 AM', type:'Manual' },
            { id:'22BCS706', name:'Farhan Khan',    status:'Present', confidence:0.95, time:'09:11 AM', type:'Auto'   },
            { id:'22BCS707', name:'Gauri Desai',    status:'Present', confidence:0.82, time:'09:13 AM', type:'Auto'   },
            { id:'22BCS708', name:'Harsh Gupta',    status:'Absent',  confidence:null,  time:'—',        type:null     },
            { id:'22BCS709', name:'Isha Nair',      status:'Present', confidence:0.93, time:'09:15 AM', type:'Auto'   },
            { id:'22BCS710', name:'Jay Verma',      status:'Present', confidence:0.79, time:'09:18 AM', type:'Auto'   },
            { id:'22BCS711', name:'Kriti Agrawal',  status:'Present', confidence:0.96, time:'09:20 AM', type:'Auto'   },
            { id:'22BCS712', name:'Laksh Solanki',  status:'Absent',  confidence:null,  time:'—',        type:null     },
            { id:'22BCS713', name:'Mira Jain',      status:'Present', confidence:0.84, time:'09:22 AM', type:'Auto'   },
            { id:'22BCS714', name:'Nikhil Rao',     status:'Present', confidence:0.90, time:'09:25 AM', type:'Auto'   },
            { id:'22BCS715', name:'Om Mahir',       status:'Flagged', confidence:0.58, time:'09:27 AM', type:'Manual' },
          ],
          activity: [
            { name:'Aarav Mehta',  action:'marked Present',                 course:'Machine Learning', time:'2 min ago',  status:'present' },
            { name:'Chirag Patel', action:'marked Absent (no detection)',    course:'Machine Learning', time:'4 min ago',  status:'absent'  },
            { name:'Esha Trivedi', action:'flagged for manual review (63%)', course:'Machine Learning', time:'6 min ago',  status:'flagged' },
            { name:'Diya Joshi',   action:'marked Present',                 course:'Machine Learning', time:'8 min ago',  status:'present' },
            { name:'Om Mahir',     action:'flagged for manual review (58%)', course:'Machine Learning', time:'10 min ago', status:'flagged' },
          ],
        },
      },
    },
    'B.Tech AIML': {
      'Semester 7': {
        'Section A': {
          stats: { total:30, present:24, absent:5, flagged:1, rate:80.0 },
          trend: { labels:WEEKS, datasets:[{ label:'Attendance %', data:[80,78,75,72,70,68,71,73] }] },
          students: [
            { id:'22AIML701', name:'Priya Krishnan',  status:'Present', confidence:0.92, time:'09:03 AM', type:'Auto'   },
            { id:'22AIML702', name:'Rahul Iyer',      status:'Present', confidence:0.87, time:'09:05 AM', type:'Auto'   },
            { id:'22AIML703', name:'Sneha Pillai',    status:'Absent',  confidence:null,  time:'—',        type:null     },
            { id:'22AIML704', name:'Tejas Nambiar',   status:'Present', confidence:0.94, time:'09:08 AM', type:'Auto'   },
            { id:'22AIML705', name:'Uma Rao',         status:'Present', confidence:0.76, time:'09:10 AM', type:'Auto'   },
            { id:'22AIML706', name:'Vivek Raman',     status:'Absent',  confidence:null,  time:'—',        type:null     },
            { id:'22AIML707', name:'Ananya Bose',     status:'Present', confidence:0.89, time:'09:12 AM', type:'Auto'   },
            { id:'22AIML708', name:'Bikram Sen',      status:'Absent',  confidence:null,  time:'—',        type:null     },
            { id:'22AIML709', name:'Charu Das',       status:'Present', confidence:0.91, time:'09:14 AM', type:'Auto'   },
            { id:'22AIML710', name:'Deepak Roy',      status:'Flagged', confidence:0.61, time:'09:16 AM', type:'Manual' },
            { id:'22AIML711', name:'Farheen Begum',   status:'Present', confidence:0.85, time:'09:19 AM', type:'Auto'   },
            { id:'22AIML712', name:'Gaurav Ghosh',    status:'Absent',  confidence:null,  time:'—',        type:null     },
          ],
          activity: [
            { name:'Priya Krishnan', action:'marked Present',                 course:'Machine Learning', time:'3 min ago',  status:'present' },
            { name:'Sneha Pillai',   action:'marked Absent (no detection)',    course:'Machine Learning', time:'5 min ago',  status:'absent'  },
            { name:'Deepak Roy',     action:'flagged for manual review (61%)', course:'Machine Learning', time:'9 min ago',  status:'flagged' },
            { name:'Vivek Raman',    action:'marked Absent (no detection)',    course:'Machine Learning', time:'12 min ago', status:'absent'  },
          ],
        },
      },
    },
  },

  'Cloud Computing': {
    'B.Tech CSE': {
      'Semester 5': {
        'Section A': {
          stats: { total:35, present:26, absent:9, flagged:0, rate:74.3 },
          trend: { labels:WEEKS, datasets:[{ label:'Attendance %', data:[75,72,70,68,65,63,67,69] }] },
          students: [
            { id:'24BCS501', name:'Aman Singh',       status:'Present', confidence:0.90, time:'11:02 AM', type:'Auto' },
            { id:'24BCS502', name:'Bhanu Pratap',     status:'Absent',  confidence:null,  time:'—',        type:null   },
            { id:'24BCS503', name:'Chetan Sharma',    status:'Present', confidence:0.83, time:'11:04 AM', type:'Auto' },
            { id:'24BCS504', name:'Divya Yadav',      status:'Absent',  confidence:null,  time:'—',        type:null   },
            { id:'24BCS505', name:'Ekta Mishra',      status:'Present', confidence:0.88, time:'11:07 AM', type:'Auto' },
            { id:'24BCS506', name:'Firoz Khan',       status:'Absent',  confidence:null,  time:'—',        type:null   },
            { id:'24BCS507', name:'Gita Verma',       status:'Present', confidence:0.79, time:'11:09 AM', type:'Auto' },
            { id:'24BCS508', name:'Hemant Tiwari',    status:'Present', confidence:0.92, time:'11:11 AM', type:'Auto' },
            { id:'24BCS509', name:'Ishita Gupta',     status:'Absent',  confidence:null,  time:'—',        type:null   },
            { id:'24BCS510', name:'Jatin Bansal',     status:'Present', confidence:0.85, time:'11:13 AM', type:'Auto' },
            { id:'24BCS511', name:'Kavya Reddy',      status:'Absent',  confidence:null,  time:'—',        type:null   },
            { id:'24BCS512', name:'Laxmi Narayanan',  status:'Present', confidence:0.87, time:'11:16 AM', type:'Auto' },
          ],
          activity: [
            { name:'Aman Singh',    action:'marked Present',              course:'Cloud Computing', time:'2 min ago',  status:'present' },
            { name:'Bhanu Pratap',  action:'marked Absent (no detection)', course:'Cloud Computing', time:'5 min ago',  status:'absent'  },
            { name:'Divya Yadav',   action:'marked Absent (no detection)', course:'Cloud Computing', time:'8 min ago',  status:'absent'  },
            { name:'Chetan Sharma', action:'marked Present',              course:'Cloud Computing', time:'11 min ago', status:'present' },
          ],
        },
        'Section B': {
          stats: { total:33, present:27, absent:6, flagged:0, rate:81.8 },
          trend: { labels:WEEKS, datasets:[{ label:'Attendance %', data:[82,80,79,77,78,80,81,82] }] },
          students: [
            { id:'24BCS551', name:'Meera Pillai',     status:'Present', confidence:0.93, time:'11:01 AM', type:'Auto' },
            { id:'24BCS552', name:'Naveen Kumar',     status:'Present', confidence:0.86, time:'11:03 AM', type:'Auto' },
            { id:'24BCS553', name:'Ojasvi Singh',     status:'Absent',  confidence:null,  time:'—',        type:null   },
            { id:'24BCS554', name:'Pankaj Rao',       status:'Present', confidence:0.91, time:'11:05 AM', type:'Auto' },
            { id:'24BCS555', name:'Ritu Sharma',      status:'Present', confidence:0.78, time:'11:08 AM', type:'Auto' },
            { id:'24BCS556', name:'Sanjay Verma',     status:'Absent',  confidence:null,  time:'—',        type:null   },
            { id:'24BCS557', name:'Tanvi Mehta',      status:'Present', confidence:0.95, time:'11:10 AM', type:'Auto' },
            { id:'24BCS558', name:'Uday Patel',       status:'Present', confidence:0.82, time:'11:12 AM', type:'Auto' },
          ],
          activity: [
            { name:'Meera Pillai',  action:'marked Present',              course:'Cloud Computing', time:'1 min ago',  status:'present' },
            { name:'Ojasvi Singh',  action:'marked Absent (no detection)', course:'Cloud Computing', time:'6 min ago',  status:'absent'  },
            { name:'Sanjay Verma',  action:'marked Absent (no detection)', course:'Cloud Computing', time:'9 min ago',  status:'absent'  },
          ],
        },
      },
    },
  },

  'Cybersecurity': {
    'B.Tech Cybersecurity': {
      'Semester 3': {
        'Section B': {
          stats: { total:28, present:24, absent:4, flagged:0, rate:85.7 },
          trend: { labels:WEEKS, datasets:[{ label:'Attendance %', data:[92,90,88,85,87,84,86,86] }] },
          students: [
            { id:'24BCYB301', name:'Manish Patil',    status:'Present', confidence:0.96, time:'02:02 PM', type:'Auto' },
            { id:'24BCYB302', name:'Nisha Kulkarni',  status:'Present', confidence:0.89, time:'02:04 PM', type:'Auto' },
            { id:'24BCYB303', name:'Om Prakash',      status:'Absent',  confidence:null,  time:'—',        type:null   },
            { id:'24BCYB304', name:'Pooja Deshmukh',  status:'Present', confidence:0.93, time:'02:06 PM', type:'Auto' },
            { id:'24BCYB305', name:'Rohit Kumbhar',   status:'Present', confidence:0.87, time:'02:08 PM', type:'Auto' },
            { id:'24BCYB306', name:'Sunita Jadhav',   status:'Absent',  confidence:null,  time:'—',        type:null   },
            { id:'24BCYB307', name:'Tushar Mane',     status:'Present', confidence:0.91, time:'02:10 PM', type:'Auto' },
            { id:'24BCYB308', name:'Vidya Shinde',    status:'Present', confidence:0.84, time:'02:12 PM', type:'Auto' },
            { id:'24BCYB309', name:'Waseem Ansari',   status:'Absent',  confidence:null,  time:'—',        type:null   },
            { id:'24BCYB310', name:'Yash Pawar',      status:'Present', confidence:0.97, time:'02:14 PM', type:'Auto' },
            { id:'24BCYB311', name:'Zara Siddiqui',   status:'Present', confidence:0.88, time:'02:16 PM', type:'Auto' },
            { id:'24BCYB312', name:'Akash Bhosale',   status:'Absent',  confidence:null,  time:'—',        type:null   },
          ],
          activity: [
            { name:'Manish Patil',   action:'marked Present',              course:'Cybersecurity', time:'2 min ago', status:'present' },
            { name:'Om Prakash',     action:'marked Absent (no detection)', course:'Cybersecurity', time:'4 min ago', status:'absent'  },
            { name:'Sunita Jadhav',  action:'marked Absent (no detection)', course:'Cybersecurity', time:'7 min ago', status:'absent'  },
            { name:'Nisha Kulkarni', action:'marked Present',              course:'Cybersecurity', time:'9 min ago', status:'present' },
          ],
        },
      },
    },
  },

  'Computer Networks': {
    'B.Tech CSE': {
      'Semester 5': {
        'Section A': {
          stats: { total:36, present:30, absent:6, flagged:0, rate:83.3 },
          trend: { labels:WEEKS, datasets:[{ label:'Attendance %', data:[85,83,82,80,81,82,83,83] }] },
          students: [
            { id:'24BCS601', name:'Aditya Sharma',    status:'Present', confidence:0.91, time:'10:02 AM', type:'Auto' },
            { id:'24BCS602', name:'Bindu Rao',        status:'Present', confidence:0.85, time:'10:04 AM', type:'Auto' },
            { id:'24BCS603', name:'Chiranjeevi T.',   status:'Absent',  confidence:null,  time:'—',        type:null   },
            { id:'24BCS604', name:'Devika Menon',     status:'Present', confidence:0.93, time:'10:06 AM', type:'Auto' },
            { id:'24BCS605', name:'Elan Murugan',     status:'Present', confidence:0.80, time:'10:08 AM', type:'Auto' },
            { id:'24BCS606', name:'Fatima Sheikh',    status:'Absent',  confidence:null,  time:'—',        type:null   },
            { id:'24BCS607', name:'Girish Nair',      status:'Present', confidence:0.88, time:'10:10 AM', type:'Auto' },
            { id:'24BCS608', name:'Hema Iyer',        status:'Present', confidence:0.94, time:'10:12 AM', type:'Auto' },
          ],
          activity: [
            { name:'Aditya Sharma',  action:'marked Present',              course:'Computer Networks', time:'2 min ago', status:'present' },
            { name:'Chiranjeevi T.', action:'marked Absent (no detection)', course:'Computer Networks', time:'5 min ago', status:'absent'  },
            { name:'Fatima Sheikh',  action:'marked Absent (no detection)', course:'Computer Networks', time:'8 min ago', status:'absent'  },
          ],
        },
      },
    },
    'B.Tech AIML': {
      'Semester 5': {
        'Section B': {
          stats: { total:32, present:27, absent:5, flagged:0, rate:84.4 },
          trend: { labels:WEEKS, datasets:[{ label:'Attendance %', data:[86,84,83,81,82,83,84,84] }] },
          students: [
            { id:'24AIML601', name:'Ishaan Kapoor',   status:'Present', confidence:0.89, time:'10:03 AM', type:'Auto' },
            { id:'24AIML602', name:'Juhi Srivastava', status:'Absent',  confidence:null,  time:'—',        type:null   },
            { id:'24AIML603', name:'Karan Malhotra',  status:'Present', confidence:0.92, time:'10:06 AM', type:'Auto' },
            { id:'24AIML604', name:'Lavanya Reddy',   status:'Present', confidence:0.86, time:'10:08 AM', type:'Auto' },
            { id:'24AIML605', name:'Mohan Das',       status:'Absent',  confidence:null,  time:'—',        type:null   },
            { id:'24AIML606', name:'Nandini Pillai',  status:'Present', confidence:0.91, time:'10:10 AM', type:'Auto' },
          ],
          activity: [
            { name:'Ishaan Kapoor',   action:'marked Present',              course:'Computer Networks', time:'3 min ago', status:'present' },
            { name:'Juhi Srivastava', action:'marked Absent (no detection)', course:'Computer Networks', time:'6 min ago', status:'absent'  },
          ],
        },
      },
    },
  },
};

/* ── Faculty profile (unchanged) ── */
const MOCK_FACULTY = {
  faculty_id: 'F001',
  name: 'Dr. Priya Sharma',
  department: 'Computer Science & Engineering',
  email: 'p.sharma@karnavati.edu',
  initials: 'PS',
};

/* ================================================================
   DROPDOWN HELPER FUNCTIONS (synchronous — no fetch needed)
   ================================================================ */

/** Returns all subject names the faculty teaches */
export function getAvailableSubjects() {
  return Object.keys(MOCK_CLASSES);
}

/** Returns programs that offer the given subject */
export function getPrograms(subject) {
  return subject && MOCK_CLASSES[subject]
    ? Object.keys(MOCK_CLASSES[subject])
    : [];
}

/** Returns semesters 1 through 10 for a subject + program combo */
export function getSemesters(subject, program) {
  if (!subject || !program) return [];
  return [
    'Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5',
    'Semester 6', 'Semester 7', 'Semester 8', 'Semester 9', 'Semester 10'
  ];
}

/** Returns sections A through E for a subject + program + semester combo */
export function getSections(subject, program, semester) {
  if (!subject || !program || !semester) return [];
  return ['Section A', 'Section B', 'Section C', 'Section D', 'Section E'];
}

/** Internal helper to get pre-populated or generated mock class data */
function _getOrCreateClassData(subject, program, semester, section) {
  const existing = MOCK_CLASSES[subject]?.[program]?.[semester]?.[section];
  if (existing) return existing;

  // Generate fallback data for any Semester (1-10) and Section (A-E)
  const total = 35;
  const present = 29;
  const absent = 5;
  const flagged = 1;
  const rate = 82.9;

  return {
    stats: { total, present, absent, flagged, rate },
    trend: { labels: WEEKS, datasets: [{ label: 'Attendance %', data: [85, 84, 82, 80, 81, 83, 82, 83] }] },
    students: [
      { id: '24STU101', name: 'Aarav Sharma',   status: 'Present', confidence: 0.94, time: '09:02 AM', type: 'Auto' },
      { id: '24STU102', name: 'Bhavna Patel',   status: 'Present', confidence: 0.91, time: '09:04 AM', type: 'Auto' },
      { id: '24STU103', name: 'Chetan Verma',   status: 'Absent',  confidence: null, time: '—',        type: null },
      { id: '24STU104', name: 'Devi Nair',      status: 'Present', confidence: 0.88, time: '09:07 AM', type: 'Auto' },
      { id: '24STU105', name: 'Esha Gupta',     status: 'Flagged', confidence: 0.62, time: '09:09 AM', type: 'Manual' },
      { id: '24STU106', name: 'Farhan Ali',     status: 'Present', confidence: 0.95, time: '09:11 AM', type: 'Auto' },
      { id: '24STU107', name: 'Gauri Joshi',    status: 'Present', confidence: 0.86, time: '09:14 AM', type: 'Auto' },
      { id: '24STU108', name: 'Harsh Vardhan',  status: 'Absent',  confidence: null, time: '—',        type: null },
      { id: '24STU109', name: 'Isha Reddy',     status: 'Present', confidence: 0.92, time: '09:18 AM', type: 'Auto' },
      { id: '24STU110', name: 'Jayant Sen',     status: 'Present', confidence: 0.89, time: '09:21 AM', type: 'Auto' }
    ],
    activity: [
      { name: 'Aarav Sharma', action: 'marked Present', course: subject || 'Class', time: '5 min ago', status: 'present' },
      { name: 'Chetan Verma', action: 'marked Absent (no detection)', course: subject || 'Class', time: '10 min ago', status: 'absent' },
      { name: 'Esha Gupta',   action: 'flagged for review (62%)', course: subject || 'Class', time: '15 min ago', status: 'flagged' }
    ]
  };
}

/* ================================================================
   ASYNC DATA FUNCTIONS
   Signature stays identical when swapping mock → fetch()
   ================================================================ */

/**
 * getFacultyProfile()
 * LIVE → GET /api/faculty/:id/profile
 */
export async function getFacultyProfile() {
  await _delay(200);
  return MOCK_FACULTY;
}

/**
 * getClassAttendanceData(subject, program, semester, section)
 * Returns { stats, students } for the selected class.
 */
export async function getClassAttendanceData(subject, program, semester, section) {
  await _delay(300);
  const data = _getOrCreateClassData(subject, program, semester, section);
  return { stats: data.stats, students: data.students };
}

/**
 * getAttendanceTrend(subject, program, semester, section)
 */
export async function getAttendanceTrend(subject, program, semester, section) {
  await _delay(200);
  const data = _getOrCreateClassData(subject, program, semester, section);
  return data.trend;
}

/**
 * getRecentActivity(subject, program, semester, section)
 */
export async function getRecentActivity(subject, program, semester, section) {
  await _delay(200);
  const data = _getOrCreateClassData(subject, program, semester, section);
  return data.activity;
}


/* ================================================================
   STUDENT PORTAL FUNCTIONS (unchanged)
   ================================================================ */

/* ── Basic student record (keeps existing exports working) ── */
const MOCK_STUDENT = {
  student_id: 'S045', name: 'Nidhi Tak', enrollment_no: '22BCS045',
  email: 'nidhi.tak@karnavati.edu', program: 'B.Tech Computer Science & Engineering',
  semester: 6, section: 'C', initials: 'NT',
};

/* ── Full student profile (ERP-style fields) ── */
const MOCK_STUDENT_PROFILE_FULL = {
  // Header
  name:              'Nidhi Tak',
  enrollment_no:     '22BCS045',
  student_id:        'S045',
  program:           'B.Tech Computer Science & Engineering',
  branch:            'CSE',
  semester:          6,
  section:           'C',
  initials:          'NT',
  // Left column
  institute_code:    'KU-UIT-001',
  name_10th:         'NIDHI TAK',
  dob:               '15/08/2004',
  mobile:            '+91 98765 43210',
  email:             'nidhi.tak@karnavati.edu',
  category:          'General',
  religion:          'Hindu',
  batch:             '2022–2026',
  // Right column
  application_no:    'KU2022BCS0451',
  academic_year:     '2025–2026',
  admitted_year:     '2022',
  gender:            'Female',
  doj:               '01/08/2022',
  blood_group:       'B+',
  nationality:       'Indian',
  marital_status:    'Single',
  aadhar:            'XXXX XXXX 1234', // masked — never expose full number in frontend
};

/* ── Subjects (5 subjects, pct derived from attended/total) ── */
const _RAW_SUBJECTS = [
  { code:'CS601', name:'Machine Learning',            faculty:'Dr. Priya Sharma',    total:42, attended:37 },
  { code:'CS602', name:'Cloud Computing',             faculty:'Prof. Amit Verma',    total:40, attended:32 },
  { code:'CS603', name:'Cybersecurity',               faculty:'Dr. Renu Patel',      total:38, attended:27 },
  { code:'CS604', name:'Database Management Systems', faculty:'Prof. Suresh Iyer',   total:36, attended:30 },
  { code:'CS605', name:'Software Engineering',        faculty:'Dr. Meena Joshi',     total:34, attended:24 },
];
const MOCK_STUDENT_SUBJECTS = _RAW_SUBJECTS.map(s => ({
  ...s,
  absent: s.total - s.attended,
  pct: parseFloat(((s.attended / s.total) * 100).toFixed(1)),
  program: 'B.Tech CSE',
  semester: 6,
  status: ((s.attended / s.total) * 100) >= 75 ? 'Satisfactory' : 'Needs Attention',
}));

const MOCK_STUDENT_SUMMARY = {
  overall_pct: 78.4, total_classes: 120, present: 94, absent: 26, flagged: 0,
};

const MOCK_SUBJECTS = [
  { course_id:'C101', code:'CS601', name:'Machine Learning',            total:30, present:26, absent:4, pct:86.7 },
  { course_id:'C102', code:'CS602', name:'Cloud Computing',             total:28, present:19, absent:9, pct:67.9 },
  { course_id:'C103', code:'CS603', name:'Computer Networks',           total:32, present:25, absent:7, pct:78.1 },
  { course_id:'C104', code:'CS604', name:'Database Management Systems', total:30, present:24, absent:6, pct:80.0 },
];

const MOCK_ATTENDANCE_HISTORY = [
  { date:'2026-08-20', subject:'Machine Learning',            code:'CS601', status:'Present', time:'09:02 AM', verification:'Face Verified'  },
  { date:'2026-08-20', subject:'Cloud Computing',             code:'CS602', status:'Absent',  time:'—',        verification:'Not Recorded'   },
  { date:'2026-08-20', subject:'Cybersecurity',               code:'CS603', status:'Present', time:'02:04 PM', verification:'Face Verified'  },
  { date:'2026-08-19', subject:'Machine Learning',            code:'CS601', status:'Present', time:'09:05 AM', verification:'Face Verified'  },
  { date:'2026-08-19', subject:'Database Management Systems', code:'CS604', status:'Present', time:'11:02 AM', verification:'Face Verified'  },
  { date:'2026-08-19', subject:'Software Engineering',        code:'CS605', status:'Absent',  time:'—',        verification:'Not Recorded'   },
  { date:'2026-08-18', subject:'Machine Learning',            code:'CS601', status:'Present', time:'09:04 AM', verification:'Face Verified'  },
  { date:'2026-08-18', subject:'Cloud Computing',             code:'CS602', status:'Present', time:'11:08 AM', verification:'Face Verified'  },
  { date:'2026-08-18', subject:'Cybersecurity',               code:'CS603', status:'Absent',  time:'—',        verification:'Not Recorded'   },
  { date:'2026-08-17', subject:'Software Engineering',        code:'CS605', status:'Present', time:'02:10 PM', verification:'Face Verified'  },
  { date:'2026-08-17', subject:'Database Management Systems', code:'CS604', status:'Present', time:'11:05 AM', verification:'Face Verified'  },
  { date:'2026-08-16', subject:'Machine Learning',            code:'CS601', status:'Present', time:'09:01 AM', verification:'Face Verified'  },
  { date:'2026-08-16', subject:'Cloud Computing',             code:'CS602', status:'Absent',  time:'—',        verification:'Not Recorded'   },
  { date:'2026-08-15', subject:'Cybersecurity',               code:'CS603', status:'Present', time:'02:02 PM', verification:'Manual Override'},
  { date:'2026-08-15', subject:'Software Engineering',        code:'CS605', status:'Present', time:'02:07 PM', verification:'Face Verified'  },
  { date:'2026-08-14', subject:'Machine Learning',            code:'CS601', status:'Absent',  time:'—',        verification:'Not Recorded'   },
  { date:'2026-08-14', subject:'Database Management Systems', code:'CS604', status:'Present', time:'11:03 AM', verification:'Face Verified'  },
  { date:'2026-08-13', subject:'Cloud Computing',             code:'CS602', status:'Present', time:'11:01 AM', verification:'Face Verified'  },
  { date:'2026-08-13', subject:'Cybersecurity',               code:'CS603', status:'Present', time:'02:06 PM', verification:'Face Verified'  },
  { date:'2026-08-12', subject:'Software Engineering',        code:'CS605', status:'Absent',  time:'—',        verification:'Not Recorded'   },
  { date:'2026-08-12', subject:'Machine Learning',            code:'CS601', status:'Present', time:'09:03 AM', verification:'Face Verified'  },
  { date:'2026-08-11', subject:'Database Management Systems', code:'CS604', status:'Absent',  time:'—',        verification:'Not Recorded'   },
  { date:'2026-08-11', subject:'Cloud Computing',             code:'CS602', status:'Present', time:'11:06 AM', verification:'Face Verified'  },
  { date:'2026-08-10', subject:'Machine Learning',            code:'CS601', status:'Present', time:'09:07 AM', verification:'Face Verified'  },
  { date:'2026-08-10', subject:'Cybersecurity',               code:'CS603', status:'Present', time:'02:01 PM', verification:'Face Verified'  },
];

const MOCK_STUDENT_TREND = {
  labels: ['Wk 1','Wk 2','Wk 3','Wk 4','Wk 5','Wk 6','Wk 7','Wk 8'],
  data:   [90, 85, 80, 75, 78, 73, 76, 78],
};

/* ── Existing exports (unchanged signatures) ── */
export async function getStudentProfile()           { await _delay(); return MOCK_STUDENT; }
export async function getStudentAttendanceSummary() { await _delay(); return MOCK_STUDENT_SUMMARY; }
export async function getSubjectWiseAttendance()    { await _delay(300); return MOCK_SUBJECTS; }
export async function getAttendanceHistory(limit=20){ await _delay(400); return MOCK_ATTENDANCE_HISTORY.slice(0, limit); }
export async function getStudentTrend()             { await _delay(300); return MOCK_STUDENT_TREND; }

/* ── New exports for additional views ── */
/**
 * getStudentProfileFull()
 * LIVE → GET /api/student/:id/profile
 */
export async function getStudentProfileFull()       { await _delay(300); return MOCK_STUDENT_PROFILE_FULL; }

/**
 * getStudentSubjects()
 * LIVE → GET /api/student/:id/subjects
 */
export async function getStudentSubjects()          { await _delay(400); return MOCK_STUDENT_SUBJECTS; }

/**
 * getFullAttendanceHistory(filters)
 * @param {object} filters - { subject, status, from, to }
 * LIVE → GET /api/student/:id/attendance/history?subject=...&status=...&from=...&to=...
 */
export async function getFullAttendanceHistory(filters = {}) {
  await _delay(400);
  let records = [...MOCK_ATTENDANCE_HISTORY];
  if (filters.subject) records = records.filter(r => r.subject === filters.subject);
  if (filters.status)  records = records.filter(r => r.status  === filters.status);
  if (filters.from)    records = records.filter(r => r.date >= filters.from);
  if (filters.to)      records = records.filter(r => r.date <= filters.to);
  return records;
}

/* ── Private delay helper ── */
function _delay(ms = 500) { return new Promise(r => setTimeout(r, ms)); }
