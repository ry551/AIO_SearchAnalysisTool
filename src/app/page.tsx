"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Loader2, Database, ChevronRight, CheckCircle2, Layout, BarChart3, Globe, Plus, Wrench, Mic, ChevronDown, Sparkles, Send, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const steps = [
    { id: "search", label: "上位サイトを取得中...", icon: Search },
    { id: "analyze", label: "中身を深掘り分析中...", icon: Layout },
    { id: "logic", label: "勝因のロジックを推論中...", icon: BarChart3 },
    { id: "notion", label: "Notionに書き込み中...", icon: Database },
];

export default function Home() {
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState<number | null>(null);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef<any>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Auto-expand textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            // Ensure minimum height of 60px for proper framing
            const nextHeight = Math.max(textarea.scrollHeight, 60);
            textarea.style.height = `${nextHeight}px`;
        }
    }, [prompt]);

    const handleAnalyze = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt || loading) return;

        setLoading(true);
        setResultUrl(null);
        setCurrentStep(0);

        // Create new AbortController
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            // Helper to handle aborted delays
            const delay = (ms: number) => new Promise((resolve, reject) => {
                const timer = setTimeout(resolve, ms);
                controller.signal.addEventListener("abort", () => {
                    clearTimeout(timer);
                    reject(new DOMException("Aborted", "AbortError"));
                }, { once: true });
            });

            // Step: Search
            await delay(1500);
            setCurrentStep(1);

            // Step: Scrape
            await delay(2000);
            setCurrentStep(2);

            // Step: Logic
            await delay(2000);
            setCurrentStep(3);

            const response = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt }),
                signal: controller.signal,
            });

            const data = await response.json();
            if (data.success) {
                setResultUrl(data.url);
            } else {
                if (data.error !== "The user aborted a request.") {
                    alert("分析に失敗しました: " + data.error);
                }
            }
        } catch (error: any) {
            if (error.name === "AbortError") {
                console.log("Analysis aborted by user");
            } else {
                console.error(error);
                alert("エラーが発生しました。");
            }
        } finally {
            setLoading(false);
            setCurrentStep(null);
            abortControllerRef.current = null;
        }
    };

    const handleCancel = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    const toggleSpeechRecognition = () => {
        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("お使いのブラウザは音声認識に対応していません。");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = "ja-JP";
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.onstart = () => {
            console.log("Speech recognition started");
            setIsRecording(true);
        };
        recognition.onend = () => {
            console.log("Speech recognition ended");
            setIsRecording(false);
        };
        recognition.onerror = (event: any) => {
            console.error("Speech Recognition Error:", event.error);
            setIsRecording(false);
            if (event.error === "not-allowed") {
                alert("マイクの使用が許可されていません。ブラウザの設定を確認してください。");
            }
        };

        recognition.onresult = (event: any) => {
            let interimTranscript = "";
            let finalTranscript = "";

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            if (finalTranscript) {
                setPrompt(prev => (prev ? `${prev} ${finalTranscript}` : finalTranscript));
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    return (
        <main className="w-full px-4 py-20 min-h-screen flex flex-col items-center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
            >
                <h1 className="text-5xl font-extrabold mb-4 premium-gradient-text tracking-tight">
                    AIO & Search Analysis Agent
                </h1>

            </motion.div>

            <div className="w-full max-w-5xl flex flex-col px-4">
                <div
                    className="w-full gemini-container shadow-2xl flex flex-col cursor-text overflow-hidden"
                    onClick={() => textareaRef.current?.focus()}
                >
                    {/* 親div：w-full を指定し、flex-1 で高さを確保 */}
                    <div className="w-full flex-1 flex flex-col">
                        {/* form：ここにも w-full が必須です */}
                        <form onSubmit={handleAnalyze} className="w-full flex-1 flex flex-col">
                            <textarea
                                ref={textareaRef}
                                /* whitespace系を削除し、px-8 で左右にしっかり余裕を持たせる */
                                className="w-full bg-transparent flex-1 text-lg placeholder:text-gray-500 leading-relaxed px-8 py-8 m-0 focus:outline-none resize-none break-words"
                                style={{
                                    color: "var(--antigravity-text)",
                                    minHeight: "80px",
                                    width: "100%", // インラインでも幅を強制
                                }}
                                placeholder="リサーチしたいKWを入力してください"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                disabled={loading}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleAnalyze(e);
                                    }
                                }}
                            />
                        </form>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 mt-4 px-2">
                    <AnimatePresence>
                        {loading && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                onClick={handleCancel}
                                type="button"
                                className="p-2 rounded-full hover:bg-red-500/10 transition-colors text-red-400 bg-transparent flex items-center gap-1.5 text-sm font-medium pr-3"
                            >
                                <XCircle className="w-6 h-6" />
                                <span>中止</span>
                            </motion.button>
                        )}
                    </AnimatePresence>

                    {!loading && (
                        <button
                            type="button"
                            onClick={toggleSpeechRecognition}
                            className={cn(
                                "p-2 rounded-full transition-all relative z-10",
                                isRecording ? "text-red-500 ring-4 ring-red-500/20" : "text-gray-400 hover:bg-white/10"
                            )}
                        >
                            <Mic className={cn("w-6 h-6", isRecording && "animate-pulse")} />
                            {isRecording && (
                                <>
                                    <motion.div
                                        initial={{ scale: 1, opacity: 0.6 }}
                                        animate={{ scale: 2, opacity: 0 }}
                                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                                        className="absolute inset-0 rounded-full bg-red-500 -z-10"
                                    />
                                    <motion.div
                                        initial={{ scale: 1, opacity: 0.3 }}
                                        animate={{ scale: 2.5, opacity: 0 }}
                                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut", delay: 0.5 }}
                                        className="absolute inset-0 rounded-full bg-red-500 -z-10"
                                    />
                                </>
                            )}
                        </button>
                    )}

                    {!loading && (
                        <button
                            onClick={handleAnalyze}
                            disabled={!prompt}
                            className={cn(
                                "p-2.5 rounded-full transition-all flex items-center justify-center bg-transparent",
                                !prompt
                                    ? "text-gray-600 cursor-not-allowed"
                                    : "text-white hover:bg-white/10"
                            )}
                        >
                            <Send className="w-6 h-6" />
                        </button>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {loading && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-12 space-y-4 pt-8 border-t border-white/5"
                    >
                        {steps.map((step, index) => {
                            const isCompleted = index < (currentStep ?? 0);
                            const isActive = index === currentStep;

                            return (
                                <div
                                    key={step.id}
                                    className={cn(
                                        "flex items-center gap-4 transition-opacity",
                                        isCompleted ? "opacity-100" : isActive ? "opacity-100" : "opacity-30"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center border transition-all",
                                            isCompleted
                                                ? "bg-green-500/20 border-green-500 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                                                : isActive
                                                    ? "bg-purple-500/20 border-purple-500 text-purple-500 animate-pulse shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                                                    : "bg-white/5 border-white/10 text-white"
                                        )}
                                    >
                                        {isCompleted ? (
                                            <CheckCircle2 className="w-5 h-5" />
                                        ) : (
                                            <step.icon className="w-5 h-5" />
                                        )}
                                    </div>
                                    <span className={cn("font-medium", isActive && "text-purple-400")}>
                                        {step.label}
                                    </span>
                                    {isActive && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
                                    )}
                                </div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {resultUrl && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 pt-8 border-t border-white/10 text-center"
                    >
                        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6">
                            <p className="text-green-400 font-bold text-xl mb-4 flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-6 h-6" />
                                分析が完了しました！
                            </p>
                            <a
                                href={resultUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors"
                            >
                                <Database className="w-5 h-5" />
                                Notionでレポートを確認する
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <footer className="mt-20 text-gray-500 text-sm">
                &copy; 2026 AIO & Search Analysis Agent. Powering deep insights with AI.
            </footer>
        </main >
    );
}
