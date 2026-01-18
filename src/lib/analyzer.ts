import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
    throw new Error("Gemini APIキーが設定されていません。GOOGLE_GENERATIVE_AI_API_KEY または GEMINI_API_KEY を .env.local に設定してください。");
}
const genAI = new GoogleGenerativeAI(apiKey);
// gemini-1.5-flash が 404 になる場合があるため、明示的なモデル名のリトライや確認用
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function analyzeContent(prompt: string, searchData: any[], aiOverview: string | null) {
    const searchContext = searchData.map((s, i) => `[Site ${i + 1}] Title: ${s.title}\nURL: ${s.link}\nContent: ${s.content?.slice(0, 1500) || "No content available."}`).join("\n\n");

    const systemPrompt = `
あなたはSEOとコンテンツマーケティングの専門家エージェントです。
ユーザーから提供されたテーマに基づき、Google検索上位5サイトとAI Overview（もしあれば）を分析し、以下の情報を抽出してください。

1. **ターゲット層**: どのようなユーザーをターゲットにしているか
2. **検索意図**: ユーザーは何を知りたくて検索しているか
3. **重要キーワード**: 共起語や頻出する重要要素
4. **サイト構成のヒント**: 上位サイトに共通する構成の特徴
5. **勝因のロジック**: なぜこれらのサイトが上位にきているのか、独自の「勝ちパターン」を推測

## 入力データ
テーマ: ${prompt}
AI Overview: ${aiOverview || "なし"}
上位サイト詳細: 
${searchContext}

## 回答フォーマット
JSON形式で回答してください。構成は以下の通り：
{
  "title": "レポートタイトル",
  "target": "ターゲット層の説明",
  "intent": "検索意図の説明",
  "keywords": "キーワード1, キーワード2...",
  "logic": "勝因のロジック（結論）",
  "content": "詳細な分析レポート（マークダウン形式）",
  "links": "参考にしたURLのリスト"
}
`;

    // モデル候補を定義（診断レポートで確認できたものを優先）
    const modelsToTry = [
        "gemini-flash-latest",
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
        "gemini-1.5-flash", // 一応残しておく
        "gemini-2.5-flash"  // レポートにあった最新版
    ];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
        try {
            console.log(`Trying model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(systemPrompt);
            const responseText = result.response.text();

            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return JSON.parse(responseText);
        } catch (error: any) {
            lastError = error;
            console.warn(`Model ${modelName} failed:`, error.message);
            // 404 (Not Found) の場合は次のモデルを試す
            if (error.status === 404 || error.message?.includes("not found")) {
                continue;
            }
            // 429 (Too Many Requests) の場合も次のモデルを試す
            if (error.status === 429) {
                continue;
            }
            break;
        }
    }

    console.error("All models failed:", lastError);
    throw new Error("AI分析中にエラーが発生しました。時間を置いて再度お試しください。");
}
