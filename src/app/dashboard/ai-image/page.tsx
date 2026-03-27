'use client';

import { useState, useEffect } from 'react';

export default function AIImagePage() {
  const [apiKey, setApiKey] = useState('');
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [width, setWidth] = useState('1024');
  const [height, setHeight] = useState('1024');
  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<{prompt: string; url: string; date: string}[]>([]);

  // Check for saved API key on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('stability_api_key');
    if (savedKey) {
      setHasApiKey(true);
    }
  }, []);

  const saveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('stability_api_key', apiKey.trim());
      setApiKeySaved(true);
      setHasApiKey(true);
      setTimeout(() => setApiKeySaved(false), 2000);
    }
  };

  const generateImage = async () => {
    if (!prompt.trim()) return;
    
    const savedKey = localStorage.getItem('stability_api_key');
    if (!savedKey && !apiKey) {
      setError('Please enter your Stability AI API key first');
      return;
    }
    const keyToUse = savedKey || apiKey;

    setGenerating(true);
    setError('');
    setImageUrl('');

    try {
      const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keyToUse}`,
        },
        body: JSON.stringify({
          text_prompts: [
            {
              text: prompt,
              weight: 1
            }
          ],
          cfg_scale: 7,
          height: parseInt(height),
          width: parseInt(width),
          steps: 30,
          samples: 1,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Generation failed');
      }

      const data = await response.json();
      
      // Stability returns base64 image
      const base64Image = data.artifacts[0].base64;
      const imageDataUrl = `data:image/png;base64,${base64Image}`;
      
      setImageUrl(imageDataUrl);
      setHistory([
        { prompt, url: imageDataUrl, date: new Date().toLocaleString() },
        ...history.slice(0, 9)
      ]);
      
    } catch (err: any) {
      setError(err.message || 'Failed to generate image');
    } finally {
      setGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!imageUrl) return;
    
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `ai-image-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">AI Image Generator</h1>
        <p className="text-[#9ca3af] text-sm">Generate images using Stability AI - bring your own API key</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Settings */}
        <div>
          {/* API Key Section */}
          <div className="card mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-xl">🔑</span>
              Stability AI API Key
            </h2>
            <p className="text-[#9ca3af] text-xs mb-4">
              Get your API key from{' '}
              <a 
                href="https://platform.stability.ai/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#1780e3] hover:underline"
              >
                platform.stability.ai
              </a>
              . Cost: $0.03/image
            </p>
            
            {hasApiKey ? (
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value="••••••••••••••••••••"
                  disabled
                  className="input flex-1 bg-[#374151]"
                />
                <button
                  onClick={() => {
                    localStorage.removeItem('stability_api_key');
                    setApiKey('');
                    setHasApiKey(false);
                  }}
                  className="btn btn-secondary text-xs"
                >
                  Clear
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="input flex-1"
                />
                <button
                  onClick={saveApiKey}
                  className="btn btn-primary"
                >
                  {apiKeySaved ? '✓ Saved' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {/* Generate Section */}
          <div className="card mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-xl">✨</span>
              Generate Image
            </h2>

            {/* Prompt */}
            <div className="mb-4">
              <label className="block text-sm text-[#9ca3af] mb-2">
                Describe your image
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A futuristic cityscape at sunset with flying cars..."
                className="input h-24 resize-none"
              />
            </div>

            {/* Size */}
            <div className="mb-4">
              <label className="block text-sm text-[#9ca3af] mb-2">
                Image Size
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { w: '512', h: '512', label: '512×512' },
                  { w: '1024', h: '1024', label: '1024×1024' },
                  { w: '1024', h: '576', label: '1024×576 (Landscape)' },
                  { w: '576', h: '1024', label: '576×1024 (Portrait)' },
                  { w: '768', h: '768', label: '768×768' },
                  { w: '1280', h: '720', label: '1280×720 (HD)' },
                ].map((size) => (
                  <button
                    key={size.label}
                    onClick={() => {
                      setWidth(size.w);
                      setHeight(size.h);
                    }}
                    className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                      width === size.w && height === size.h
                        ? 'bg-[#1780e3]/20 border-[#1780e3] text-white'
                        : 'bg-[#1f2937] border-[#374151] text-[#9ca3af] hover:border-[#1780e3]/50'
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={generateImage}
              disabled={generating || !prompt.trim()}
              className="btn btn-primary w-full"
              style={{ backgroundColor: generating ? '#374151' : '#22c55e' }}
            >
              {generating ? (
                <>
                  <span className="spinner mr-2" />
                  Generating... ($0.03)
                </>
              ) : (
                '✨ Generate Image'
              )}
            </button>

            {error && (
              <p className="text-[#ef4444] text-sm mt-3">{error}</p>
            )}

            <p className="text-[#6b7280] text-xs mt-3">
              Each generation costs $0.03 USD (deducted from your Stability AI account)
            </p>
          </div>
        </div>

        {/* Right Column - Preview & History */}
        <div>
          {/* Preview */}
          <div className="card mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-xl">🖼️</span>
              Preview
            </h2>
            
            <div className="bg-[#111827] rounded-lg aspect-square flex items-center justify-center overflow-hidden">
              {generating ? (
                <div className="text-center">
                  <div className="spinner w-8 h-8 mx-auto mb-2" />
                  <p className="text-[#9ca3af] text-sm">Creating...</p>
                </div>
              ) : imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt="Generated" 
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-center p-8">
                  <div className="text-4xl mb-2">🎨</div>
                  <p className="text-[#6b7280] text-sm">
                    Your generated image will appear here
                  </p>
                </div>
              )}
            </div>

            {imageUrl && (
              <button
                onClick={downloadImage}
                className="btn btn-secondary w-full mt-4"
              >
                ⬇️ Download Image
              </button>
            )}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-xl">📚</span>
                Recent Generations
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {history.map((item, index) => (
                  <div 
                    key={index}
                    className="bg-[#111827] rounded-lg overflow-hidden cursor-pointer hover:ring-2 ring-[#1780e3] transition-all"
                    onClick={() => setImageUrl(item.url)}
                  >
                    <img 
                      src={item.url} 
                      alt={item.prompt.slice(0, 30)} 
                      className="w-full aspect-square object-cover"
                    />
                    <div className="p-2">
                      <p className="text-[#9ca3af] text-xs truncate">{item.prompt}</p>
                      <p className="text-[#6b7280] text-[10px]">{item.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
