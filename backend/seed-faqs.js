require('dotenv').config();
const mongoose = require('mongoose');
const FAQ = require('./src/models/FAQ');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

const faqs = [
  {
    question: "What is AI Search Optimization (GEO)?",
    answer: "Generative Engine Optimization (GEO) is the process of improving your website's visibility within AI-driven search engines like Google Gemini, ChatGPT, and Perplexity. It involves optimizing your content to be easily understood and cited by AI models.",
    category: "AI Optimization",
    order: 1
  },
  {
    question: "How often are the AI Visibility scans updated?",
    answer: "Depending on your plan, scans can be performed daily, weekly, or on-demand. Our system continuously monitors changes in AI model behaviors to provide real-time visibility scores.",
    category: "AI Optimization",
    order: 2
  },
  {
    question: "What does the 'Grounding Recency' score mean?",
    answer: "Grounding recency measures how fresh the information is that an AI engine is using to answer questions about your brand. High recency scores indicate the AI is drawing from your most current website updates.",
    category: "AI Optimization",
    order: 3
  },
  {
    question: "How can I improve my 'Top 3 Presence'?",
    answer: "To improve Top 3 presence, focus on creating authoritative, citation-rich content and ensuring your technical SEO is robust enough for AI crawlers to prioritize your site as a top reference.",
    category: "AI Optimization",
    order: 4
  },
  {
    question: "Is my data secure with AIsonx?",
    answer: "Yes, we prioritize your security. All data is encrypted at rest and in transit. We follow industry best practices to ensure your competitive intelligence remains private.",
    category: "Security & Privacy",
    order: 5
  },
  {
    question: "Can I manage my subscription?",
    answer: "Yes, you can upgrade, downgrade, or cancel your subscription at any time from the Settings dashboard under the 'Billing & Plan' tab.",
    category: "Billing",
    order: 6
  }
];

const seedDB = async () => {
  await connectDB();
  try {
    await FAQ.deleteMany();
    await FAQ.insertMany(faqs);
    console.log('FAQs seeded successfully');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedDB();
