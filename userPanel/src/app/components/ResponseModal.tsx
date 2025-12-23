'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ResponseModalProps {
    isOpen: boolean;
    onClose: () => void;
    content: string;
    modelName: string;
    question: string;
}

export default function ResponseModal({ isOpen, onClose, content, modelName, question }: ResponseModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] !text-white flex items-center justify-center bg-black/80 md:bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-300">
            {/* Glass Container */}
            <div className="relative w-full !max-w-4xl !mx-4 max-h-[90vh] flex flex-col">
                <div className="relative !bg-white  shadow-2xl rounded-2xl overflow-hidden flex flex-col !max-h-full">

                    {/* Header */}
                    <div className="flex items-center justify-between !p-4 !border-b !border-gray-200 bg-black backdrop-blur-sm">
                        <h2 className="text-lg font-semibold text-white">
                            {modelName} Response
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-900 transition-colors p-2 rounded-full hover:bg-gray-100"
                        >
                            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="!p-6 overflow-y-auto custom-scrollbar">
                        {/* Question Section */}
                        <div className="mb-6 pb-6 border-b border-gray-100">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Question</h3>
                            <p className="text-gray-800 font-medium text-lg">{question}</p>
                        </div>

                        {/* Response Section */}
                        <div className="markdown-content">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Answer</h3>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {content}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
