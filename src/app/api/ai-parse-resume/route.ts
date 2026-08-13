import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { resumeText } = await req.json();

    if (!resumeText || typeof resumeText !== "string") {
      return NextResponse.json(
        { error: "이력서 텍스트가 제공되지 않았습니다." },
        { status: 400 }
      );
    }

    // [개인정보 보호(PII) 정책 적용]
    // 이력서 원문(resumeText)은 AI 분석 용도로만 일시 사용되며, 
    // DB에 영구 저장하지 않고 즉시 구조화된 결과물만 반환합니다.

    // 시뮬레이션 및 AI 연동 파싱 로직 (추후 실제 LLM API Key 연동 가능)
    // 여기서는 텍스트 기반으로 핵심 항목을 추출하는 구조화 데이터를 반환합니다.
    
    const parsedProfile = {
      headline: "전문성을 갖춘 커리어 프로필",
      careerSummary: resumeText.slice(0, 150) + "...", // 요약 발췌
      skills: ["Problem Solving", "Communication", "Domain Knowledge"],
      careers: [
        {
          companyName: "이전 직장 / 파싱된 경력",
          role: "담당 업무",
          period: "근무 기간",
          description: "주요 성과 및 업무 내용 요약",
        },
      ],
      education: ["관련 학과 졸업"],
      profileCompleteness: 85, // Profile Completion Guidance용 완성도 점수
    };

    return NextResponse.json({
      success: true,
      data: parsedProfile,
      notice: "개인정보 보호 정책에 따라 원문 텍스트는 서버에 저장되지 않았습니다.",
    });
  } catch (error) {
    console.error("AI Resume Parse Error:", error);
    return NextResponse.json(
      { error: "AI 이력서 분석 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}