-- ============================================================================
-- PastQ — Ghana expansion seed
--
-- Adds more authentic Ghanaian institutions and fills the University and
-- Professional levels with real, browsable past papers and questions:
--   University:    UG, KNUST, UCC, UEW, GIMPA, Ashesi, UPSA
--   Professional:  ICAG, CIMG, Ghana School of Law, CIB Ghana
--
-- Idempotent: safe to re-run. Run after 0001-0004 in the Supabase SQL editor.
--
-- NOTE: Questions are representative of each programme's syllabus and intended
-- for demo/revision. Verify wording against official papers before formal use.
-- ============================================================================

-- ============================================================================
-- UNIVERSITY — new institutions
-- ============================================================================
insert into public.institutions (level_id, name, slug, abbreviation, description, "order")
select l.id, v.name, v.slug, v.abbreviation, v.description, v."order"
from public.levels l
join (values
  ('University of Education, Winneba',                 'uew',    'UEW',    'Ghana''s premier university for teacher education, based in Winneba.', 4),
  ('Ghana Institute of Management and Public Administration', 'gimpa', 'GIMPA', 'Leading public administration, business and law institution in Accra.', 5),
  ('Ashesi University',                                'ashesi', 'Ashesi', 'Private liberal arts and sciences university in Berekuso, Eastern Region.', 6),
  ('University of Professional Studies, Accra',        'upsa',   'UPSA',   'Public university specialising in business and professional studies.', 7)
) as v(name, slug, abbreviation, description, "order") on true
where l.slug = 'university'
on conflict (level_id, slug) do nothing;

-- ============================================================================
-- PROFESSIONAL — new institution
-- ============================================================================
insert into public.institutions (level_id, name, slug, abbreviation, description, "order")
select l.id, v.name, v.slug, v.abbreviation, v.description, v."order"
from public.levels l
join (values
  ('Chartered Institute of Bankers, Ghana', 'cib-ghana', 'CIB Ghana', 'Professional body for the banking industry in Ghana.', 4)
) as v(name, slug, abbreviation, description, "order") on true
where l.slug = 'professional'
on conflict (level_id, slug) do nothing;

-- ============================================================================
-- COURSES (one programme per institution that still lacks content)
-- ============================================================================
-- University programmes
insert into public.courses (institution_id, name, slug, description, "order")
select i.id, v.name, v.slug, v.description, 1
from public.institutions i
join public.levels l on l.id = i.level_id
join (values
  ('knust',  'BSc Mechanical Engineering', 'bsc-mechanical-engineering', 'Undergraduate mechanical engineering programme.'),
  ('ucc',    'BEd Mathematics',            'bed-mathematics',            'Bachelor of Education in Mathematics.'),
  ('uew',    'BEd Basic Education',        'bed-basic-education',        'Bachelor of Education for basic-school teachers.'),
  ('gimpa',  'BSc Business Administration','bsc-business-administration','Undergraduate business administration programme.'),
  ('ashesi', 'BSc Computer Engineering',   'bsc-computer-engineering',   'Undergraduate computer engineering programme.'),
  ('upsa',   'BSc Accounting',             'bsc-accounting',             'Undergraduate accounting programme.')
) as v(inst_slug, name, slug, description) on i.slug = v.inst_slug
where l.slug = 'university'
on conflict (institution_id, slug) do nothing;

-- Professional programmes
insert into public.courses (institution_id, name, slug, description, "order")
select i.id, v.name, v.slug, v.description, 1
from public.institutions i
join public.levels l on l.id = i.level_id
join (values
  ('cimg',      'Professional Diploma in Marketing', 'prof-diploma-marketing', 'CIMG professional marketing diploma.'),
  ('gsl',       'Professional Law Course',           'professional-law-course', 'Post-LLB professional law programme for the Ghana Bar.'),
  ('cib-ghana', 'Chartered Banker Programme',        'chartered-banker',        'Professional banking qualification.')
) as v(inst_slug, name, slug, description) on i.slug = v.inst_slug
where l.slug = 'professional'
on conflict (institution_id, slug) do nothing;

