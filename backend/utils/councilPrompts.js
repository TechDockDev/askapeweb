import { COUNCIL_CONFIG } from '../config/councilConfig.js';

/**
 * Build the peer-review prompt for a model.
 * The reviewing model sees anonymized responses and is asked to rank and critique them.
 *
 * @param {string} query - The original user question
 * @param {Array<{label: string, content: string}>} anonymizedResponses - Other models' responses with anonymized labels
 * @returns {string} The review prompt
 */
export function buildReviewPrompt(query, anonymizedResponses) {
    const responsesBlock = anonymizedResponses
        .map(r => `### ${r.label}\n${r.content}`)
        .join('\n\n---\n\n');

    return `You are a critical AI reviewer participating in a peer-review council. Multiple AI models have independently answered the same question. Your job is to evaluate and rank their responses.

## Original Question
"${query}"

## Responses to Review

${responsesBlock}

## Your Task

Analyze each response carefully and provide your evaluation in the following JSON format ONLY. Do not include any text before or after the JSON:

{
  "rankings": ["${anonymizedResponses.map(r => r.label).join('", "')}"],
  "scores": {
${anonymizedResponses.map(r => `    "${r.label}": { "accuracy": 0, "completeness": 0, "clarity": 0 }`).join(',\n')}
  },
  "strengths": {
${anonymizedResponses.map(r => `    "${r.label}": "brief strength"`).join(',\n')}
  },
  "weaknesses": {
${anonymizedResponses.map(r => `    "${r.label}": "brief weakness"`).join(',\n')}
  }
}

Rules:
- "rankings" must be ordered from BEST to WORST
- Each score is 1-10 (accuracy, completeness, clarity)
- Keep strengths/weaknesses to 1-2 sentences each
- Respond ONLY with valid JSON, no markdown fences, no explanation`;
}

/**
 * Build the chairman synthesis prompt.
 * The chairman sees all original responses and all peer reviews, then produces the definitive answer.
 *
 * @param {string} query - The original user question
 * @param {Array<{label: string, modelId: string, content: string}>} responses - All model responses
 * @param {Array<{reviewerLabel: string, review: object}>} reviews - All peer reviews
 * @returns {string} The chairman synthesis prompt
 */
export function buildChairmanPrompt(query, responses, reviews) {
    const responsesBlock = responses
        .map(r => `### ${r.label} (${r.modelId.split('/').pop()})\n${r.content}`)
        .join('\n\n---\n\n');

    const reviewsBlock = reviews
        .map(r => {
            const review = r.review;
            return `### Review by ${r.reviewerLabel}
**Rankings:** ${review.rankings?.join(' > ') || 'N/A'}
**Scores:** ${JSON.stringify(review.scores || {})}
**Strengths:** ${JSON.stringify(review.strengths || {})}
**Weaknesses:** ${JSON.stringify(review.weaknesses || {})}`;
        })
        .join('\n\n');

    return `You are the Chairman of the LLM Council. You have received responses from multiple AI models and their peer reviews. Your task is to synthesize the **best possible final answer** by combining the strongest elements from all responses while correcting any errors identified in the peer reviews.

## Original Question
"${query}"

## Model Responses

${responsesBlock}

## Peer Reviews

${reviewsBlock}

## Your Task

Produce a comprehensive, accurate, and well-reasoned final answer to the original question. Follow these guidelines:

1. **Incorporate the best insights** from the highest-ranked responses
2. **Correct any errors** identified in the peer reviews
3. **Fill gaps** where one model's response complements another
4. **Be concise but thorough** — don't pad the answer unnecessarily
5. **Do NOT mention** the council process, models, reviews, or rankings in your answer
6. Write as if you are directly answering the user's question

Provide your answer now:`;
}
