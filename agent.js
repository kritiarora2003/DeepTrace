const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));


const OLLAMA_URL = "http://localhost:11434/api/generate";
const MCP_URL = "http://localhost:3000";

// ---- SYSTEM PROMPT ----
const systemPrompt = `
You are an AI agent that can ONLY obtain real-world or system information by calling tools.

AVAILABLE TOOLS:
- get_time: returns the current system time
- echo: echoes a provided message

RULES:
- You do NOT know the current time.
- You MUST call get_time to answer questions about time.
- You are NOT allowed to say "I don't know" for tool-answerable questions.
- If a tool is required, you MUST respond ONLY with valid JSON.
- No extra text. No explanations.

EXAMPLE:

User: What time is it?
Assistant:
{
  "tool": "get_time",
  "arguments": {}
}

END EXAMPLE.
`;



// ---- CALL OLLAMA ----
async function callLLM(prompt) {
  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3.2:3b",
      prompt: systemPrompt + "\n\nUser: " + prompt,
      stream: false,
      temperature: 0
    })
  });

  return res.json();
}

// ---- AGENT LOOP ----
async function runAgent(userInput) {
  // 1️⃣ Ask model what to do
  const response = await callLLM(`User: ${userInput}`);
  const text = response.response.trim();

  let toolCall;

  try {
    toolCall = JSON.parse(text);
  } catch {
    console.log("🤖 Answer:\n", text);
    return;
  }

  if (!toolCall.tool) {
    console.log("🤖 Answer:\n", text);
    return;
  }

  // 2️⃣ Execute tool ONCE
  console.log("🛠 Calling tool:", toolCall.tool);

  const toolRes = await fetch(
    `${MCP_URL}/tools/${toolCall.tool}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toolCall.arguments || {})
    }
  );

  const toolData = await toolRes.json();

  // 3️⃣ Final answer — NO MORE TOOLS ALLOWED
  const final = await callLLM(`
Tool "${toolCall.tool}" returned:
${JSON.stringify(toolData)}

Now answer the user.
Do NOT call any tools.
`);

  console.log("🤖 Final answer:\n", final.response);
}

// ---- RUN ----
runAgent("What time is it right now?");
