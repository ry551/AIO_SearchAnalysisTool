import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "AIO & Search Top Results Analysis Agent",
    description: "Advanced search analysis and Notion integration agent",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ja">
            <body>{children}</body>
        </html>
    );
}