-- ============================================================================
-- SUBJECTS (one per new course; UG already has its subjects)
-- ============================================================================
insert into public.subjects (course_id, name, slug, description, "order")
select c.id, v.name, v.slug, v.description, 1
from public.courses c
join (values
  ('bsc-mechanical-engineering', 'Engineering Mathematics I', 'engineering-mathematics-i', 'Calculus, algebra and trigonometry for engineers.'),
  ('bed-mathematics',            'Calculus I',                'calculus-i',                'Limits, differentiation and applications.'),
  ('bed-basic-education',        'Educational Psychology',    'educational-psychology',    'Theories of learning and development.'),
  ('bsc-business-administration','Principles of Management',  'principles-of-management',  'Foundations of management theory and practice.'),
  ('bsc-computer-engineering',   'Discrete Mathematics',      'discrete-mathematics',      'Logic, sets, graphs and combinatorics.'),
  ('bsc-accounting',             'Financial Accounting',      'financial-accounting',      'Principles and practice of financial accounting.'),
  ('prof-diploma-marketing',     'Marketing Management',      'marketing-management',      'Strategic and operational marketing.'),
  ('professional-law-course',    'Ghana Legal System',        'ghana-legal-system',        'Sources and structure of Ghanaian law.'),
  ('chartered-banker',           'Banking Operations',        'banking-operations',        'Core banking products and operations.')
) as v(course_slug, name, slug, description) on c.slug = v.course_slug
on conflict (course_id, slug) do nothing;

-- Ensure UG BSc Computer Science has an Introduction to Programming subject
-- (created in 0001) — no-op if already present.
insert into public.subjects (course_id, name, slug, description, "order")
select c.id, 'Introduction to Programming', 'intro-to-programming', 'First-year programming fundamentals.', 1
from public.courses c
where c.slug = 'bsc-computer-science'
on conflict (course_id, slug) do nothing;

-- ============================================================================
-- Helper note: each paper below is created, then its questions inserted via a
-- CTE that re-resolves the paper id by (course slug, subject slug, year, title).
-- ============================================================================

-- ---- UG > Introduction to Programming (2022) -------------------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2022, 'UG 2022 Introduction to Programming (End of Semester)',
       'First-year programming fundamentals: variables, control flow and algorithms.', 4, 120
from public.subjects s join public.courses c on c.id = s.course_id
where c.slug = 'bsc-computer-science' and s.slug = 'intro-to-programming'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  where c.slug = 'bsc-computer-science' and s.slug = 'intro-to-programming'
    and p.year = 2022 and p.title = 'UG 2022 Introduction to Programming (End of Semester)'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','Which of the following is a valid variable name in most programming languages?','{"A":"2name","B":"_count","C":"my-var","D":"class"}'::jsonb,'B','Identifiers may start with a letter or underscore, cannot start with a digit, cannot contain hyphens, and reserved words like "class" are not allowed.',1),
  (2,'mcq','Which loop checks its condition before executing the body, so it may run zero times?','{"A":"do-while","B":"while","C":"repeat-until","D":"infinite"}'::jsonb,'B','A while loop evaluates the condition first; if it is false initially the body never runs.',1),
  (3,'mcq','A boolean expression evaluates to a value of type','{"A":"integer","B":"string","C":"true or false","D":"floating point"}'::jsonb,'C','Boolean expressions yield one of two values: true or false.',1),
  (4,'mcq','An algorithm is best described as','{"A":"a programming language","B":"a step-by-step procedure to solve a problem","C":"a type of computer","D":"a database"}'::jsonb,'B','An algorithm is a finite, ordered set of steps that solves a problem.',1)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- KNUST > Engineering Mathematics I (2022) ------------------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2022, 'KNUST 2022 Engineering Mathematics I',
       'Differentiation, integration, trigonometry and matrices.', 4, 180
