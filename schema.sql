-- ============================================================================
-- GrowthNest Tech Solutions - Student Task Management System
-- Comprehensive Curriculum: Basic to Advanced (HTML -> CSS -> JavaScript)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'student')),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  joining_date TEXT NOT NULL,
  course_track TEXT NOT NULL DEFAULT 'Frontend Web Development (HTML/CSS/JS)',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sequence_order INTEGER UNIQUE NOT NULL,
  module TEXT NOT NULL, -- 'HTML', 'CSS', 'JavaScript'
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL, -- 'Basic', 'Intermediate', 'Advanced'
  estimated_days INTEGER NOT NULL DEFAULT 1,
  description TEXT NOT NULL,
  instructions TEXT NOT NULL,
  requirements_json TEXT NOT NULL DEFAULT '[]',
  starter_code_html TEXT DEFAULT '',
  starter_code_css TEXT DEFAULT '',
  starter_code_js TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_task_id INTEGER NOT NULL REFERENCES tasks(id),
  status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK(status IN ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'REVISION_REQUESTED', 'APPROVED')),
  unlocked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  UNIQUE(student_id, current_task_id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  submission_number INTEGER NOT NULL DEFAULT 1,
  code_html TEXT,
  code_css TEXT,
  code_js TEXT,
  sample_code_text TEXT,
  output_url TEXT,
  output_screenshot_key TEXT,
  live_demo_url TEXT,
  student_notes TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'CHANGES_REQUESTED')),
  admin_feedback TEXT,
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TEXT,
  submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INITIAL USERS SEED
-- ============================================================================
INSERT OR IGNORE INTO users (id, username, password_hash, role, full_name, email, phone, joining_date)
VALUES
(1, 'admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin', 'Lead Trainer / Admin', 'admin@growthnesttech.com', '+91 9876543210', '2026-01-01'),
(2, 'karthik', '703b0a3d6ad75b649a28adde7d83c6251da457549263bc7ff45ec709b0a8448b', 'student', 'Karthik Raja', 'karthik@growthnest.com', '+91 9876500001', '2026-10-12'),
(3, 'ananya', '703b0a3d6ad75b649a28adde7d83c6251da457549263bc7ff45ec709b0a8448b', 'student', 'Ananya S', 'ananya@growthnest.com', '+91 9876500002', '2026-10-24'),
(4, 'Berlin2005', 'dad114b6ed7342bac65c79575f6c7ff761ec26b52c1f5f7a9110532973d05df2', 'student', 'Berlin', 'berlin@growthnest.com', '+91 9876500003', '2026-10-27');

-- ============================================================================
-- 23 EXPANDED SEQUENTIAL TASKS: BASIC TO ADVANCED
-- Module 1: HTML (Tasks 1-7: Basic to Intermediate)
-- Module 2: CSS (Tasks 8-15: Basic to Advanced)
-- Module 3: JavaScript (Tasks 16-23: Basic to Advanced)
-- ============================================================================
INSERT OR IGNORE INTO tasks (id, sequence_order, module, title, difficulty, estimated_days, description, instructions, requirements_json)
VALUES
-- HTML MODULE (Basic to Intermediate)
(1, 1, 'HTML', 'Task 1: Basic HTML Document Structure & Text Tags', 'Basic', 1,
 'Create a valid HTML5 document containing basic head, body, headings (h1-h6), paragraphs, line breaks, and horizontal rules.',
 'Write a clean HTML document from scratch. Set the correct doctype, html language, title in head. In the body, write a heading for your name, paragraphs about yourself, and bold/italic text formatting.',
 '["Valid <!DOCTYPE html> and html/head/body tags", "Use at least 3 levels of headings (h1, h2, h3)", "Include paragraphs with <strong> and <em> tags", "Use <br> and <hr> divider properly"]'),

(2, 2, 'HTML', 'Task 2: Lists & Navigation Hyperlinks', 'Basic', 1,
 'Build an informative webpage using ordered, unordered, and definition lists along with internal and external hyperlinks.',
 'Create an educational page with: 1) An unordered list (ul) of frontend skills, 2) An ordered list (ol) of daily study steps, 3) Hyperlinks that open in new tabs (target="_blank"), and 4) An internal bookmark link jumping down to a section.',
 '["Unordered list (ul) with at least 4 items", "Ordered list (ol) with at least 3 steps", "External links with target=\"_blank\" and rel=\"noopener\"", "Working internal anchor link (#section-id)"]'),

