const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/create-checkout', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin}/success.html`,
      cancel_url: `${req.headers.origin}/`,
    });
    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: 'Failed to create checkout session.' });
  }
});

app.post('/generate', async (req, res) => {
  const { docType, input } = req.body;

  if (!input || input.trim().length < 10) {
    return res.status(400).json({ error: 'Please provide more detail about what you want documented.' });
  }

  const prompts = {
    runbook: `You are an expert IT documentation writer. Create a professional, detailed runbook based on the following information. Include: Overview, Prerequisites, Step-by-step procedures, Expected outcomes, Troubleshooting section, and Notes. Format it cleanly with clear headings.\n\nInput:\n${input}`,
    sop: `You are an expert IT documentation writer. Create a professional Standard Operating Procedure (SOP) document based on the following information. Include: Purpose, Scope, Responsibilities, Procedure steps, Quality checks, and Related documents. Format it cleanly with clear headings.\n\nInput:\n${input}`,
    network: `You are an expert IT documentation writer. Create a professional network documentation document based on the following information. Include: Network overview, Device inventory, IP addressing scheme, Configuration details, Security notes, and Maintenance procedures. Format it cleanly with clear headings.\n\nInput:\n${input}`,
    incident: `You are an expert IT documentation writer. Create a professional incident response procedure based on the following information. Include: Incident classification, Detection and reporting, Response steps, Escalation path, Resolution procedures, and Post-incident review. Format it cleanly with clear headings.\n\nInput:\n${input}`,
    onboarding: `You are an expert IT documentation writer. Create a professional IT onboarding checklist and guide based on the following information. Include: Account setup, Hardware setup, Software installation, Network access, Security requirements, and First day checklist. Format it cleanly with clear headings.\n\nInput:\n${input}`,
  };

  const prompt = prompts[docType] || prompts.runbook;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const documentation = message.content[0].text;
    res.json({ documentation });
  } catch (error) {
    console.error('Anthropic error:', error);
    res.status(500).json({ error: 'Failed to generate documentation. Please try again.' });
  }
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`IT Doc Generator running on http://localhost:${PORT}`);
  });
}

module.exports = app;