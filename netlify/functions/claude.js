exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  const { messages } = JSON.parse(event.body);
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: { message: "API nøgle mangler på serveren" } }),
    };
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages,
    }),
  });

  const data = await response.json();

  // Ekstrakt og rens JSON fra svaret
  if (data.content && data.content[0] && data.content[0].text) {
    let text = data.content[0].text;
    // Find JSON objekt i teksten
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      data.content[0].text = match[0];
    }
  }

  return {
    statusCode: 200,
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(data),
  };
};
