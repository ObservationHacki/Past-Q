-- ============================================================================
-- PastQ — Rich demo seed data (WASSCE Maths, BECE Science, WASSCE English)
--
-- Idempotent: safe to re-run. Run after 0001–0003 in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/hukwgvbqtxvakncdjwwy/sql/new
--
-- NOTE: These questions are representative of the WAEC BECE/WASSCE style and
-- syllabus. Verify wording against official WAEC past papers before any
-- non-demo use.
-- ============================================================================

-- Ensure a WASSCE English Language subject exists (under the General Arts course).
insert into public.subjects (course_id, name, slug, description, "order")
select c.id, 'English Language', 'english-language',
       'WASSCE English Language — comprehension, lexis, structure and essay.', 1
from public.courses c
join public.institutions i on i.id = c.institution_id
join public.levels l on l.id = i.level_id
where l.slug = 'wassce' and i.slug = 'waec' and c.slug = 'general-arts'
on conflict (course_id, slug) do nothing;

-- ============================================================================
-- WASSCE — Core Mathematics (20 questions across 2019–2023)
-- ============================================================================

-- ---- 2023 Core Mathematics Paper 1 (Objectives): 8 MCQ ---------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2023, 'WASSCE 2023 Core Mathematics Paper 1 (Objectives)',
       'Objective test covering indices, fractions, algebra, geometry and statistics.', 8, 90
from public.subjects s
join public.courses c on c.id = s.course_id
join public.institutions i on i.id = c.institution_id
join public.levels l on l.id = i.level_id
where l.slug = 'wassce' and i.slug = 'waec' and c.slug = 'general-science' and s.slug = 'core-mathematics'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  join public.institutions i on i.id = c.institution_id
  join public.levels l on l.id = i.level_id
  where l.slug = 'wassce' and i.slug = 'waec' and c.slug = 'general-science'
    and s.slug = 'core-mathematics' and p.year = 2023
    and p.title = 'WASSCE 2023 Core Mathematics Paper 1 (Objectives)'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','If 2^x = 32, find the value of x.','{"A":"3","B":"4","C":"5","D":"6"}'::jsonb,'C','32 = 2^5, so x = 5.',1),
  (2,'mcq','Simplify 3/4 + 1/2.','{"A":"5/4","B":"1","C":"4/6","D":"5/6"}'::jsonb,'A','3/4 + 2/4 = 5/4.',1),
  (3,'mcq','Solve for x: 3x - 7 = 11.','{"A":"4","B":"5","C":"6","D":"18"}'::jsonb,'C','3x = 18, so x = 6.',1),
  (4,'mcq','Find the area of a circle of radius 7 cm. (Take pi = 22/7)','{"A":"22 cm^2","B":"44 cm^2","C":"154 cm^2","D":"308 cm^2"}'::jsonb,'C','Area = pi r^2 = 22/7 x 7 x 7 = 154 cm^2.',1),
  (5,'mcq','Express 0.0045 in standard form.','{"A":"4.5 x 10^-3","B":"45 x 10^-4","C":"4.5 x 10^3","D":"0.45 x 10^-2"}'::jsonb,'A','Move the decimal point 3 places right: 4.5 x 10^-3.',1),
  (6,'mcq','Find the gradient of the line joining (1, 2) and (3, 6).','{"A":"1","B":"2","C":"3","D":"4"}'::jsonb,'B','Gradient = (6 - 2)/(3 - 1) = 4/2 = 2.',1),
  (7,'mcq','Evaluate log10 1000.','{"A":"1","B":"2","C":"3","D":"10"}'::jsonb,'C','1000 = 10^3, so log10 1000 = 3.',1),
  (8,'mcq','Find the next term of the sequence 2, 5, 10, 17, ...','{"A":"24","B":"25","C":"26","D":"27"}'::jsonb,'C','Differences are 3, 5, 7, 9; 17 + 9 = 26.',1)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- 2022 Core Mathematics Paper 1 (Objectives): 4 MCQ ---------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2022, 'WASSCE 2022 Core Mathematics Paper 1 (Objectives)',
       'Objective test covering equations, probability, factorisation and trigonometry.', 4, 90
