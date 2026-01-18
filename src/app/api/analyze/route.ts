import { NextResponse } from "next/server";
import { notion, DATABASE_ID } from "@/lib/notion";
import { searchGoogle } from "@/lib/search";
import { scrapeUrl } from "@/lib/scraper";
import { analyzeContent } from "@/lib/analyzer";

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        // 1. Google 検索実行 (Serper.dev)
        console.log(`Starting search for: ${prompt}`);
        const { organic, aiOverview } = await searchGoogle(prompt);

        // 2. 上位サイトのスクレイピング
        console.log(`Scraping top ${organic.length} sites...`);
        const searchResultsWithContent = await Promise.all(
            organic.map(async (item: any) => {
                const content = await scrapeUrl(item.link);
                return { ...item, content };
            })
        );

        // 3. Gemini による深掘り分析
        if (req.signal.aborted) throw new Error("AbortError");
        console.log("Analyzing content with Gemini...");
        const analysisReport = await analyzeContent(prompt, searchResultsWithContent, aiOverview);

        // 4. Notion 格納
        if (req.signal.aborted) throw new Error("AbortError");
        if (!DATABASE_ID) {
            return NextResponse.json({ error: "DATABASE_ID is not configured" }, { status: 500 });
        }

        console.log("Saving report to Notion...");
        const response = await notion.pages.create({
            parent: { database_id: DATABASE_ID },
            properties: {
                "タイトル": {
                    title: [
                        {
                            text: {
                                content: analysisReport.title,
                            },
                        },
                    ],
                },
                "ターゲット層": {
                    rich_text: [
                        {
                            text: {
                                content: analysisReport.target,
                            },
                        },
                    ],
                },
                "検索意図": {
                    rich_text: [
                        {
                            text: {
                                content: analysisReport.intent,
                            },
                        },
                    ],
                },
                "重要キーワード": {
                    rich_text: [
                        {
                            text: {
                                content: analysisReport.keywords,
                            },
                        },
                    ],
                },
                "参考URL": {
                    rich_text: [
                        {
                            text: {
                                content: organic.map((r: any) => r.link).join("\n"),
                            },
                        },
                    ],
                },
            },
            children: [
                {
                    object: "block",
                    type: "heading_1",
                    heading_1: {
                        rich_text: [{ type: "text", text: { content: "詳細分析レポート" } }],
                    },
                },
                {
                    object: "block",
                    type: "paragraph",
                    paragraph: {
                        rich_text: [
                            {
                                type: "text",
                                text: {
                                    content: analysisReport.content,
                                },
                            },
                        ],
                    },
                },
                {
                    object: "block",
                    type: "heading_2",
                    heading_2: {
                        rich_text: [{ type: "text", text: { content: "勝因のロジック" } }],
                    },
                },
                {
                    object: "block",
                    type: "paragraph",
                    paragraph: {
                        rich_text: [
                            {
                                type: "text",
                                text: {
                                    content: analysisReport.logic,
                                },
                            },
                        ],
                    },
                },
            ],
        });

        return NextResponse.json({ success: true, url: (response as any).url });
    } catch (error: any) {
        console.error("Analysis Error:", error);

        // Notion-specific error handling
        if (error.code === "object_not_found") {
            return NextResponse.json({
                error: "Notionデータベースが見つかりません。データベースIDが正しいか、インテグレーションがデータベースに招待されているか確認してください。"
            }, { status: 500 });
        }

        if (error.message === "AbortError") {
            console.log("Backend: Request aborted by client.");
            return new Response(null, { status: 499 }); // Client Closed Request
        }

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

