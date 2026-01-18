export async function searchGoogle(query: string) {
    const response = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
            "X-API-KEY": process.env.SERPER_API_KEY || "",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            q: query,
            gl: "jp",
            hl: "ja",
            num: 10,
        }),
    });

    const data = await response.json();
    const organic = data.organic?.slice(0, 5).map((item: any) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
    })) || [];

    const aiOverview = data.answerBox?.snippet || data.knowledgeGraph?.description || null;

    return { organic, aiOverview };
}
