const HF_TOKEN = process.env.HF_ACCESS_TOKEN;

export async function queryHuggingFaceChat(model, messages, options = {}) {
    const API_URL = 'https://router.huggingface.co/v1/chat/completions';
    const { maxTokens = 1000, temperature = 0.7 } = options;

    // Ensure messages is an array of {role, content}
    const chatMessages = Array.isArray(messages)
        ? messages
        : [{ role: 'user', content: messages }];

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${HF_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: model,
            messages: chatMessages,
            max_tokens: maxTokens,
            temperature: temperature,
            stream: false
        })
    });

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
    const API_URL = 'https://router.huggingface.co/v1/chat/completions';
    const { maxTokens = 1000, temperature = 0.7 } = options;

    // Ensure messages is an array of {role, content}
    const chatMessages = Array.isArray(messages)
        ? messages
        : [{ role: 'user', content: messages }];

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${HF_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: model,
            messages: chatMessages,
            max_tokens: maxTokens,
            temperature: temperature,
            stream: true
        })
    });

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