(3, 3, 'HTML', 'Task 3: Media Embeds (Images, Audio, Video & Figure)', 'Basic', 1,
 'Embed responsive images with alt text, an audio player, a video player, and semantic figures.',
 'Construct a media gallery page. Add an image with proper alt and title attributes, a working HTML5 <audio> tag with controls, a <video> tag with controls and poster, and a <figure> with <figcaption>.',
 '["Working image with descriptive alt text", "<audio controls> with audio source", "<video controls> with video source", "<figure> and <figcaption> wrapping an illustration"]'),

(4, 4, 'HTML', 'Task 4: Interactive Forms & Input Validation', 'Intermediate', 2,
 'Develop a complete student registration form using HTML5 input types, labels, and built-in validation attributes.',
 'Build a form including text, email, tel, password, date, radio buttons for gender, checkboxes for interests, a select dropdown, and a textarea. Utilize required, placeholder, pattern, min/max attributes.',
 '["Form with action and method attributes", "Input types: text, email, tel, password, date", "Grouped radio buttons and checkboxes", "Dropdown select with at least 4 options", "All inputs linked with <label for=\"id\">", "Submit and Reset buttons"]'),

(5, 5, 'HTML', 'Task 5: Structured Data Tables & Schedules', 'Intermediate', 1,
 'Create a complex weekly class timetable using semantic HTML table tags with colspan and rowspan.',
 'Design a clean schedule table using <table>, <caption>, <thead>, <tbody>, <tfoot>, <tr>, <th>, and <td>. Merge cells using colspan (e.g. Lunch Break) and rowspan for multi-period subjects.',
 '["Table with caption and semantic thead/tbody/tfoot", "Headers (th) with scope attribute", "At least one cell with colspan", "At least one cell with rowspan", "Accessible table borders"]'),

(6, 6, 'HTML', 'Task 6: HTML5 Semantic Layout (Header, Nav, Section, Aside, Footer)', 'Intermediate', 2,
 'Structure a complete personal portfolio website purely using modern semantic elements without unneeded divs.',
 'Organize a multi-section page: <header> with <nav>, <main> containing an <article> and multiple <section> elements, a sidebar <aside> for quick facts, and a <footer> with copyright.',
 '["Semantic tags: header, nav, main, section, article, aside, footer", "No unnecessary generic divs for layout", "Proper heading hierarchy without skipping levels", "Valid W3C standard HTML structure"]'),

(7, 7, 'HTML', 'Task 7: Capstone HTML Project - Technical Documentation Page', 'Intermediate', 2,
 'Build a multi-topic technical documentation guide on Web Basics with sidebar navigation links.',
 'Create an extensive documentation page explaining HTML, Web Browsers, and HTTP. Include code snippets inside <code> and <pre> tags, blockquotes for tips, and an accessible FAQ section using <details> and <summary>.',
 '["Use <pre> and <code> for code snippets", "Include <details> and <summary> for FAQ toggles", "Use <blockquote> for mentor advice", "Sidebar nav with anchor jump links to all sections"]'),

-- CSS MODULE (Basic to Advanced)
(8, 8, 'CSS', 'Task 8: CSS Basics, Selectors, Typography & Google Fonts', 'Basic', 1,
 'Style an HTML document using external CSS, element/class/id selectors, Google Fonts, and color systems.',
 'Import a Google Font (e.g. Poppins or Inter). Style headings and body with font-size, line-height, letter-spacing, and text-align. Use HEX, RGB, and HSL color values.',
 '["Import Google Font via @import", "Target elements using element, class (.card), and id (#main) selectors", "Proper line-height and letter-spacing for typography", "Use of CSS custom properties (variables) for theme colors"]'),

