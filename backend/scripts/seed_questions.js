const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sampleQuestions = [
  {
    exam: 'UPSC_GS1',
    subject: 'History',
    topic: 'Modern India',
    question_text: 'Who among the following was the founder of the Servants of India Society?',
    options: {
      a: 'Gopal Krishna Gokhale',
      b: 'Bal Gangadhar Tilak',
      c: 'Mahatma Gandhi',
      d: 'Bipin Chandra Pal'
    },
    correct_option: 'a',
    explanation: 'The Servants of India Society was formed in Pune, Maharashtra, on June 12, 1905 by Gopal Krishna Gokhale.',
    elimination_tips: 'Tilak was an extremist, while Gokhale was a moderate focusing on education and social service through this society.',
    status: 'approved'
  },
  {
    exam: 'UPSC_GS1',
    subject: 'Geography',
    topic: 'Physical Geography',
    question_text: 'The term "Albedo" refers to:',
    options: {
      a: 'The total heat retained by the Earth',
      b: 'The amount of solar radiation reflected by a surface',
      c: 'The absorbed heat in the ozone layer',
      d: 'The temperature difference between day and night'
    },
    correct_option: 'b',
    explanation: 'Albedo is the fraction of solar energy reflected from the Earth back into space. It is a measure of the reflectivity of the earths surface.',
    elimination_tips: 'Albedo sounds like "albino" (white), which reflects light.',
    status: 'approved'
  },
  {
    exam: 'UPSC_GS1',
    subject: 'Polity',
    topic: 'Fundamental Rights',
    question_text: 'Right to Privacy is protected as an intrinsic part of Right to Life and Personal Liberty. Which of the following in the Constitution of India correctly and appropriately imply the above statement?',
    options: {
      a: 'Article 14 and the provisions under the 42nd Amendment',
      b: 'Article 17 and the Directive Principles of State Policy',
      c: 'Article 21 and the freedoms guaranteed in Part III',
      d: 'Article 24 and the provisions under the 44th Amendment'
    },
    correct_option: 'c',
    explanation: 'In the K.S. Puttaswamy case (2017), the Supreme Court declared that the right to privacy is an intrinsic part of Article 21.',
    elimination_tips: 'Article 21 deals with Life and Liberty, which is the most expansive fundamental right.',
    status: 'approved'
  },
  {
    exam: 'UPSC_GS1',
    subject: 'Economy',
    topic: 'Macroeconomics',
    question_text: 'Which of the following is/are the correct implication(s) of a depreciation of the Indian Rupee? \n1. It increases the competitiveness of Indian exports.\n2. It decreases the inflation rate in India.',
    options: {
      a: '1 only',
      b: '2 only',
      c: 'Both 1 and 2',
      d: 'Neither 1 nor 2'
    },
    correct_option: 'a',
    explanation: 'Depreciation makes exports cheaper for foreigners, increasing competitiveness. However, it makes imports expensive, which can increase imported inflation, not decrease it.',
    elimination_tips: 'Importing oil becomes costlier when Rupee falls, so inflation goes UP, not down. Eliminate Statement 2.',
    status: 'approved'
  },
  {
    exam: 'UPSC_GS1',
    subject: 'Environment',
    topic: 'Biodiversity',
    question_text: 'Which of the following national parks is unique in being a swamp with a floating vegetation that supports a rich biodiversity?',
    options: {
      a: 'Bhitarkanika National Park',
      b: 'Keibul Lamjao National Park',
      c: 'Keoladeo Ghana National Park',
      d: 'Sultanpur National Park'
    },
    correct_option: 'b',
    explanation: 'Keibul Lamjao National Park in Manipur is the only floating national park in the world, characterized by floating decomposed plant material called phumdis.',
    elimination_tips: 'Floating vegetation = Phumdis = Loktak Lake = Manipur = Keibul Lamjao.',
    status: 'approved'
  },
  {
    exam: 'UPSC_GS1',
    subject: 'Science & Tech',
    topic: 'Space',
    question_text: 'The term "Goldilocks Zone" is often seen in the news in the context of:',
    options: {
      a: 'Limits of habitable zone above the surface of the Earth',
      b: 'Regions inside the earth where shale gas is available',
      c: 'Search for the Earth-like planets in outer space',
      d: 'Search for meteorites containing precious metals'
    },
    correct_option: 'c',
    explanation: 'The Goldilocks Zone refers to the habitable zone around a star where the temperature is just right - not too hot and not too cold - for liquid water to exist.',
    elimination_tips: 'Remember the Goldilocks fairy tale: "just right". It applies to finding perfect planets.',
    status: 'approved'
  },
  {
    exam: 'UPSC_GS1',
    subject: 'History',
    topic: 'Ancient India',
    question_text: 'Which one of the following books of ancient India has the love story of the son of the founder of Sunga dynasty?',
    options: {
      a: 'Swapnavasavadatta',
      b: 'Malavikagnimitra',
      c: 'Meghadoota',
      d: 'Ratnavali'
    },
    correct_option: 'b',
    explanation: 'Malavikagnimitra is a Sanskrit play by Kalidasa based on the love story of Agnimitra, the Sunga emperor, and Malavika.',
    elimination_tips: 'Agnimitra was the son of Pushyamitra Sunga. The name is in the title: Malavika + Agnimitra.',
    status: 'approved'
  },
  {
    exam: 'UPSC_GS1',
    subject: 'Polity',
    topic: 'Parliament',
    question_text: 'The "Joint Session" of the Parliament is summoned by:',
    options: {
      a: 'The Prime Minister',
      b: 'The President',
      c: 'The Speaker of Lok Sabha',
      d: 'The Chairman of Rajya Sabha'
    },
    correct_option: 'b',
    explanation: 'Under Article 108 of the Constitution, the President summons the joint sitting of both Houses, though it is presided over by the Speaker.',
    elimination_tips: 'Summoning of Parliament (any session) is always done by the President as the head of state.',
    status: 'approved'
  },
  {
    exam: 'UPSC_GS1',
    subject: 'Geography',
    topic: 'Indian Geography',
    question_text: 'Which one of the following states of India has the longest coastline?',
    options: {
      a: 'Maharashtra',
      b: 'Andhra Pradesh',
      c: 'Kerala',
      d: 'Gujarat'
    },
    correct_option: 'd',
    explanation: 'Gujarat has the longest mainland coastline in India, extending for about 1600 km due to its highly indented nature.',
    elimination_tips: 'Look at the map: Gujarat has the Gulf of Kutch and Gulf of Khambhat making its coastline zig-zag and very long.',
    status: 'approved'
  },
  {
    exam: 'UPSC_GS1',
    subject: 'Economy',
    topic: 'Banking',
    question_text: 'In the context of the Indian economy, "Open Market Operations" refers to:',
    options: {
      a: 'Borrowing by scheduled banks from the RBI',
      b: 'Lending by commercial banks to industry and trade',
      c: 'Purchase and sale of government securities by the RBI',
      d: 'Deposit mobilization by the banks'
    },
    correct_option: 'c',
    explanation: 'Open Market Operations (OMO) is the sale and purchase of government securities and treasury bills by RBI to regulate the money supply.',
    elimination_tips: 'OMOs are tools of Monetary Policy, so it must involve the RBI and securities.',
    status: 'approved'
  }
];

async function seed() {
  console.log('Seeding questions...');
  const { data, error } = await supabaseAdmin.from('questions').insert(sampleQuestions);
  if (error) {
    console.error('Error seeding questions:', error);
  } else {
    console.log('Successfully seeded 10 questions!');
  }
}

seed();
