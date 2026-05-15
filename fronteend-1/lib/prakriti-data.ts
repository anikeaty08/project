export type Dosha = "vata" | "pitta" | "kapha";

export interface QuizOption {
  text: string;
  dosha: Dosha;
}

export interface QuizQuestion {
  id: number;
  category: string;
  question: string;
  options: QuizOption[];
}

export const quizQuestions: QuizQuestion[] = [
  // — Physical Traits —
  {
    id: 1, category: "Body Frame",
    question: "How would you describe your natural body frame?",
    options: [
      { text: "Thin & light — I find it hard to gain weight", dosha: "vata" },
      { text: "Medium & athletic — well-proportioned build", dosha: "pitta" },
      { text: "Broad & sturdy — I gain weight easily", dosha: "kapha" },
    ],
  },
  {
    id: 2, category: "Skin Type",
    question: "What best describes your skin?",
    options: [
      { text: "Dry, rough, or cool to the touch", dosha: "vata" },
      { text: "Warm, sensitive, prone to redness or acne", dosha: "pitta" },
      { text: "Soft, smooth, oily, and well-moisturized", dosha: "kapha" },
    ],
  },
  {
    id: 3, category: "Hair",
    question: "What is your hair naturally like?",
    options: [
      { text: "Dry, frizzy, thin, or curly", dosha: "vata" },
      { text: "Fine, straight, early greying or thinning", dosha: "pitta" },
      { text: "Thick, wavy, lustrous, and oily", dosha: "kapha" },
    ],
  },
  {
    id: 4, category: "Eyes",
    question: "How would you describe your eyes?",
    options: [
      { text: "Small, dry, active — they dart around quickly", dosha: "vata" },
      { text: "Sharp, penetrating, sensitive to bright light", dosha: "pitta" },
      { text: "Large, calm, with thick lashes and a gentle gaze", dosha: "kapha" },
    ],
  },
  {
    id: 5, category: "Joints",
    question: "How are your joints?",
    options: [
      { text: "They crack and pop; I'm quite flexible", dosha: "vata" },
      { text: "Loose and well-lubricated; prone to inflammation", dosha: "pitta" },
      { text: "Large, well-padded, and sturdy", dosha: "kapha" },
    ],
  },
  // — Digestion & Metabolism —
  {
    id: 6, category: "Appetite",
    question: "How would you describe your appetite?",
    options: [
      { text: "Irregular — sometimes ravenous, sometimes no appetite", dosha: "vata" },
      { text: "Strong and sharp — I get irritable if I skip meals", dosha: "pitta" },
      { text: "Steady but slow — I can skip meals without issue", dosha: "kapha" },
    ],
  },
  {
    id: 7, category: "Digestion",
    question: "How does your digestion typically function?",
    options: [
      { text: "Variable — bloating, gas, and irregular bowels", dosha: "vata" },
      { text: "Fast and intense — occasional heartburn or acidity", dosha: "pitta" },
      { text: "Slow and heavy — I feel full for a long time after eating", dosha: "kapha" },
    ],
  },
  {
    id: 8, category: "Food Preferences",
    question: "What kind of food do you naturally crave?",
    options: [
      { text: "Warm, soupy, comfort foods — I love snacking", dosha: "vata" },
      { text: "Cold foods, salads, spicy food, and sweets", dosha: "pitta" },
      { text: "Rich, creamy, fried food — I love carbs", dosha: "kapha" },
    ],
  },
  // — Mind & Emotions —
  {
    id: 9, category: "Mind Speed",
    question: "How does your mind work?",
    options: [
      { text: "Quick, restless — lots of ideas but hard to focus", dosha: "vata" },
      { text: "Sharp, analytical, and focused on goals", dosha: "pitta" },
      { text: "Calm, steady, and methodical — I think things through", dosha: "kapha" },
    ],
  },
  {
    id: 10, category: "Memory",
    question: "How would you describe your memory?",
    options: [
      { text: "I learn fast but forget quickly", dosha: "vata" },
      { text: "Sharp memory — I remember details well", dosha: "pitta" },
      { text: "Slow to learn but I never forget once I do", dosha: "kapha" },
    ],
  },
  {
    id: 11, category: "Under Stress",
    question: "When stressed, you tend to feel:",
    options: [
      { text: "Anxious, worried, fearful, or overwhelmed", dosha: "vata" },
      { text: "Angry, irritable, frustrated, or judgmental", dosha: "pitta" },
      { text: "Withdrawn, stubborn, or emotionally numb", dosha: "kapha" },
    ],
  },
  {
    id: 12, category: "Emotions",
    question: "What emotion do you experience most often?",
    options: [
      { text: "Enthusiasm mixed with anxiety and nervousness", dosha: "vata" },
      { text: "Ambition mixed with impatience and competitiveness", dosha: "pitta" },
      { text: "Contentment mixed with attachment and sentimentality", dosha: "kapha" },
    ],
  },
  // — Sleep & Energy —
  {
    id: 13, category: "Sleep",
    question: "How do you sleep?",
    options: [
      { text: "Light sleeper — I wake easily and may have insomnia", dosha: "vata" },
      { text: "Moderate — I sleep well but can wake if disturbed", dosha: "pitta" },
      { text: "Deep and heavy — I love sleeping and find it hard to wake up", dosha: "kapha" },
    ],
  },
  {
    id: 14, category: "Energy Levels",
    question: "How would you describe your daily energy?",
    options: [
      { text: "Bursts of energy, then sudden fatigue — very variable", dosha: "vata" },
      { text: "High energy that I can sustain well through the day", dosha: "pitta" },
      { text: "Steady, low-key energy — slow to start but enduring", dosha: "kapha" },
    ],
  },
  // — Environment & Lifestyle —
  {
    id: 15, category: "Temperature",
    question: "Which climate bothers you the most?",
    options: [
      { text: "Cold and windy weather — I always feel chilly", dosha: "vata" },
      { text: "Hot and humid weather — I overheat easily", dosha: "pitta" },
      { text: "Cold and damp weather — I feel sluggish", dosha: "kapha" },
    ],
  },
  {
    id: 16, category: "Activity",
    question: "What is your approach to physical activity?",
    options: [
      { text: "I love movement but tire quickly — yoga, dance, walking", dosha: "vata" },
      { text: "Competitive and intense — sports, running, challenges", dosha: "pitta" },
      { text: "I prefer gentle exercise and need motivation to move", dosha: "kapha" },
    ],
  },
  {
    id: 17, category: "Speech",
    question: "How do you typically speak?",
    options: [
      { text: "Fast, talkative — I jump between topics", dosha: "vata" },
      { text: "Clear, precise, persuasive — sometimes sharp", dosha: "pitta" },
      { text: "Slow, thoughtful, melodious — I don't rush", dosha: "kapha" },
    ],
  },
  {
    id: 18, category: "Decision Making",
    question: "How do you make decisions?",
    options: [
      { text: "I change my mind often and second-guess myself", dosha: "vata" },
      { text: "Quickly and decisively — I trust my judgment", dosha: "pitta" },
      { text: "Slowly and carefully — I prefer not to rush", dosha: "kapha" },
    ],
  },
];