(9, 9, 'CSS', 'Task 9: The CSS Box Model, Borders & Margins', 'Basic', 1,
 'Demonstrate mastery of the CSS Box Model: content, padding, borders, margins, and box-sizing.',
 'Create card components with box-sizing: border-box. Apply directional padding and margins, custom border-radius, outline, and auto-margins for horizontal centering.',
 '["Apply * { box-sizing: border-box; } reset", "Differentiate padding vs margin visibly", "Custom border-radius and stylized borders", "Margin auto for perfect horizontal centering"]'),

(10, 10, 'CSS', 'Task 10: CSS Backgrounds, Gradients & Box Shadows', 'Intermediate', 1,
 'Design modern frosted/glassmorphism cards using multi-layer linear gradients, background-clip, and smooth shadows.',
 'Create a 3-tier card layout with linear-gradient backgrounds, subtle box-shadows (elevation levels), border highlights, and text-shadow on headings.',
 '["CSS linear-gradient and radial-gradient", "Realistic multi-layer box-shadow", "Hover state transition on box-shadow and elevation", "Smooth rounded corners and card layout"]'),

(11, 11, 'CSS', 'Task 11: CSS Flexbox - Responsive Navigation & Card Layouts', 'Intermediate', 2,
 'Build a responsive header navbar and a flexible product card list using CSS Flexbox.',
 'Use display: flex, justify-content, align-items, flex-direction, and flex-wrap. The navbar must align the logo left and links right. The cards must wrap automatically and stretch to equal height.',
 '["Navbar built with display: flex and space-between", "Card container using flex-wrap: wrap and gap", "Equal height cards using align-items: stretch", "Flex basis and flex-grow applied cleanly"]'),

(12, 12, 'CSS', 'Task 12: CSS Grid - Dashboard & Media Gallery', 'Intermediate', 2,
 'Construct a multi-column dashboard layout and photo gallery using CSS display: grid.',
 'Design a dashboard layout with grid-template-columns, grid-template-rows, and grid-template-areas (header, sidebar, content, footer). Build a photo gallery with repeat(auto-fit, minmax(220px, 1fr)).',
 '["Grid container with repeat() and minmax()", "Use of grid-template-areas or column/row spans", "Uniform gap between grid cells", "Responsive auto-flowing grid without media queries"]'),

(13, 13, 'CSS', 'Task 13: Responsive Design & CSS Media Queries', 'Intermediate', 2,
 'Adapt a desktop website for tablets (768px) and mobile phones (480px) using @media queries.',
 'Implement a mobile-first or desktop-down responsive layout. Collapse navigation menus on mobile screens, adjust font sizes, convert multi-column grids to 1 column, and ensure no horizontal scrollbar.',
 '["Media queries for tablet (<=768px) and mobile (<=480px)", "No horizontal overflow/scrolling on mobile devices", "Touch-friendly clickable button targets (min 44px)", "Fluid typography and responsive images (max-width: 100%)"]'),

(14, 14, 'CSS', 'Task 14: CSS Transitions, Transforms & Keyframe Animations', 'Advanced', 2,
 'Create interactive micro-animations: button hover ripples, card flip effects, and a loading spinner.',
 'Use CSS transition, transform (translate, rotate, scale), and @keyframes. Build a continuously rotating loader spinner and a card that smoothly scales up on hover.',
 '["CSS transition with custom cubic-bezier or ease-in-out", "Transform: scale(), rotate(), and translateY()", "@keyframes rule for a custom loading animation", "Hover and active pseudo-class states"]'),

(15, 15, 'CSS', 'Task 15: Capstone CSS Project - Full Responsive SaaS Landing Page', 'Advanced', 3,
 'Build a pixel-perfect, fully responsive software product landing page with hero, features, pricing, and footer.',
 'Combine Flexbox, Grid, custom properties, responsive media queries, and animations to craft a professional institute/startup homepage.',
 '["Cohesive color palette using CSS variables", "Hero section with CTA buttons and gradient background", "Features section using CSS Grid", "Pricing table with highlighted tier using Flexbox", "100% mobile-friendly and tested across screen sizes"]'),

-- JAVASCRIPT MODULE (Basic to Advanced)
(16, 16, 'JavaScript', 'Task 16: JS Basics - Variables, Data Types & Operators', 'Basic', 1,
 'Write a JavaScript program demonstrating let/const, template literals, arithmetic, and conditional statements.',
 'Create a script that prompts or calculates a student score, converts temperature (C to F), checks eligibility using if/else and switch, and logs formatted output using ES6 template literals.',
 '["Use of let and const (no var)", "ES6 template literals with embedded expressions", "Arithmetic, comparison, and logical operators", "Conditional if/else if/else and switch statement"]'),

