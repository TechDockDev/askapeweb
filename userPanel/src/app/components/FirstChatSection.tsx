import SuggestionCard from './SuggestionCard';

interface FirstChatSectionProps {
    userName?: string;
    prompt: string;
    setPrompt: (prompt: string) => void;
    handleTextareaInput: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onSend: () => void;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export default function FirstChatSection({
    userName = 'Guest',
    prompt,
    setPrompt,
    handleTextareaInput,
    handleKeyDown,
    onSend,
    textareaRef,
}: FirstChatSectionProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center max-w-[1000px] mx-auto">
            <h1 className="text-6xl font-semibold !text-black !mb-2">
                Hello, {userName.split(' ')[0]}
            </h1>
            <p className="text-4xl font-light text-gray-400 !mb-2">
                Let&apos;s make your research easier.
            </p>
            <p className="text-sm text-gray-400 !mb-6">
                Your personal AI assistant for documents, research, and knowledge.
            </p>

            <div className="relative w-full max-w-[800px] bg-white !rounded-[20px] !p-1 flex items-start shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-shadow group focus-within:ring-2 focus-within:ring-gray-100 !mb-4">
                <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={handleTextareaInput}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Anything..."
                    className="flex-1 bg-white border-none outline-none bg-transparent text-lg !p-2 !px-4 !text-[#1a1a2e] min-h-[50px] resize-none placeholder-gray-400/60"
                    rows={1}
                />
                <div className="flex items-center !gap-2 self-end !mr-3 !mb-2">
                    <button
                        onClick={onSend}
                        className="bg-black text-white p-2 rounded-full hover:opacity-80 transition-opacity"
                        aria-label="Send"
                    >
                        <svg width="30" height="30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-[900px]">
                <SuggestionCard
                    title="Legal Insights"
                    description="Explore the latest updates and key discussions on legal topics today."
                    icon={
                        <svg
                            width="20"
                            height="20"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                            />
                        </svg>
                    }
                    onClick={() => {
                        setPrompt('What are the latest legal insights regarding AI?');
                        if (textareaRef.current) textareaRef.current.focus();
                    }}
                />
                <SuggestionCard
                    title="Global Justice"
                    description="Discover important trends and changes shaping international law."
                    icon={
                        <svg
                            width="20"
                            height="20"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                        </svg>
                    }
                    onClick={() => {
                        setPrompt('Explain current global justice trends.');
                        if (textareaRef.current) textareaRef.current.focus();
                    }}
                />
                <SuggestionCard
                    title="Modern Law & Tech"
                    description="Explore the latest updates and key discussions on legal topics today."
                    icon={
                        <svg
                            width="20"
                            height="20"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                            />
                        </svg>
                    }
                    onClick={() => {
                        setPrompt('Discuss modern law and technology.');
                        if (textareaRef.current) textareaRef.current.focus();
                    }}
                />
            </div>
        </div>
    );
}