from public.subjects s
join public.courses c on c.id = s.course_id
join public.institutions i on i.id = c.institution_id
join public.levels l on l.id = i.level_id
where l.slug = 'wassce' and i.slug = 'waec' and c.slug = 'general-science' and s.slug = 'core-mathematics'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  join public.institutions i on i.id = c.institution_id
  join public.levels l on l.id = i.level_id
  where l.slug = 'wassce' and i.slug = 'waec' and c.slug = 'general-science'
    and s.slug = 'core-mathematics' and p.year = 2022
    and p.title = 'WASSCE 2022 Core Mathematics Paper 1 (Objectives)'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','Solve for x: x/3 = 4.','{"A":"1.33","B":"4","C":"7","D":"12"}'::jsonb,'D','Multiply both sides by 3: x = 12.',1),
  (2,'mcq','A bag contains 3 red and 2 blue balls. What is the probability of picking a red ball?','{"A":"2/5","B":"1/2","C":"3/5","D":"3/2"}'::jsonb,'C','P(red) = 3/(3+2) = 3/5.',1),
  (3,'mcq','Factorise x^2 - 9.','{"A":"(x - 3)(x + 3)","B":"(x - 9)(x + 1)","C":"(x - 3)^2","D":"(x + 3)^2"}'::jsonb,'A','Difference of two squares: x^2 - 9 = (x - 3)(x + 3).',1),
  (4,'mcq','Find the mean of 4, 8, 10, 12 and 16.','{"A":"8","B":"10","C":"12","D":"50"}'::jsonb,'B','Sum = 50; mean = 50/5 = 10.',1)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- 2020 Core Mathematics Paper 2 (Essay): 4 essay ------------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2020, 'WASSCE 2020 Core Mathematics Paper 2 (Essay)',
       'Theory questions on simultaneous equations, percentages, ratio and rates.', 4, 150
from public.subjects s
join public.courses c on c.id = s.course_id
join public.institutions i on i.id = c.institution_id
join public.levels l on l.id = i.level_id
where l.slug = 'wassce' and i.slug = 'waec' and c.slug = 'general-science' and s.slug = 'core-mathematics'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  join public.institutions i on i.id = c.institution_id
  join public.levels l on l.id = i.level_id
  where l.slug = 'wassce' and i.slug = 'waec' and c.slug = 'general-science'
    and s.slug = 'core-mathematics' and p.year = 2020
    and p.title = 'WASSCE 2020 Core Mathematics Paper 2 (Essay)'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'essay','Solve the simultaneous equations: 2x + y = 7 and x - y = 2.',null::jsonb,'x = 3, y = 1','Adding the two equations: 3x = 9, so x = 3. Substitute into x - y = 2: 3 - y = 2, so y = 1.',5),
  (2,'essay','A trader bought a television set for GH₵800 and sold it for GH₵950. Calculate the percentage profit.',null::jsonb,'18.75%','Profit = 950 - 800 = GH₵150. Percentage profit = (150/800) x 100% = 18.75%.',5),
  (3,'essay','The angles of a triangle are in the ratio 2 : 3 : 4. Find the size of the largest angle.',null::jsonb,'80 degrees','Total parts = 2 + 3 + 4 = 9. Angles sum to 180 degrees, so the largest = (4/9) x 180 = 80 degrees.',4),
  (4,'essay','A car travels 120 km in 2 hours. Calculate its average speed in metres per second.',null::jsonb,'Approximately 16.7 m/s','Speed = 120 km / 2 h = 60 km/h = (60 x 1000)/3600 m/s = 16.67 m/s (3 s.f.).',4)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- 2019 Core Mathematics Paper 1 (Objectives): 4 MCQ ---------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2019, 'WASSCE 2019 Core Mathematics Paper 1 (Objectives)',
       'Objective test covering approximation, mensuration, percentages and trigonometry.', 4, 90