(17, 17, 'JavaScript', 'Task 17: Loops, Arrays & Essential Array Methods', 'Basic', 1,
 'Process arrays of student records using for loops, while loops, and methods (forEach, map, filter, reduce).',
 'Create an array of objects representing students and their marks. Calculate the class average using reduce, find all passing students using filter, and format their names using map.',
 '["Array manipulation: push, pop, shift, unshift", "Use of for...of or forEach loop", "Transform array with .map()", "Filter records with .filter()", "Calculate total/average with .reduce()"]'),

(18, 18, 'JavaScript', 'Task 18: Functions, Arrow Functions & Scope', 'Basic', 1,
 'Implement functions, default parameters, arrow functions, and demonstrate block vs function scope.',
 'Write pure functions to validate input strings, calculate discounts, and format currency. Contrast global, function, and block scope with clear examples.',
 '["Standard function declaration vs arrow function syntax", "Default function parameters", "Higher-order function taking a callback", "Demonstration of closures or scope isolation"]'),

(19, 19, 'JavaScript', 'Task 19: DOM Selection & Dynamic Element Manipulation', 'Intermediate', 2,
 'Select HTML elements and dynamically create, update, append, and remove elements in the webpage.',
 'Build a dynamic student badge generator. The user types a name and course; clicking a button creates a styled card in the DOM with createElement, classList.add, and appendChild with a delete button.',
 '["document.querySelector and querySelectorAll", "document.createElement and appendChild", "Dynamic class manipulation with classList.add/remove/toggle", "Element removal with element.remove()"]'),

(20, 20, 'JavaScript', 'Task 20: Event Listeners & Real-Time Form Validation', 'Intermediate', 2,
 'Intercept form submit events and perform live input validation with custom error feedback.',
 'Create an interactive registration form. Validate email format with Regex, password strength (length + digits), and confirm password match on input events. Prevent submission if invalid.',
 '["event.preventDefault() to handle submission", "EventListeners for input, change, and submit", "Regex validation for valid email address", "Real-time error message rendering underneath invalid inputs"]'),

(21, 21, 'JavaScript', 'Task 21: LocalStorage & Interactive Todo / Task Manager', 'Intermediate', 2,
 'Construct a complete CRUD Task Tracker where data persists across browser reloads using localStorage.',
 'Users can: 1) Add new learning tasks with a priority, 2) Mark tasks as completed, 3) Delete tasks, 4) Filter by All / Pending / Completed. Synchronize all state changes with window.localStorage.',
 '["JSON.stringify and JSON.parse with localStorage", "Add, Read, Update, Delete (CRUD) operations", "Preserve tasks after refreshing the browser", "Clean interactive user interface"]'),

(22, 22, 'JavaScript', 'Task 22: Asynchronous JS, Promises & Fetch API', 'Advanced', 2,
 'Fetch live data from a public REST API using async/await, handle loading states and network errors.',
 'Query a public API (e.g. GitHub User API or JSONPlaceholder). Display a loading animation while the request is in flight, handle 404/500 errors gracefully with an alert, and render data cards.',
 '["fetch() API with async/await syntax", "try...catch block for robust error handling", "Loading spinner/state while fetching data", "Dynamic rendering of retrieved JSON payload"]'),

(23, 23, 'JavaScript', 'Task 23: Capstone Full Frontend Project - Interactive Weather / Search Dashboard', 'Advanced', 3,
 'Build a complete, standalone frontend application combining HTML, CSS, JavaScript DOM, LocalStorage, and live API data.',
 'Create a responsive web app (such as a City Weather App or GitHub Developer Finder) with search history saved in localStorage, instant search, responsive UI, and clean modular code.',
 '["Complete HTML5 semantic structure", "Fully responsive CSS Grid & Flexbox layout", "Modern modular ES6+ JavaScript", "LocalStorage search history and live API integration", "Ready for deployment on Cloudflare Pages / Workers"]');
