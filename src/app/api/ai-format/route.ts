import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { originalText, maskCompany } = await req.json();

    const prompt = `
    다음 채용 공고 텍스트를 분석하여 JSON 형식으로 변환해주세요.
    ${maskCompany ? "고객사 이름은 '외국계 기업', '대형 로펌' 등 알맞은 블라인드 명칭으로 바꿔주세요." : ""}
    반드시 다음 필드를 포함한 JSON 형식만 응답하세요: 
    { "company": "", "title": "", "learnPoints": ["", ""], "salary": "", "location": "" }
    
    공고 텍스트:
    ${originalText}
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-8b-8192", // Groq에서 제공하는 빠르고 가벼운 모델
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(chatCompletion.choices[0]?.message?.content || "{}");
    return NextResponse.json(result);
  } catch (error) {
    console.error("AI Formatting Error:", error);
    return NextResponse.json({ error: "Failed to format JD" }, { status: 500 });
  }
}