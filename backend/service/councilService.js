import { COUNCIL_CONFIG } from '../config/councilConfig.js';
import { buildReviewPrompt, buildChairmanPrompt } from '../utils/councilPrompts.js';
import { queryHuggingFaceChat, queryHuggingFaceStream } from '../utils/huggingface.js';
import { estimateTokens } from '../utils/helpers.js';

const MOCK_MODE = process.env.MOCK_MODE === 'true';

// ─── Mock helpers ────────────────────────────────────────────────

function generateMockResponse(model, prompt) {
    const modelName = model.split('/').pop();
    return `This is a mock council response from **${modelName}**.\n\n### Key Points\n1. First insight about "${prompt.substring(0, 40)}..."\n2. Second relevant point\n3. Third consideration\n\n_Mock mode._`;
}

function generateMockReview(labels) {
    return {
        rankings: [...labels].reverse(),
        scores: Object.fromEntries(labels.map(l => [l, { accuracy: Math.ceil(Math.random() * 4) + 6, completeness: Math.ceil(Math.random() * 4) + 6, clarity: Math.ceil(Math.random() * 4) + 6 }])),
        strengths: Object.fromEntries(labels.map(l => [l, 'Clear and well-structured response with good examples.'])),
        weaknesses: Object.fromEntries(labels.map(l => [l, 'Could provide more depth on certain edge cases.']))
    };
}

function generateMockVerdict(query) {
    return `## Council Verdict\n\nAfter careful analysis of all perspectives, here is the synthesized answer:\n\nRegarding "${query.substring(0, 50)}...", the council has determined the following key points:\n\n1. **Primary Finding**: The consensus across all models indicates a strong agreement on the core answer.\n2. **Additional Context**: Several models highlighted important nuances that strengthen the response.\n3. **Conclusion**: This synthesized answer combines the best elements from all participating models.\n\n_This verdict was produced by the LLM Council._`;
}

// ─── Parse review JSON safely ────────────────────────────────────

function parseReviewResponse(text) {
    try {
        // Try direct parse first
        const parsed = JSON.parse(text.trim());
        return parsed;
    } catch {
        // Try to extract JSON from the text (model may wrap it in markdown fences)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch {
                // fallthrough
            }
        }
    }

    // Return a fallback structure
    return {
        rankings: [],
        scores: {},
        strengths: {},
        weaknesses: {},
        _parseError: true
    };
}

// ─── Main Council Pipeline ───────────────────────────────────────

/**
 * Runs the 3-stage LLM Council pipeline.
 *
 * @param {import('socket.io').Server} io - Socket.IO server
 * @param {string} sessionId - The session room to emit events to
 * @param {string} query - The user's original question
 * @param {string[]} models - Array of model IDs participating in the council
 * @param {string} chairmanModel - The model ID to use as chairman
 * @param {Array} conversationContext - Chat context messages array
 * @returns {Promise<{responses: object[], reviews: object[], finalAnswer: string}>}
 */