from public.subjects s join public.courses c on c.id = s.course_id
where c.slug = 'bsc-mechanical-engineering' and s.slug = 'engineering-mathematics-i'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  where c.slug = 'bsc-mechanical-engineering' and s.slug = 'engineering-mathematics-i'
    and p.year = 2022 and p.title = 'KNUST 2022 Engineering Mathematics I'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','Differentiate y = x^2 with respect to x.','{"A":"x","B":"2x","C":"x^2/2","D":"2"}'::jsonb,'B','By the power rule, d/dx(x^n) = n*x^(n-1), so d/dx(x^2) = 2x.',1),
  (2,'mcq','Evaluate the integral of 1/x dx.','{"A":"ln|x| + C","B":"x + C","C":"-1/x^2 + C","D":"1 + C"}'::jsonb,'A','The integral of 1/x is the natural logarithm ln|x| + C.',1),
  (3,'mcq','What is the value of cos 0?','{"A":"0","B":"1","C":"-1","D":"undefined"}'::jsonb,'B','cos 0 = 1.',1),
  (4,'mcq','A matrix with 3 rows and 2 columns has order','{"A":"2 x 3","B":"3 x 2","C":"6","D":"5"}'::jsonb,'B','Matrix order is stated as rows x columns, i.e. 3 x 2.',1)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- UCC > Calculus I (2021) ----------------------------------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2021, 'UCC 2021 Calculus I',
       'Limits, gradients and differentiation.', 4, 120
from public.subjects s join public.courses c on c.id = s.course_id
where c.slug = 'bed-mathematics' and s.slug = 'calculus-i'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  where c.slug = 'bed-mathematics' and s.slug = 'calculus-i'
    and p.year = 2021 and p.title = 'UCC 2021 Calculus I'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','The limit of (sin x)/x as x approaches 0 is','{"A":"0","B":"1","C":"infinity","D":"undefined"}'::jsonb,'B','This is a standard limit: lim(x->0) (sin x)/x = 1.',1),
  (2,'mcq','The slope of a horizontal line is','{"A":"0","B":"1","C":"undefined","D":"infinite"}'::jsonb,'A','A horizontal line has no vertical change, so its gradient is 0.',1),
  (3,'mcq','Differentiation is primarily used to find the','{"A":"area under a curve","B":"rate of change","C":"total distance","D":"average value"}'::jsonb,'B','The derivative measures the instantaneous rate of change of a function.',1),
  (4,'essay','Differentiate y = 3x^2 + 2x - 5 with respect to x and find the gradient at x = 1.',null::jsonb,'dy/dx = 6x + 2; at x = 1 the gradient is 8.','Differentiate term by term: d/dx(3x^2)=6x, d/dx(2x)=2, d/dx(-5)=0, giving 6x + 2. Substituting x = 1 gives 6(1) + 2 = 8.',6)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- UEW > Educational Psychology (2022) ----------------------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2022, 'UEW 2022 Educational Psychology',
       'Theories of learning, cognition and human development.', 4, 120