from public.subjects s
join public.courses c on c.id = s.course_id
join public.institutions i on i.id = c.institution_id
join public.levels l on l.id = i.level_id
where l.slug = 'wassce' and i.slug = 'waec' and c.slug = 'general-science' and s.slug = 'core-mathematics'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  join public.institutions i on i.id = c.institution_id
  join public.levels l on l.id = i.level_id
  where l.slug = 'wassce' and i.slug = 'waec' and c.slug = 'general-science'
    and s.slug = 'core-mathematics' and p.year = 2019
    and p.title = 'WASSCE 2019 Core Mathematics Paper 1 (Objectives)'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','Round 3.146 to two decimal places.','{"A":"3.1","B":"3.14","C":"3.15","D":"3.2"}'::jsonb,'C','The third decimal digit is 6, so round up: 3.15.',1),
  (2,'mcq','Find the perimeter of a square of side 5 cm.','{"A":"10 cm","B":"15 cm","C":"20 cm","D":"25 cm"}'::jsonb,'C','Perimeter = 4 x side = 4 x 5 = 20 cm.',1),
  (3,'mcq','Evaluate 15% of 200.','{"A":"15","B":"20","C":"30","D":"45"}'::jsonb,'C','15/100 x 200 = 30.',1),
  (4,'mcq','If sin θ = 0.5, find θ (for 0 <= θ <= 90 degrees).','{"A":"30 degrees","B":"45 degrees","C":"60 degrees","D":"90 degrees"}'::jsonb,'A','sin 30 degrees = 0.5, so θ = 30 degrees.',1)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ============================================================================
-- BECE — Integrated Science (15 questions across 2019–2023)
-- ============================================================================

-- ---- 2023 Integrated Science Paper 1 (Objectives): 8 MCQ -------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2023, 'BECE 2023 Integrated Science Paper 1 (Objectives)',
       'Objective test covering plants, matter, energy, health and the environment.', 8, 60
from public.subjects s
join public.courses c on c.id = s.course_id
join public.institutions i on i.id = c.institution_id
join public.levels l on l.id = i.level_id
where l.slug = 'bece' and i.slug = 'waec' and c.slug = 'jhs-core' and s.slug = 'integrated-science'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  join public.institutions i on i.id = c.institution_id
  join public.levels l on l.id = i.level_id
  where l.slug = 'bece' and i.slug = 'waec' and c.slug = 'jhs-core'
    and s.slug = 'integrated-science' and p.year = 2023
    and p.title = 'BECE 2023 Integrated Science Paper 1 (Objectives)'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','Which part of a plant manufactures food?','{"A":"Root","B":"Stem","C":"Leaf","D":"Flower"}'::jsonb,'C','Leaves contain chlorophyll and carry out photosynthesis to make food.',1),
  (2,'mcq','Which gas is needed for burning to take place?','{"A":"Nitrogen","B":"Oxygen","C":"Carbon dioxide","D":"Hydrogen"}'::jsonb,'B','Oxygen supports combustion (burning).',1),
  (3,'mcq','Which of the following is a good conductor of electricity?','{"A":"Rubber","B":"Wood","C":"Copper","D":"Plastic"}'::jsonb,'C','Copper is a metal and conducts electricity well.',1),
  (4,'mcq','The basic unit of all living things is the','{"A":"atom","B":"cell","C":"tissue","D":"organ"}'::jsonb,'B','The cell is the smallest structural and functional unit of life.',1),
  (5,'mcq','Which of these diseases is caused by a virus?','{"A":"Malaria","B":"Cholera","C":"Measles","D":"Typhoid"}'::jsonb,'C','Measles is caused by a virus; malaria is caused by a protozoan and the others by bacteria.',1),
  (6,'mcq','The change of water into water vapour is called','{"A":"condensation","B":"evaporation","C":"melting","D":"freezing"}'::jsonb,'B','Evaporation is the change from liquid to gas (vapour).',1),
  (7,'mcq','Which planet is closest to the Sun?','{"A":"Earth","B":"Venus","C":"Mercury","D":"Mars"}'::jsonb,'C','Mercury is the innermost planet of the Solar System.',1),
  (8,'mcq','Which class of food is the body''s main source of energy?','{"A":"Proteins","B":"Carbohydrates","C":"Vitamins","D":"Water"}'::jsonb,'B','Carbohydrates are the body''s primary source of energy.',1)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- 2021 Integrated Science Paper 2 (Essay): 4 essay ----------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2021, 'BECE 2021 Integrated Science Paper 2 (Essay)',
       'Short-answer theory questions on living things, agriculture, health and energy.', 4, 60
