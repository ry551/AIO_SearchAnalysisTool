import { Client } from "@notionhq/client";

if (!process.env.NOTION_TOKEN) {
  throw new Error("Missing NOTION_TOKEN environment variable");
}

export const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

export const DATABASE_ID = process.env.NOTION_DATABASE_ID;