export async function runCouncilPipeline(io, sessionId, query, models, chairmanModel, conversationContext) {
    const labels = COUNCIL_CONFIG.anonymizeLabels.slice(0, models.length);

    // ══════════════════════════════════════════════════════════════
    //  STAGE 1: First Opinions — parallel model calls
    // ══════════════════════════════════════════════════════════════

    io.to(sessionId).emit('council:stage', { stage: 1, status: 'started' });

    const stage1Responses = []; // { modelId, label, content }

    const stage1Promises = models.map(async (modelId, idx) => {
        const label = labels[idx];
        const modelName = modelId.split('/').pop();

        try {
            let fullContent = '';

            if (MOCK_MODE) {
                const mockText = generateMockResponse(modelId, query);
                const chunkSize = 3;
                for (let i = 0; i < mockText.length; i += chunkSize) {
                    const chunk = mockText.substring(i, i + chunkSize);
                    fullContent += chunk;
                    io.to(sessionId).emit('council:token', {
                        stage: 1, modelId, modelName, chunk, fullContent
                    });
                    await new Promise(r => setTimeout(r, 15));
                }
            } else {
                await queryHuggingFaceStream(modelId, conversationContext, (chunk, full) => {
                    fullContent = full;
                    io.to(sessionId).emit('council:token', {
                        stage: 1, modelId, modelName,
                        chunk: full.slice(-chunk.length),
                        fullContent: full
                    });
                });
            }

            io.to(sessionId).emit('council:model_complete', { modelId, modelName, content: fullContent });

            stage1Responses.push({ modelId, label, content: fullContent });
            return { success: true, modelId, content: fullContent };
        } catch (error) {
            console.error(`Council Stage 1 error for ${modelId}:`, error.message);
            io.to(sessionId).emit('council:error', { stage: 1, modelId, error: error.message });
            return { success: false, modelId, error: error.message };
        }
    });

    await Promise.all(stage1Promises);

    // Need at least 2 successful responses to proceed with review
    if (stage1Responses.length < 2) {
        io.to(sessionId).emit('council:error', {
            stage: 1,
            error: `Only ${stage1Responses.length} model(s) responded. Need at least 2 for council review.`
        });
        io.to(sessionId).emit('council:stage', { stage: 1, status: 'completed' });
        // Still emit done with what we have
        io.to(sessionId).emit('council:done', {
            finalAnswer: stage1Responses[0]?.content || 'Council could not produce a verdict.',
            chairmanModel,
            reviews: []
        });
        return { responses: stage1Responses, reviews: [], finalAnswer: stage1Responses[0]?.content || '' };
    }

    io.to(sessionId).emit('council:stage', { stage: 1, status: 'completed' });

    // ══════════════════════════════════════════════════════════════
    //  STAGE 2: Peer Review — each model reviews the others
    // ══════════════════════════════════════════════════════════════

    io.to(sessionId).emit('council:stage', { stage: 2, status: 'started' });

    const reviews = []; // { reviewerModel, reviewerLabel, review }

    const stage2Promises = stage1Responses.map(async (responder) => {
        // This model reviews all OTHER responses
        const othersAnonymized = stage1Responses
            .filter(r => r.modelId !== responder.modelId)
            .map(r => ({ label: r.label, content: r.content }));

        const reviewPrompt = buildReviewPrompt(query, othersAnonymized);

        try {
            let reviewText = '';

            if (MOCK_MODE) {
                const otherLabels = othersAnonymized.map(r => r.label);
                const mockReview = generateMockReview(otherLabels);
                reviewText = JSON.stringify(mockReview);
                await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
            } else {
                const result = await queryHuggingFaceChat(responder.modelId, reviewPrompt, { maxTokens: 2000, temperature: 0.3 });
                reviewText = result.content;
            }

            const parsed = parseReviewResponse(reviewText);

            const reviewData = {
                reviewerModel: responder.modelId,
                reviewerLabel: responder.label,
                reviewerName: responder.modelId.split('/').pop(),
                review: parsed
            };

            reviews.push(reviewData);

            io.to(sessionId).emit('council:review', {
                reviewer: responder.modelId,
                reviewerName: responder.modelId.split('/').pop(),
                reviewerLabel: responder.label,
                rankings: parsed.rankings || [],
                scores: parsed.scores || {},
                strengths: parsed.strengths || {},
                weaknesses: parsed.weaknesses || {}
            });

        } catch (error) {
            console.error(`Council Stage 2 error for ${responder.modelId}:`, error.message);
            io.to(sessionId).emit('council:error', { stage: 2, modelId: responder.modelId, error: error.message });
        }
    });

    await Promise.all(stage2Promises);
    io.to(sessionId).emit('council:stage', { stage: 2, status: 'completed' });

    // ══════════════════════════════════════════════════════════════
    //  STAGE 3: Chairman Synthesis — stream the final answer
    // ══════════════════════════════════════════════════════════════

    io.to(sessionId).emit('council:stage', { stage: 3, status: 'started' });

    const chairmanPrompt = buildChairmanPrompt(
        query,
        stage1Responses.map(r => ({ label: r.label, modelId: r.modelId, content: r.content })),
        reviews.map(r => ({ reviewerLabel: r.reviewerLabel, review: r.review }))
    );

    let finalAnswer = '';

    try {
        if (MOCK_MODE) {
            const mockVerdict = generateMockVerdict(query);
            const chunkSize = 3;
            for (let i = 0; i < mockVerdict.length; i += chunkSize) {
                const chunk = mockVerdict.substring(i, i + chunkSize);
                finalAnswer += chunk;
                io.to(sessionId).emit('council:verdict_token', { chunk, fullContent: finalAnswer });
                await new Promise(r => setTimeout(r, 15));
            }
        } else {
            await queryHuggingFaceStream(chairmanModel, chairmanPrompt, (chunk, full) => {
                finalAnswer = full;
                io.to(sessionId).emit('council:verdict_token', {
                    chunk: full.slice(-chunk.length),
                    fullContent: full
                });
            }, { maxTokens: 4000, temperature: 0.5 });
        }
    } catch (error) {
        console.error('Council Stage 3 (Chairman) error:', error.message);
        io.to(sessionId).emit('council:error', { stage: 3, error: error.message });
        finalAnswer = 'The Chairman model failed to produce a synthesis. Please review the individual responses above.';
    }

    io.to(sessionId).emit('council:stage', { stage: 3, status: 'completed' });

    io.to(sessionId).emit('council:done', {
        finalAnswer,
        chairmanModel,
        reviews: reviews.map(r => ({
            reviewer: r.reviewerModel,
            reviewerName: r.reviewerName,
            rankings: r.review.rankings,
            scores: r.review.scores,
            strengths: r.review.strengths,
            weaknesses: r.review.weaknesses
        }))
    });

    return { responses: stage1Responses, reviews, finalAnswer };
}
