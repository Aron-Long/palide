import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const agentKey = process.env.MULE_AGENT_KEY;

  if (!agentKey) {
    console.error('Missing MULE_AGENT_KEY environment variable');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { sessionId, agentId, cost, isFinal, meteringId, timestamp } = req.body;

  if (!sessionId || !agentId || cost === undefined || !meteringId || !timestamp) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const response = await fetch('https://api.mulerun.com/sessions/metering', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${agentKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        agentId,
        cost,
        isFinal: !!isFinal,
        meteringId,
        timestamp,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('MuleRun Metering API Error:', data);
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Internal Metering Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

