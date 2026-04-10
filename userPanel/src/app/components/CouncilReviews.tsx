'use client';

import { useState } from 'react';

interface ReviewData {
    reviewer: string;
    reviewerName: string;
    reviewerLabel: string;
    rankings: string[];
    scores: { [label: string]: { accuracy: number; completeness: number; clarity: number } };
    strengths: { [label: string]: string };
    weaknesses: { [label: string]: string };
}

interface CouncilReviewsProps {
    reviews: ReviewData[];
}

const medals = ['🥇', '🥈', '🥉', '4th', '5th'];

export default function CouncilReviews({ reviews }: CouncilReviewsProps) {
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

    if (reviews.length === 0) return null;

    return (
        <div className="council-reviews-container">
            <div className="council-reviews-header">
                <span className="council-reviews-icon">🔍</span>
                <span>Peer Review Results</span>
            </div>
            <div className="council-reviews-grid">
                {reviews.map((review, idx) => {
                    const isExpanded = expandedIdx === idx;
                    return (
                        <div
                            key={idx}
                            className={`council-review-card ${isExpanded ? 'expanded' : ''}`}
                            onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                        >
                            <div className="council-review-card-header">
                                <div className="council-review-reviewer">
                                    <span className="council-review-dot" />
                                    <span className="council-review-name">{review.reviewerName}</span>
                                </div>
                                <svg
                                    className={`council-review-chevron ${isExpanded ? 'open' : ''}`}
                                    width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m6 9 6 6 6-6" />
                                </svg>
                            </div>

                            {/* Rankings */}
                            <div className="council-review-rankings">
                                {review.rankings.map((label, rIdx) => (
                                    <span key={rIdx} className="council-review-rank-badge">
                                        <span className="council-review-medal">{medals[rIdx] || `${rIdx + 1}`}</span>
                                        <span>{label}</span>
                                    </span>
                                ))}
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                                <div className="council-review-details">
                                    {/* Scores */}
                                    {review.scores && Object.entries(review.scores).map(([label, score]) => (
                                        <div key={label} className="council-review-score-block">
                                            <div className="council-review-score-label">{label}</div>
                                            <div className="council-review-score-bars">
                                                {['accuracy', 'completeness', 'clarity'].map(metric => (
                                                    <div key={metric} className="council-review-score-row">
                                                        <span className="council-review-metric">{metric}</span>
                                                        <div className="council-review-bar-bg">
                                                            <div
                                                                className="council-review-bar-fill"
                                                                style={{ width: `${((score as any)[metric] || 0) * 10}%` }}
                                                            />
                                                        </div>
                                                        <span className="council-review-score-val">{(score as any)[metric]}/10</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Strengths & Weaknesses */}
                                    <div className="council-review-chips">
                                        {review.strengths && Object.entries(review.strengths).map(([label, text]) => (
                                            <div key={`s-${label}`} className="council-chip strength">
                                                <span className="council-chip-label">✅ {label}</span>
                                                <span className="council-chip-text">{text}</span>
                                            </div>
                                        ))}
                                        {review.weaknesses && Object.entries(review.weaknesses).map(([label, text]) => (
                                            <div key={`w-${label}`} className="council-chip weakness">
                                                <span className="council-chip-label">⚠️ {label}</span>
                                                <span className="council-chip-text">{text}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
