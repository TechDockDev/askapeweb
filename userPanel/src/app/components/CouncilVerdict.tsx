'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface CouncilVerdictProps {
    content: string;
    chairmanModel: string;
    isStreaming: boolean;
}

export default function CouncilVerdict({ content, chairmanModel, isStreaming }: CouncilVerdictProps) {
    if (!content && !isStreaming) return null;

    const chairmanName = chairmanModel?.split('/').pop() || 'Chairman';

    return (
        <div className="council-verdict-card">
            <div className="council-verdict-header">
                <div className="council-verdict-title">
                    <span className="council-verdict-gavel">⚖️</span>
                    <span>Council Verdict</span>
                </div>
                <div className="council-verdict-badge">
                    <span className={`status-dot ${isStreaming ? 'active' : 'done'}`} />
                    <span className="council-verdict-chairman">Chairman: {chairmanName}</span>
                </div>
            </div>
            <div className="council-verdict-content">
                {content ? (
                    <div className="markdown-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {content}
                        </ReactMarkdown>
                    </div>
                ) : (
                    <div className="typing-indicator">
                        <span></span><span></span><span></span>
                    </div>
                )}
            </div>
        </div>
    );
}
