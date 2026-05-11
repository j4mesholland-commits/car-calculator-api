export default async function handler(req, res) {
  // Allow requests from your Framer site
  res.setHeader('Access-Control-Allow-Origin', 'https://www.corporatecar.net')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { make, model, variant } = req.body

  if (!make || !model) {
    return res.status(400).json({ error: 'Make and model are required' })
  }

  const prompt = `You are a UK automotive data expert with knowledge of every car on sale in the UK in 2026.

For the car: ${make} ${model}${variant ? ` ${variant}` : ''}

Return ONLY valid JSON (no markdown, no explanation):
{
  "full_name": "Full official UK name including trim level",
  "fuel_type": "petrol|diesel|hybrid|phev|electric",
  "co2_gkm": number (WLTP CO2 g/km, 0 for BEV),
  "real_mpg": number or null (HonestJohn/real-world MPG, null for BEV),
  "ev_miles_per_kwh": number or null (real-world mi/kWh for EVs only),
  "insurance_group": number (1-50),
  "typical_new_price_gbp": number (current UK list price),
  "size_category": "city|supermini|hatchback|saloon|suv-small|suv-large|luxury",
  "annual_service_cost_gbp": number (typical UK independent garage service cost),
  "tyre_cost_per_set_gbp": number (typical UK cost for a full set of 4 tyres),
  "notes": "One sentence on running cost characteristics relevant to UK drivers"
}

Use real WLTP or HonestJohn real-world data. If a specific variant isn't provided, use the most popular UK variant.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json()
    const text = data.content[0].text.replace(/```json|```/g, '').trim()
    const carData = JSON.parse(text)

    return res.status(200).json(carData)

  } catch (error) {
    return res.status(500).json({ error: 'Could not fetch car data' })
  }
}