export interface DoshaProfile {
  name: string;
  sanskrit: string;
  element: string;
  color: string;
  colorClass: string;
  bgClass: string;
  qualities: string[];
  strengths: string[];
  watchFor: string[];
  diet: { favor: string[]; avoid: string[] };
  lifestyle: string[];
  herbs: string[];
  description: string;
}

export const doshaProfiles: Record<Dosha, DoshaProfile> = {
  vata: {
    name: "Vata",
    sanskrit: "वात",
    element: "Air + Space",
    color: "#60A5FA",
    colorClass: "text-blue-400",
    bgClass: "bg-blue-400/15",
    qualities: ["Light", "Dry", "Cold", "Mobile", "Subtle", "Rough"],
    strengths: ["Creative & imaginative", "Quick learner", "Flexible & adaptable", "Energetic in bursts", "Natural enthusiasm"],
    watchFor: ["Anxiety & restlessness", "Dry skin & constipation", "Joint pain & cracking", "Insomnia", "Irregular appetite"],
    diet: {
      favor: ["Warm, cooked foods", "Ghee & healthy oils", "Sweet fruits", "Root vegetables", "Warm spices (ginger, cinnamon)", "Soups & stews"],
      avoid: ["Raw, cold foods", "Dry & crunchy snacks", "Bitter greens", "Carbonated drinks", "Caffeine excess", "Fasting"],
    },
    lifestyle: ["Follow a regular daily routine", "Warm oil self-massage (Abhyanga)", "Gentle yoga & meditation", "Stay warm in cold weather", "Early bedtime with calming rituals", "Avoid over-stimulation"],
    herbs: ["ashwagandha", "brahmi", "jatamansi", "shatavari", "vacha", "dashamula"],
    description: "Vata types are creative, quick-thinking visionaries governed by the elements of Air and Space. When balanced, they are the most energetic and adaptable of all types — full of ideas, enthusiasm, and an infectious zest for life. Their minds work at lightning speed, making them natural artists, innovators, and communicators.",
  },
  pitta: {
    name: "Pitta",
    sanskrit: "पित्त",
    element: "Fire + Water",
    color: "#F87171",
    colorClass: "text-red-400",
    bgClass: "bg-red-400/15",
    qualities: ["Hot", "Sharp", "Light", "Oily", "Liquid", "Spreading"],
    strengths: ["Natural leader", "Sharp intellect", "Strong digestion", "Courageous & determined", "Articulate speaker"],
    watchFor: ["Anger & irritability", "Acid reflux & ulcers", "Skin rashes & inflammation", "Burnout", "Premature greying"],
    diet: {
      favor: ["Cooling foods", "Sweet fruits (melons, grapes)", "Green leafy vegetables", "Coconut & cucumber", "Mild spices (fennel, coriander)", "Dairy (milk, ghee)"],
      avoid: ["Spicy & fermented foods", "Sour fruits", "Red meat", "Alcohol & coffee", "Fried foods", "Excessive salt"],
    },
    lifestyle: ["Avoid overheating & midday sun", "Moonlight walks & nature time", "Cooling pranayama (Shitali)", "Creative hobbies to channel intensity", "Regular meals — never skip lunch", "Practice patience & compassion"],
    herbs: ["shatavari", "amalaki", "chandan", "manjistha", "sariva", "guduchi"],
    description: "Pitta types are driven, intelligent leaders governed by Fire and Water. When balanced, they possess a brilliant intellect, strong digestion, radiant complexion, and natural charisma. They are the achievers and transformers — people who get things done with precision and passion. Their sharp minds excel at strategy, analysis, and organization.",
  },
  kapha: {
    name: "Kapha",
    sanskrit: "कफ",
    element: "Earth + Water",
    color: "#4ADE80",
    colorClass: "text-green-400",
    bgClass: "bg-green-400/15",
    qualities: ["Heavy", "Slow", "Steady", "Dense", "Soft", "Cool"],
    strengths: ["Loyal & compassionate", "Strong & enduring", "Excellent long-term memory", "Calm under pressure", "Nurturing nature"],
    watchFor: ["Weight gain & lethargy", "Congestion & excess mucus", "Emotional attachment", "Resistance to change", "Oversleeping"],
    diet: {
      favor: ["Light, warm, spiced foods", "Leafy greens & vegetables", "Legumes & beans", "Honey (in moderation)", "Pungent spices (black pepper, ginger)", "Bitter & astringent foods"],
      avoid: ["Heavy, oily foods", "Excessive dairy & sweets", "Cold drinks & ice cream", "Wheat & refined flour", "Excessive nuts", "Overeating"],
    },
    lifestyle: ["Vigorous daily exercise", "Wake before sunrise", "Dry brushing & stimulating massage", "Try new activities regularly", "Avoid daytime naps", "Declutter your space regularly"],
    herbs: ["pippali", "ginger", "turmeric", "gudmar", "punarnava", "chitraka"],
    description: "Kapha types are strong, nurturing, and grounded — governed by Earth and Water. When balanced, they are the most stable, loving, and resilient of all types. They have excellent stamina, beautiful skin, thick hair, and a natural calm that others gravitate toward. They are the rocks in relationships — loyal, patient, and deeply caring.",
  },
};

export function calculateResults(answers: Record<number, Dosha>) {
  const counts: Record<Dosha, number> = { vata: 0, pitta: 0, kapha: 0 };
  Object.values(answers).forEach((d) => counts[d]++);
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const percentages: Record<Dosha, number> = {
    vata: Math.round((counts.vata / total) * 100),
    pitta: Math.round((counts.pitta / total) * 100),
    kapha: Math.round((counts.kapha / total) * 100),
  };
  const sorted = (Object.entries(counts) as [Dosha, number][]).sort((a, b) => b[1] - a[1]);
  const primary = sorted[0][0];
  const secondary = sorted[1][0];
  const isDual = sorted[0][1] - sorted[1][1] <= 2;
  const prakritiName = isDual
    ? `${doshaProfiles[primary].name}-${doshaProfiles[secondary].name}`
    : doshaProfiles[primary].name;

  return { counts, percentages, primary, secondary, isDual, prakritiName };
}
