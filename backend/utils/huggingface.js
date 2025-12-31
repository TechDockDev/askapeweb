const HF_TOKEN = process.env.HF_ACCESS_TOKEN;
import dns from 'node:dns';

// Helper to resolve domain bypassing system resolver if needed
async function resolveDomain(domain) {
    try {
        // Try setting custom servers to bypass local issues
        dns.setServers(['8.8.8.8', '1.1.1.1']);
        const addresses = await dns.promises.resolve4(domain);
        if (addresses && addresses.length > 0) {
            return addresses[0];
        }
    } catch (e) {
        console.warn('Custom DNS resolution failed, falling back to system:', e.message);
    }
    return domain; // Fallpaack to domain if resolve fails or no address
}

export async function queryHuggingFaceChat(model, messages, options = {}) {
    const domain = 'router.huggingface.co';
    const ip = await resolveDomain(domain);
    const API_URL = `https://${ip}/v1/chat/completions`;

    const { maxTokens = 4000, temperature = 0.7 } = options;

    // Ensure messages is an array of {role, content}
    const chatMessages = Array.isArray(messages)
        ? messages
        : [{ role: 'user', content: messages }];

    let response;
    try {
        response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_TOKEN}`,
                'Content-Type': 'application/json',
                'Host': domain // Required when using IP in URL
            },
            body: JSON.stringify({
                model: model,
                messages: chatMessages,
                max_tokens: maxTokens,
                temperature: temperature,
                stream: false
            })
        });
    } catch (e) {
        console.error('Fetch failed details:', e);
        throw new Error(`Fetch failed: ${e.message}${e.cause ? ' - ' + e.cause : ''}`);
    }

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
        content: data.choices[0]?.message?.content || '',
        usage: data.usage || {}
    };
}

export async function queryHuggingFaceStream(model, messages, onChunk, options = {}) {
    const domain = 'router.huggingface.co';
    const ip = await resolveDomain(domain);
    const API_URL = `https://${ip}/v1/chat/completions`;

    const { maxTokens = 4000, temperature = 0.7 } = options;

    // Ensure messages is an array of {role, content}
    const chatMessages = Array.isArray(messages)
        ? messages
        : [{ role: 'user', content: messages }];

    let response;
    try {
        response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_TOKEN}`,
                'Content-Type': 'application/json',
                'Host': domain
            },
            body: JSON.stringify({
                model: model,
                messages: chatMessages,
                max_tokens: maxTokens,
                temperature: temperature,
                stream: true
            })
        });
    } catch (e) {
        console.error('Fetch failed details:', e);
        throw new Error(`Fetch failed: ${e.message}${e.cause ? ' - ' + e.cause : ''}`);
    }

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullResponse = '';

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            if (line.startsWith('data:')) {
                const dataStr = line.slice(5).trim();
                if (dataStr === '[DONE]') continue;

                try {
                    const data = JSON.parse(dataStr);
                    if (data.choices?.[0]?.delta?.content) {
                        const chunk = data.choices[0].delta.content;
                        fullResponse += chunk;
                        onChunk(chunk, fullResponse);
                    }
                } catch (e) { /* skip */ }
            }
        }
    }

    return fullResponse;
}
