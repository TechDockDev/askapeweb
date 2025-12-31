import https from 'node:https';
import dns from 'node:dns';

const HF_TOKEN = process.env.HF_ACCESS_TOKEN;

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

// Promisified HTTPS request helper
function httpsRequest(options, body) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            resolve(res);
        });
        req.on('error', (err) => {
            reject(err);
        });
        if (body) {
            req.write(body);
        }
        req.end();
    });
}

export async function queryHuggingFaceChat(model, messages, options = {}) {
    const domain = 'router.huggingface.co';
    const ip = await resolveDomain(domain);
    const path = '/v1/chat/completions';

    const { maxTokens = 4000, temperature = 0.7 } = options;

    const chatMessages = Array.isArray(messages)
        ? messages
        : [{ role: 'user', content: messages }];

    const body = JSON.stringify({
        model: model,
        messages: chatMessages,
        max_tokens: maxTokens,
        temperature: temperature,
        stream: false
    });

    const reqOptions = {
        hostname: ip,
        port: 443,
        path: path,
        method: 'POST',
        servername: domain, // Critical: Sets SNI for SSL handshake
        headers: {
            'Authorization': `Bearer ${HF_TOKEN}`,
            'Content-Type': 'application/json',
            'Host': domain // Required for HTTP routing
        }
    };

    try {
        const res = await httpsRequest(reqOptions, body);

        if (res.statusCode < 200 || res.statusCode >= 300) {
            let errorText = '';
            res.on('data', chunk => errorText += chunk);
            await new Promise(r => res.on('end', r));
            throw new Error(`API Error: ${res.statusCode} - ${errorText}`);
        }

        let dataStr = '';
        res.on('data', chunk => dataStr += chunk);
        await new Promise(r => res.on('end', r));

        const data = JSON.parse(dataStr);
        return {
            content: data.choices[0]?.message?.content || '',
            usage: data.usage || {}
        };

    } catch (e) {
        console.error('Request failed details:', e);
        throw new Error(`Request failed: ${e.message}${e.cause ? ' - ' + e.cause : ''}`);
    }
}

export async function queryHuggingFaceStream(model, messages, onChunk, options = {}) {
    const domain = 'router.huggingface.co';
    const ip = await resolveDomain(domain);
    const path = '/v1/chat/completions';

    const { maxTokens = 4000, temperature = 0.7 } = options;

    const chatMessages = Array.isArray(messages)
        ? messages
        : [{ role: 'user', content: messages }];

    const body = JSON.stringify({
        model: model,
        messages: chatMessages,
        max_tokens: maxTokens,
        temperature: temperature,
        stream: true
    });

    const reqOptions = {
        hostname: ip,
        port: 443,
        path: path,
        method: 'POST',
        servername: domain, // Critical: Sets SNI for SSL handshake
        headers: {
            'Authorization': `Bearer ${HF_TOKEN}`,
            'Content-Type': 'application/json',
            'Host': domain
        }
    };

    try {
        const res = await httpsRequest(reqOptions, body);

        if (res.statusCode < 200 || res.statusCode >= 300) {
            let errorText = '';
            res.on('data', chunk => errorText += chunk);
            await new Promise(r => res.on('end', r));
            throw new Error(`API Error: ${res.statusCode} - ${errorText}`);
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let fullResponse = '';

        return new Promise((resolve, reject) => {
            res.on('data', (chunk) => {
                buffer += decoder.decode(chunk, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data:')) {
                        const dataStr = line.slice(5).trim();
                        if (dataStr === '[DONE]') continue;

                        try {
                            const data = JSON.parse(dataStr);
                            if (data.choices?.[0]?.delta?.content) {
                                const chunkContent = data.choices[0].delta.content;
                                fullResponse += chunkContent;
                                onChunk(chunkContent, fullResponse);
                            }
                        } catch (e) { /* skip */ }
                    }
                }
            });

            res.on('end', () => {
                resolve(fullResponse);
            });

            res.on('error', (err) => {
                reject(err);
            });
        });

    } catch (e) {
        console.error('Request failed details:', e);
        throw new Error(`Request failed: ${e.message}${e.cause ? ' - ' + e.cause : ''}`);
    }
}
