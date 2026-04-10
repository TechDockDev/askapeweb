export const COUNCIL_CONFIG = {
    // The default chairman model — used if none is specified
    defaultChairmanModel: 'deepseek-ai/DeepSeek-V3',

    // Council size limits
    maxCouncilModels: 5,
    minCouncilModels: 2,

    // Timeouts for each stage (ms)
    reviewTimeout: 60000,    // 60s per review
    synthesisTimeout: 60000, // 60s for chairman synthesis

    // Labels used to anonymize responses during peer review
    anonymizeLabels: ['Response A', 'Response B', 'Response C', 'Response D', 'Response E']
};
