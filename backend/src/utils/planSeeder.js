const Plan = require('../models/Plan');
const logger = require('./logger');

const defaultPlans = [
  {
    name: 'Starter',
    price: 1450,
    description: 'Individuals & Small Teams',
    bestFor: 'Individuals & Small Teams',
    trial: '7-Day Free Trial',
    monthlyScans: 10,
    promptsPerProject: 2,
    features: {
      'AI Engines Included': 'ChatGPT & Google AI',
      'Regions Included': '1 Region',
      'Monthly AI Scans': '10 Scans',
      'Prompts per Project': '2 Prompts',
      'Unlimited Users': true,
      'Analytics Dashboards': 'Full Access',
      'AI Visibility Audit Tool': true,
      'AI Domain Analyzer': true,
      'Brand Authority Score': true,
      'Check LLM Entity Visibility': false,
      'Check LLM Live Visibility': false,
      'Advanced Visibility Insights': false,
    }
  },
  {
    name: 'Growth',
    price: 4500,
    description: 'Growing Businesses',
    bestFor: 'Growing Businesses',
    trial: null,
    monthlyScans: 15,
    promptsPerProject: 10,
    features: {
      'AI Engines Included': 'ChatGPT, Gemini, Google AI',
      'Regions Included': '1 Region',
      'Monthly AI Scans': '15 Scans',
      'Prompts per Project': '10 Prompts',
      'Unlimited Users': true,
      'Analytics Dashboards': 'Full Access',
      'AI Visibility Audit Tool': true,
      'AI Domain Analyzer': true,
      'Brand Authority Score': true,
      'Check LLM Entity Visibility': true,
      'Check LLM Live Visibility': true,
      'Advanced Visibility Insights': 'Standard',
    }
  },
  {
    name: 'Professional',
    price: 9000,
    description: 'Agencies & Advanced Teams',
    bestFor: 'Agencies & Advanced Teams',
    trial: null,
    monthlyScans: 20,
    promptsPerProject: 25,
    features: {
      'AI Engines Included': 'ChatGPT, Gemini, Perplexity, Claude & Google AI',
      'Regions Included': '1 Region',
      'Monthly AI Scans': '20 Scans',
      'Prompts per Project': '25 Prompts',
      'Unlimited Users': true,
      'Analytics Dashboards': 'Full Access',
      'AI Visibility Audit Tool': true,
      'AI Domain Analyzer': true,
      'Brand Authority Score': true,
      'Check LLM Entity Visibility': true,
      'Check LLM Live Visibility': true,
      'Advanced Visibility Insights': 'Advanced',
    }
  }
];

const seedPlans = async () => {
  try {
    const planCount = await Plan.countDocuments();
    if (planCount === 0) {
      logger.info('🌱 Database subscription plans empty — seeding default Starter, Growth, and Professional plans...');
      await Plan.insertMany(defaultPlans);
      logger.info('🌱 Successfully seeded subscription packages.');
    }
  } catch (err) {
    logger.error('🌱 Failed to seed subscription plans:', err.message);
  }
};

module.exports = seedPlans;