from public.subjects s join public.courses c on c.id = s.course_id
where c.slug = 'bed-basic-education' and s.slug = 'educational-psychology'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  where c.slug = 'bed-basic-education' and s.slug = 'educational-psychology'
    and p.year = 2022 and p.title = 'UEW 2022 Educational Psychology'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','The theory that learning occurs through reinforcement is associated with','{"A":"Jean Piaget","B":"B. F. Skinner","C":"Sigmund Freud","D":"Lev Vygotsky"}'::jsonb,'B','Skinner''s operant conditioning explains learning through reinforcement and punishment.',1),
  (2,'mcq','Jean Piaget is best known for his theory of','{"A":"moral development","B":"cognitive development","C":"psychosexual development","D":"operant conditioning"}'::jsonb,'B','Piaget proposed stages of cognitive development in children.',1),
  (3,'mcq','The concept of the Zone of Proximal Development was proposed by','{"A":"Lev Vygotsky","B":"Albert Bandura","C":"Ivan Pavlov","D":"Abraham Maslow"}'::jsonb,'A','Vygotsky described the gap between what a learner can do alone and with guidance.',1),
  (4,'mcq','At the base of Maslow''s hierarchy of needs are','{"A":"self-actualisation needs","B":"esteem needs","C":"physiological needs","D":"safety needs"}'::jsonb,'C','Physiological needs (food, water, shelter) form the foundation of Maslow''s hierarchy.',1)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- GIMPA > Principles of Management (2023) ------------------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2023, 'GIMPA 2023 Principles of Management',
       'Functions of management, classical theory and organisation.', 4, 120
from public.subjects s join public.courses c on c.id = s.course_id
where c.slug = 'bsc-business-administration' and s.slug = 'principles-of-management'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  where c.slug = 'bsc-business-administration' and s.slug = 'principles-of-management'
    and p.year = 2023 and p.title = 'GIMPA 2023 Principles of Management'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','The four basic functions of management are planning, organising, leading and','{"A":"controlling","B":"marketing","C":"auditing","D":"budgeting"}'::jsonb,'A','The classic functions of management are planning, organising, leading and controlling.',1),
  (2,'mcq','Who proposed the 14 principles of management?','{"A":"Henri Fayol","B":"F. W. Taylor","C":"Elton Mayo","D":"Peter Drucker"}'::jsonb,'A','Henri Fayol set out 14 principles of administrative management.',1),
  (3,'mcq','Scientific management is most associated with','{"A":"Henri Fayol","B":"Frederick Taylor","C":"Max Weber","D":"Abraham Maslow"}'::jsonb,'B','F. W. Taylor is regarded as the father of scientific management.',1),
  (4,'mcq','An organisational chart primarily shows','{"A":"company profit","B":"the formal structure and reporting lines","C":"market share","D":"cash flow"}'::jsonb,'B','An organisational chart depicts formal authority and reporting relationships.',1)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- Ashesi > Discrete Mathematics (2023) ---------------------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2023, 'Ashesi 2023 Discrete Mathematics',
       'Sets, logic, graph theory and combinatorics.', 4, 120
from public.subjects s join public.courses c on c.id = s.course_id
where c.slug = 'bsc-computer-engineering' and s.slug = 'discrete-mathematics'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  where c.slug = 'bsc-computer-engineering' and s.slug = 'discrete-mathematics'
    and p.year = 2023 and p.title = 'Ashesi 2023 Discrete Mathematics'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','How many subsets does a set with 3 elements have?','{"A":"3","B":"6","C":"8","D":"9"}'::jsonb,'C','A set with n elements has 2^n subsets; 2^3 = 8.',1),
  (2,'mcq','The compound statement "p AND q" is true only when','{"A":"both p and q are true","B":"either p or q is true","C":"both are false","D":"only p is true"}'::jsonb,'A','A conjunction is true exactly when both operands are true.',1),
  (3,'mcq','The negation of "All students passed" is','{"A":"No students passed","B":"All students failed","C":"At least one student did not pass","D":"Some students passed"}'::jsonb,'C','The negation of a universal statement is an existential one: at least one did not pass.',1),
  (4,'mcq','How many edges does the complete graph K4 have?','{"A":"4","B":"5","C":"6","D":"12"}'::jsonb,'C','A complete graph on n vertices has n(n-1)/2 edges; 4*3/2 = 6.',1)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- UPSA > Financial Accounting (2022) -----------------------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2022, 'UPSA 2022 Financial Accounting',
       'The accounting equation, double entry and financial statements.', 4, 150