from public.subjects s
join public.courses c on c.id = s.course_id
join public.institutions i on i.id = c.institution_id
join public.levels l on l.id = i.level_id
where l.slug = 'bece' and i.slug = 'waec' and c.slug = 'jhs-core' and s.slug = 'integrated-science'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  join public.institutions i on i.id = c.institution_id
  join public.levels l on l.id = i.level_id
  where l.slug = 'bece' and i.slug = 'waec' and c.slug = 'jhs-core'
    and s.slug = 'integrated-science' and p.year = 2021
    and p.title = 'BECE 2021 Integrated Science Paper 2 (Essay)'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'essay','State three differences between living and non-living things.',null::jsonb,'Living things feed, respire, grow, reproduce, respond to stimuli, excrete and move; non-living things do not carry out these life processes.','Award one mark for each correct difference (e.g. living things respire/grow/reproduce while non-living things do not).',3),
  (2,'essay','Explain why a farmer applies fertilizer to crops.',null::jsonb,'Fertilizer adds nutrients (such as nitrogen, phosphorus and potassium) to the soil, replacing those used up by plants, so that crops grow healthily and give higher yields.','Key points: replaces lost soil nutrients, promotes healthy growth, increases yield.',3),
  (3,'essay','Describe how water can be made safe for drinking in the home.',null::jsonb,'Filter the water to remove solid particles, then boil it for several minutes to kill germs, or add a suitable disinfectant such as chlorine/water-treatment tablets, and store it in a clean covered container.','Accept: filtration, boiling, chlorination/treatment tablets, safe storage.',3),
  (4,'essay','State three uses of electricity in the home.',null::jsonb,'Lighting; cooking (electric stove/kettle); preserving food (refrigerator); ironing clothes; powering fans, televisions and radios.','Award one mark per valid household use, up to three.',3)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- 2019 Integrated Science Paper 1 (Objectives): 3 MCQ -------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2019, 'BECE 2019 Integrated Science Paper 1 (Objectives)',
       'Objective test covering reproduction in plants, energy and magnetism.', 3, 60
from public.subjects s
join public.courses c on c.id = s.course_id
join public.institutions i on i.id = c.institution_id
join public.levels l on l.id = i.level_id
where l.slug = 'bece' and i.slug = 'waec' and c.slug = 'jhs-core' and s.slug = 'integrated-science'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  join public.institutions i on i.id = c.institution_id
  join public.levels l on l.id = i.level_id
  where l.slug = 'bece' and i.slug = 'waec' and c.slug = 'jhs-core'
    and s.slug = 'integrated-science' and p.year = 2019
    and p.title = 'BECE 2019 Integrated Science Paper 1 (Objectives)'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','The female reproductive part of a flower is the','{"A":"stamen","B":"pistil","C":"petal","D":"sepal"}'::jsonb,'B','The pistil (carpel) is the female part; the stamen is the male part.',1),
  (2,'mcq','Which of the following is a renewable source of energy?','{"A":"Coal","B":"Petrol","C":"Solar","D":"Natural gas"}'::jsonb,'C','Solar energy is renewable; the others are finite fossil fuels.',1),
  (3,'mcq','Iron filings are attracted by a','{"A":"battery","B":"magnet","C":"bulb","D":"wire"}'::jsonb,'B','A magnet attracts magnetic materials such as iron.',1)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ============================================================================
-- WASSCE — English Language (10 questions across 2022–2023)
-- ============================================================================

-- ---- 2023 English Language Paper 1 (Objectives): 6 MCQ ---------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2023, 'WASSCE 2023 English Language Paper 1 (Objectives)',
       'Objective test on lexis, structure, synonyms, antonyms and grammar.', 6, 60
