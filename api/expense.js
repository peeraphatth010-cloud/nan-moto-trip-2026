// api/expense.js - Vercel Serverless Function to add new expense
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx2xZLBZfbljD4IGaAox8TmdGSGE3D9YxzRon39HqXdgMI4y-j5gS9fuUBs9VrwTtrgzg/exec';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SCRIPT_URL = process.env.GOOGLE_SHEET_API_URL || DEFAULT_SCRIPT_URL;
  const payload = req.body; // { action: 'addExpense', expense: { ... } }

  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    return res.status(200).json(result);
  } catch (error) {
    console.error('Expense add error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