from public.subjects s join public.courses c on c.id = s.course_id
where c.slug = 'bsc-accounting' and s.slug = 'financial-accounting'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  where c.slug = 'bsc-accounting' and s.slug = 'financial-accounting'
    and p.year = 2022 and p.title = 'UPSA 2022 Financial Accounting'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','The accounting equation is Assets =','{"A":"Liabilities + Capital","B":"Capital - Liabilities","C":"Income - Expenses","D":"Liabilities - Capital"}'::jsonb,'A','Assets are financed by what is owed (liabilities) and owners'' funds (capital).',1),
  (2,'mcq','A debit entry in an asset account represents','{"A":"a decrease","B":"an increase","C":"no change","D":"a loss"}'::jsonb,'B','Assets increase on the debit side.',1),
  (3,'mcq','Which statement reports performance over a period of time?','{"A":"Statement of financial position","B":"Statement of profit or loss","C":"Trial balance","D":"Cash book"}'::jsonb,'B','The statement of profit or loss (income statement) covers a period; the statement of financial position is at a point in time.',1),
  (4,'essay','State three users of financial statements and explain why each needs the information.',null::jsonb,'Examples: Owners/shareholders (to assess profitability and return); lenders/banks (to assess ability to repay loans); government/GRA (to assess taxes due); employees (job security); suppliers (creditworthiness).','Award marks for any three valid users with a correct reason for each.',6)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- ICAG > Financial Accounting (2022) -----------------------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2022, 'ICAG 2022 Level 1 Financial Accounting',
       'Accounting concepts, depreciation and the trial balance.', 4, 180
from public.subjects s join public.courses c on c.id = s.course_id
where c.slug = 'icag-level-1' and s.slug = 'financial-accounting'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  where c.slug = 'icag-level-1' and s.slug = 'financial-accounting'
    and p.year = 2022 and p.title = 'ICAG 2022 Level 1 Financial Accounting'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','Under the historical cost convention, assets are recorded at','{"A":"market value","B":"original cost","C":"replacement cost","D":"net realisable value"}'::jsonb,'B','Historical cost records assets at the amount originally paid for them.',1),
  (2,'mcq','Depreciation is best described as','{"A":"a loss of cash","B":"the allocation of the cost of a non-current asset over its useful life","C":"an increase in asset value","D":"a liability"}'::jsonb,'B','Depreciation spreads the cost of a non-current asset over the periods that benefit from its use.',1),
  (3,'mcq','The statement that lists all ledger balances to check arithmetic accuracy is the','{"A":"statement of financial position","B":"trial balance","C":"income statement","D":"cash flow statement"}'::jsonb,'B','A trial balance lists all ledger balances to confirm that debits equal credits.',1),
  (4,'essay','Explain the going concern and accruals (matching) concepts in accounting.',null::jsonb,'Going concern assumes the business will continue operating for the foreseeable future, so assets are not valued at break-up values. Accruals (matching) requires income and the expenses incurred in earning it to be recognised in the same period, regardless of when cash is received or paid.','Award marks for a correct explanation of each concept.',6)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- CIMG > Marketing Management (2022) -----------------------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2022, 'CIMG 2022 Marketing Management',
       'Marketing mix, segmentation, strategy and pricing.', 4, 120