from public.subjects s
join public.courses c on c.id = s.course_id
join public.institutions i on i.id = c.institution_id
join public.levels l on l.id = i.level_id
where l.slug = 'wassce' and i.slug = 'waec' and c.slug = 'general-arts' and s.slug = 'english-language'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  join public.institutions i on i.id = c.institution_id
  join public.levels l on l.id = i.level_id
  where l.slug = 'wassce' and i.slug = 'waec' and c.slug = 'general-arts'
    and s.slug = 'english-language' and p.year = 2023
    and p.title = 'WASSCE 2023 English Language Paper 1 (Objectives)'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','Choose the word nearest in meaning to the underlined word: The harvest was abundant this year.','{"A":"scarce","B":"plentiful","C":"empty","D":"tiny"}'::jsonb,'B','"Abundant" means existing in large quantities, i.e. plentiful.',1),
  (2,'mcq','Choose the correctly spelt word.','{"A":"Recieve","B":"Receive","C":"Receeve","D":"Receve"}'::jsonb,'B','The rule "i before e except after c" gives "receive".',1),
  (3,'mcq','Choose the option that best completes the sentence: She has lived here ____ 2015.','{"A":"since","B":"for","C":"from","D":"at"}'::jsonb,'A','"Since" is used with a point in time (2015); "for" is used with a duration.',1),
  (4,'mcq','Choose the word opposite in meaning to the underlined word: The balloon began to expand.','{"A":"stretch","B":"grow","C":"contract","D":"widen"}'::jsonb,'C','The antonym of "expand" (get bigger) is "contract" (get smaller).',1),
  (5,'mcq','Identify the part of speech of the underlined word: He ran quickly to school.','{"A":"Adjective","B":"Adverb","C":"Noun","D":"Verb"}'::jsonb,'B','"Quickly" describes how he ran, so it is an adverb.',1),
  (6,'mcq','Choose the correct question tag: You are coming with us, ____?','{"A":"isn''t it","B":"aren''t you","C":"are you","D":"don''t you"}'::jsonb,'B','A positive statement with "you are" takes the negative tag "aren''t you".',1)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- 2022 English Language Paper 2 (Essay): 4 essay ------------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2022, 'WASSCE 2022 English Language Paper 2 (Essay & Comprehension)',
       'Guided composition, essay writing and summary.', 4, 120
from public.subjects s
join public.courses c on c.id = s.course_id
join public.institutions i on i.id = c.institution_id
join public.levels l on l.id = i.level_id
where l.slug = 'wassce' and i.slug = 'waec' and c.slug = 'general-arts' and s.slug = 'english-language'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  join public.institutions i on i.id = c.institution_id
  join public.levels l on l.id = i.level_id
  where l.slug = 'wassce' and i.slug = 'waec' and c.slug = 'general-arts'
    and s.slug = 'english-language' and p.year = 2022
    and p.title = 'WASSCE 2022 English Language Paper 2 (Essay & Comprehension)'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'essay','Write a letter to your friend in another town describing how you spent your last vacation.',null::jsonb,'An informal letter with the writer''s address and date, a greeting (Dear ...), an introduction, two or three paragraphs describing vacation activities, a conclusion, and an informal closing (e.g. "Your friend, ...").','Marks are awarded for content (relevant vacation details), organisation (correct informal-letter format), expression (grammar and vocabulary) and mechanical accuracy.',20),
  (2,'essay','Write an essay on the topic: The importance of reading. Give at least three points.',null::jsonb,'A well-structured essay with an introduction, three developed points (e.g. reading builds vocabulary, broadens knowledge, improves examination performance) and a conclusion.','Reward a clear thesis, three developed and relevant points with examples, logical paragraphing and accurate language.',20),
  (3,'essay','Read the following idea and summarise the main point in ONE sentence: "Many forests are being cut down for timber and farmland, which destroys animal habitats and contributes to climate change."',null::jsonb,'Deforestation for timber and farmland destroys animal habitats and worsens climate change.','Award full marks for one grammatical sentence that captures both causes (timber/farmland) and effects (habitat loss and climate change).',5),
  (4,'essay','Write an article for publication in your school magazine on the dangers of social media to students.',null::jsonb,'An article with a suitable title, a writer''s by-line, an introduction stating the issue, body paragraphs on dangers (e.g. distraction from studies, cyberbullying, exposure to harmful content, addiction) and a concluding recommendation.','Marks for appropriate article format and title, relevant well-developed points, coherence and correct expression.',20)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ============================================================================
-- Done.
-- ============================================================================
