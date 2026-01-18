import * as cheerio from "cheerio";

export async function scrapeUrl(url: string) {
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            },
        });
        const html = await response.text();
        const $ = cheerio.load(html);

        // 不要なタグを削除
        $("script, style, nav, footer, iframe, noscript").remove();

        // メインコンテンツと思われる部分からテキストを抽出
        // 簡易的に body の中身を整形して取得
        const text = $("body").text().replace(/\s+/g, " ").trim();

        return text.slice(0, 5000); // LLMのトークン制限を考慮して5000文字程度に制限
    } catch (error) {
        console.error(`Scraping error for ${url}:`, error);
        return null;
    }
}