from public.subjects s join public.courses c on c.id = s.course_id
where c.slug = 'prof-diploma-marketing' and s.slug = 'marketing-management'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  where c.slug = 'prof-diploma-marketing' and s.slug = 'marketing-management'
    and p.year = 2022 and p.title = 'CIMG 2022 Marketing Management'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','The 4Ps of the marketing mix are Product, Price, Place and','{"A":"Promotion","B":"People","C":"Profit","D":"Process"}'::jsonb,'A','The traditional marketing mix consists of Product, Price, Place and Promotion.',1),
  (2,'mcq','Market segmentation is best described as','{"A":"lowering prices","B":"dividing a market into distinct groups of buyers","C":"advertising on television","D":"exporting goods"}'::jsonb,'B','Segmentation splits a market into groups with similar needs or characteristics.',1),
  (3,'mcq','A SWOT analysis examines Strengths, Weaknesses, Opportunities and','{"A":"Threats","B":"Targets","C":"Trends","D":"Taxes"}'::jsonb,'A','SWOT stands for Strengths, Weaknesses, Opportunities and Threats.',1),
  (4,'mcq','The pricing strategy that sets a high initial price for a new product is called','{"A":"penetration pricing","B":"price skimming","C":"loss-leader pricing","D":"discount pricing"}'::jsonb,'B','Price skimming sets a high launch price, then lowers it over time.',1)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- Ghana School of Law > Ghana Legal System (2022) ----------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2022, 'GSL 2022 Ghana Legal System',
       'Sources of law, the courts and the arms of government.', 4, 180
from public.subjects s join public.courses c on c.id = s.course_id
where c.slug = 'professional-law-course' and s.slug = 'ghana-legal-system'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  where c.slug = 'professional-law-course' and s.slug = 'ghana-legal-system'
    and p.year = 2022 and p.title = 'GSL 2022 Ghana Legal System'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','The supreme law of Ghana is the','{"A":"Criminal Offences Act","B":"1992 Constitution","C":"English common law","D":"Companies Act"}'::jsonb,'B','The 1992 Constitution is the supreme law of Ghana; any law inconsistent with it is void.',1),
  (2,'mcq','The highest court in Ghana is the','{"A":"High Court","B":"Court of Appeal","C":"Supreme Court","D":"Circuit Court"}'::jsonb,'C','The Supreme Court is the apex court of Ghana.',1),
  (3,'mcq','The arm of government responsible for making laws in Ghana is','{"A":"the Judiciary","B":"Parliament","C":"the Police Service","D":"the Executive alone"}'::jsonb,'B','Parliament is the legislature and makes the laws of Ghana.',1),
  (4,'essay','State the three arms of government in Ghana and the main function of each.',null::jsonb,'The Executive implements and enforces laws; the Legislature (Parliament) makes laws; the Judiciary interprets laws and settles disputes.','Award marks for naming each arm and giving its correct primary function.',6)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- CIB Ghana > Banking Operations (2023) --------------------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2023, 'CIB Ghana 2023 Banking Operations',
       'Central banking, payment instruments and customer due diligence.', 4, 120
from public.subjects s join public.courses c on c.id = s.course_id
where c.slug = 'chartered-banker' and s.slug = 'banking-operations'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  where c.slug = 'chartered-banker' and s.slug = 'banking-operations'
    and p.year = 2023 and p.title = 'CIB Ghana 2023 Banking Operations'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','The central bank of Ghana is the','{"A":"Ghana Commercial Bank","B":"Bank of Ghana","C":"Ecobank Ghana","D":"ARB Apex Bank"}'::jsonb,'B','The Bank of Ghana is the central bank and regulator of the banking sector.',1),
  (2,'mcq','A cheque marked "Account Payee Only" is','{"A":"an open cheque","B":"a crossed cheque","C":"a bearer cheque","D":"a post-dated cheque"}'::jsonb,'B','Such a cheque is crossed and can only be paid into the named payee''s account.',1),
  (3,'mcq','In banking, KYC stands for','{"A":"Keep Your Cash","B":"Know Your Customer","C":"Know Your Credit","D":"Keep Your Credit"}'::jsonb,'B','KYC (Know Your Customer) is the process of verifying customer identity.',1),
  (4,'mcq','The charge a bank levies on money it lends is called the','{"A":"dividend","B":"interest (lending) rate","C":"commission","D":"levy"}'::jsonb,'B','Interest, expressed as a lending rate, is the cost of borrowing from a bank.',1)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ============================================================================
-- Done.
-- ============================================================================
