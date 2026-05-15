import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are an expert Ayurvedic Prakriti (constitution) analyst. Your job is to create quiz questions that help determine a person's Ayurvedic dosha (Vata, Pitta, or Kapha).

Generate unique, insightful questions that go beyond basic physical traits. Include questions about:
- Emotional patterns and reactions
- Creative vs analytical thinking
- Relationship and social behavior
- Seasonal and environmental preferences
- Dream patterns
- Financial habits
- Communication style
- Recovery from illness
- Morning vs night energy

Each question must have exactly 3 options, one for each dosha (vata, pitta, kapha).

Respond ONLY with valid JSON in this exact format:
{
  "questions": [
    {
      "id": <number>,
      "category": "<string>",
      "question": "<string>",
      "options": [
        { "text": "<string>", "dosha": "vata" },
        { "text": "<string>", "dosha": "pitta" },
        { "text": "<string>", "dosha": "kapha" }
      ]
    }
  ]
}`;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const count = Math.min(body.count || 10, 20);
    const focus = body.focus || "general"; // e.g. "emotional", "physical", "lifestyle"

    const userPrompt = `Generate ${count} unique Ayurvedic Prakriti quiz questions${
      focus !== "general" ? ` focused on "${focus}" aspects` : ""
    }. Make them thoughtful, specific, and different from standard dosha quizzes. Number them starting from 100. Shuffle the dosha order in options randomly for each question.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.9,
        max_tokens: 3000,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `OpenAI API error: ${res.status}`, details: err },
        { status: 502 }
      );
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON from response (handle potential markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
