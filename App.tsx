import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { AspectRatio, AppState, GeneratedImage, SceneScript } from './types';
import { DEFAULT_KOL_NAME, STYLING_PROMPT, SCRIPT_PLANNING_PROMPT } from './constants';
import { ImageUpload } from './components/ImageUpload';
import { Button } from './components/Button';
import { generateFashionImage, generateStoryScript, generateSceneVideo } from './services/geminiService';

const App: React.FC = () => {
  const [apiKeySet, setApiKeySet] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [state, setState] = useState<AppState>({
    kolImage: null,
    kolImagePreview: null,
    productImages: [],
    productImagePreviews: [],
    productDescription: 'Áo phông nữ oversized nơ OKAY, họa tiết nơ nổi, may nhún tinh tế, chất cotton 100% siêu đẹp và thoải mái',
    aspectRatio: AspectRatio.RATIO_9_16,
    isStyling: false,
    styledImage: null,
    isGeneratingScript: false,
    script: [], 
    isGeneratingImages: false,
    generatedImages: [],
    error: null,
  });

  const [currentStatusText, setCurrentStatusText] = useState<string>('');

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
        setApiKeySet(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    try {
      if (window.aistudio) {
        await window.aistudio.openSelectKey();
        setApiKeySet(true);
      }
    } catch (e) {
      console.error("Key selection failed", e);
      setState(prev => ({ ...prev, error: "Lỗi chọn API Key. Vui lòng thử lại." }));
    }
  };

  const handleKolImageChange = (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      setState(prev => ({
        ...prev,
        kolImage: file,
        kolImagePreview: reader.result as string,
        styledImage: null, 
        script: [],
        generatedImages: []
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleProductImageChange = (files: File[]) => {
    const newFiles = [...state.productImages, ...files];
    const readers = files.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(previews => {
      setState(prev => ({
        ...prev,
        productImages: newFiles,
        productImagePreviews: [...prev.productImagePreviews, ...previews],
        styledImage: null,
        script: [],
        generatedImages: []
      }));
    });
  };

  const handleGenerateStyle = async () => {
    if (!state.kolImage || state.productImages.length === 0 || !apiKeySet) {
      setState(prev => ({ ...prev, error: "Vui lòng upload đầy đủ ảnh để bắt đầu." }));
      return;
    }
    setState(prev => ({ ...prev, isStyling: true, error: null }));
    try {
      const prompt = STYLING_PROMPT(DEFAULT_KOL_NAME, state.productDescription);
      const imageUrl = await generateFashionImage(prompt, state.kolImage, state.productImages, state.aspectRatio, null);
      setState(prev => ({ ...prev, styledImage: imageUrl }));
    } catch (err: any) {
      setState(prev => ({ ...prev, error: "Lỗi hệ thống: " + err.message }));
    } finally {
      setState(prev => ({ ...prev, isStyling: false }));
    }
  };

  const generateSingleScene = async (scene: SceneScript, isRegeneration = false, skipSetLoading = false) => {
    if (!state.styledImage) return;
    if (isRegeneration && !skipSetLoading) {
        setState(prev => ({
            ...prev,
            generatedImages: prev.generatedImages.map(img => img.id === scene.id ? { ...img, isLoading: true } : img)
        }));
    }
    try {
        const fullPrompt = `
        SCENE: ${scene.title}
        ACTION: ${scene.visualPrompt}
        
        STRICT CONSISTENCY RULES:
        1. ⛔️ FACE: EXACTLY the same as reference image. No variations.
        2. ✅ LOCATION: Stay in the SAME location as specified in the script.
        3. LIGHTING: Consistent soft natural light across all shots.
        `;
        
        const imageUrl = await generateFashionImage(fullPrompt, null, state.productImages, state.aspectRatio, state.styledImage);
        const newImage: GeneratedImage = {
            id: scene.id,
            url: imageUrl,
            prompt: fullPrompt,
            sceneName: scene.title,
            description: scene.description,
            isLoading: false,
            videoUrl: undefined 
        };

        setState(prev => {
            const existingIndex = prev.generatedImages.findIndex(img => img.id === scene.id);
            let newGeneratedImages = [...prev.generatedImages];
            if (existingIndex >= 0) newGeneratedImages[existingIndex] = newImage;
            else {
                newGeneratedImages.push(newImage);
                newGeneratedImages.sort((a, b) => prev.script.findIndex(s => s.id === a.id) - prev.script.findIndex(s => s.id === b.id));
            }
            return { ...prev, generatedImages: newGeneratedImages };
        });
    } catch (err: any) {
        console.error(err);
    }
  };

  const handleGenerateFullCampaign = async () => {
    if (!state.styledImage) return;
    setState(prev => ({ ...prev, isGeneratingScript: true, isGeneratingImages: true, generatedImages: [], error: null }));

    try {
      setCurrentStatusText('Đang lên kịch bản Cinematic...');
      const scriptPrompt = SCRIPT_PLANNING_PROMPT(state.productDescription);
      const dynamicScript = await generateStoryScript(scriptPrompt);
      
      const placeholders: GeneratedImage[] = dynamicScript.map(s => ({
          id: s.id,
          url: '',
          prompt: '',
          sceneName: s.title,
          description: s.description,
          isLoading: true
      }));

      setState(prev => ({ ...prev, script: dynamicScript, isGeneratingScript: false, generatedImages: placeholders }));
      setCurrentStatusText(`Đang xử lý ${dynamicScript.length} phân cảnh lifestyle...`);
      
      await Promise.all(dynamicScript.map(scene => generateSingleScene(scene, true, true)));

    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message }));
    } finally {
      setState(prev => ({ ...prev, isGeneratingScript: false, isGeneratingImages: false }));
      setCurrentStatusText('');
    }
  };

  const handleRegenerate = (sceneId: string) => {
      const scene = state.script.find(s => s.id === sceneId);
      if (scene) generateSingleScene(scene, true);
  };

  const handleGenerateVideo = async (sceneId: string) => {
    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
      await window.aistudio.openSelectKey();
    }
    const scene = state.generatedImages.find(img => img.id === sceneId);
    if (!scene || !scene.url) return;
    setState(prev => ({
      ...prev,
      generatedImages: prev.generatedImages.map(img => img.id === sceneId ? { ...img, isVideoLoading: true } : img)
    }));
    try {
      const videoUrl = await generateSceneVideo(scene.url, scene.description, state.aspectRatio);
      setState(prev => ({
        ...prev,
        generatedImages: prev.generatedImages.map(img => img.id === sceneId ? { ...img, videoUrl, isVideoLoading: false } : img)
      }));
    } catch (err: any) {
      console.error(err);
      setState(prev => ({
        ...prev,
        error: "Lỗi tạo video: " + err.message,
        generatedImages: prev.generatedImages.map(img => img.id === sceneId ? { ...img, isVideoLoading: false } : img)
      }));
    }
  };

  const handleGenerateAllVideos = async () => {
    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
      await window.aistudio.openSelectKey();
    }
    const eligibleScenes = state.generatedImages.filter(img => img.url && !img.isLoading && !img.isVideoLoading && !img.videoUrl);
    if (eligibleScenes.length === 0) return;
    await Promise.all(eligibleScenes.map(img => handleGenerateVideo(img.id)));
  };

  const downloadFile = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = async () => {
    setIsDownloadingAll(true);
    try {
      const zip = new JSZip();
      if (state.styledImage) {
        const response = await fetch(state.styledImage);
        const blob = await response.blob();
        zip.file("00_Reference_Look_ThongDH.png", blob);
      }
      for (let i = 0; i < state.generatedImages.length; i++) {
        const img = state.generatedImages[i];
        const prefix = (i + 1).toString().padStart(2, '0');
        if (img.url) {
          const res = await fetch(img.url);
          const blob = await res.blob();
          zip.file(`${prefix}_Scene_${img.id}_ThongDH.png`, blob);
        }
        if (img.videoUrl) {
          const res = await fetch(img.videoUrl);
          const blob = await res.blob();
          zip.file(`${prefix}_Video_${img.id}_ThongDH.mp4`, blob);
        }
      }
      const content = await zip.generateAsync({ type: "blob" });
      const zipUrl = URL.createObjectURL(content);
      downloadFile(zipUrl, "ThongDH_Studio_Campaign.zip");
      URL.revokeObjectURL(zipUrl);
    } catch (err: any) {
      setState(prev => ({ ...prev, error: "Lỗi đóng gói: " + err.message }));
    } finally {
      setIsDownloadingAll(false);
    }
  };

  if (!apiKeySet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950 p-6">
        <div className="max-w-md w-full text-center space-y-12">
          <div className="space-y-4">
            <h1 className="text-5xl font-serif text-white tracking-tighter">ThongDH<span className="text-bronze"> Studio</span></h1>
            <p className="text-stone-500 text-xs uppercase tracking-[0.3em]">Where AI meets High Fashion</p>
          </div>
          <Button onClick={handleSelectKey} className="w-full bg-white text-black hover:bg-stone-200 py-4">Kết nối Google AI Studio</Button>
          <div className="pt-8 border-t border-stone-800">
             <p className="text-[10px] text-stone-600 uppercase tracking-widest leading-relaxed">Được thiết kế cho các chiến dịch Affiliate chuyên nghiệp và Content Creator cao cấp.</p>
          </div>
        </div>
      </div>
    );
  }

  const isWorking = state.isGeneratingScript || state.isGeneratingImages;
  const isAnyVideoLoading = state.generatedImages.some(img => img.isVideoLoading);
  const canGenerateAllVideos = state.generatedImages.some(img => img.url && !img.videoUrl && !img.isVideoLoading);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-50 pb-20 selection:bg-stone-700">
      <header className="border-b border-stone-900 sticky top-0 glass z-50">
        <div className="max-w-[1400px] mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
             <span className="text-2xl font-serif text-white tracking-tighter">ThongDH<span className="text-bronze">.</span></span>
             <span className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-medium">Creative Studio</span>
          </div>
          <div className="flex items-center gap-6">
             <div className="hidden md:flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-widest text-stone-500">Project Status</span>
                <span className="text-[11px] text-stone-300 font-semibold">{isWorking ? 'Processing...' : 'Ready to create'}</span>
             </div>
             <div className="h-8 w-[1px] bg-stone-800"></div>
             <span className="text-[10px] uppercase tracking-widest text-stone-400 bg-stone-900 px-3 py-1.5 border border-stone-800">PRO EDITION</span>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* SIDEBAR: INPUTS */}
          <div className="lg:col-span-4 space-y-12">
            <section className="space-y-8">
              <div className="space-y-1">
                <h2 className="text-xs uppercase tracking-[0.4em] text-bronze font-bold">Phase 01</h2>
                <p className="text-2xl font-serif">Materials & Assets</p>
              </div>
              
              <div className="space-y-10">
                <ImageUpload label="KOL Portrait (Identity)" imagePreviews={state.kolImagePreview ? [state.kolImagePreview] : []} onImageChange={handleKolImageChange} required />
                <ImageUpload label="Product Reference (Multiple)" imagePreviews={state.productImagePreviews} onImageChange={handleProductImageChange} required multiple />
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-stone-400 font-bold">Product Intelligence</label>
                  </div>
                  <textarea 
                    className="w-full bg-stone-900/50 border border-stone-800 p-5 text-sm h-32 resize-none focus:border-stone-600 focus:outline-none transition-all placeholder:text-stone-700" 
                    placeholder="Describe the product vibe, fabric, and key selling points..."
                    value={state.productDescription} 
                    onChange={(e) => setState(prev => ({ ...prev, productDescription: e.target.value }))} 
                  />
                </div>
              </div>

              {state.error && (
                <div className="p-5 bg-red-950/20 text-red-400 text-[11px] border border-red-900/30 font-medium leading-relaxed">
                  <div className="flex gap-3">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    {state.error}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* MAIN CANVAS */}
          <div className="lg:col-span-8 space-y-20">
            
            {/* STEP 2: MASTER LOOK */}
            <section className="space-y-8">
                <div className="flex items-end justify-between border-b border-stone-900 pb-4">
                    <div className="space-y-1">
                      <h2 className="text-xs uppercase tracking-[0.4em] text-bronze font-bold">Phase 02</h2>
                      <p className="text-2xl font-serif">Master Style Selection</p>
                    </div>
                    <Button onClick={handleGenerateStyle} isLoading={state.isStyling} disabled={isWorking} variant="outline" className="text-[10px] h-10 border-stone-800 hover:border-bronze px-8">
                        {state.styledImage ? 'Regenerate Master' : 'Generate Master Style'}
                    </Button>
                </div>
                
                <div className="bg-stone-900/30 border border-stone-900 p-8 min-h-[400px] flex items-center justify-center relative overflow-hidden">
                    {!state.styledImage ? (
                         <div className="text-center max-w-sm space-y-4">
                            <div className="w-12 h-12 border border-stone-800 rounded-full flex items-center justify-center mx-auto mb-6">
                              <svg className="w-5 h-5 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth={1.5} /></svg>
                            </div>
                            <p className="text-stone-500 text-xs uppercase tracking-widest leading-relaxed">Establish the "Source of Truth" look. This image will define the face, outfit, and lighting for the entire campaign.</p>
                         </div>
                    ) : (
                        <div className="w-full flex flex-col md:flex-row gap-12 items-center">
                            <div className="w-full md:w-1/2 aspect-[9/16] relative bg-black shadow-2xl group">
                                <img src={state.styledImage} alt="Styled Look" className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-700" />
                                <div className="absolute inset-0 border-[20px] border-stone-950/20 pointer-events-none"></div>
                                <div className="absolute bottom-6 left-0 right-0 text-center">
                                    <span className="bg-stone-950/90 text-white text-[9px] px-4 py-2 uppercase tracking-[0.3em] font-bold border border-stone-800">Campaign Identity</span>
                                </div>
                            </div>
                            <div className="w-full md:w-1/2 flex flex-col justify-center space-y-8 py-6">
                                <div className="space-y-4">
                                  <h3 className="font-serif text-3xl italic">Launch Campaign</h3>
                                  <p className="text-stone-400 text-[13px] leading-relaxed">ThongDH AI will now generate a 6-scene storyboard in a single high-end location in Vietnam, ensuring perfect consistency with this master look.</p>
                                </div>
                                <div className="space-y-4 pt-4">
                                  <Button onClick={handleGenerateFullCampaign} isLoading={isWorking} className="w-full bg-bronze border-bronze text-white hover:bg-[#8c6a2a] py-4 rounded-sm shadow-xl shadow-bronze/10">
                                      {isWorking ? `Processing: ${currentStatusText}` : 'Export Cinematic Storyboard'}
                                  </Button>
                                  <p className="text-[10px] text-stone-600 text-center uppercase tracking-widest">Estimated time: 2-3 minutes for full render</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* STEP 3: ASSETS GRID */}
            {(state.generatedImages.length > 0 || isWorking) && (
            <section className="space-y-8">
                <div className="flex items-end justify-between border-b border-stone-900 pb-4">
                    <div className="space-y-1">
                      <h2 className="text-xs uppercase tracking-[0.4em] text-bronze font-bold">Phase 03</h2>
                      <p className="text-2xl font-serif">Cinematic Assets</p>
                    </div>
                    <div className="flex gap-3">
                        {canGenerateAllVideos && (
                            <Button 
                                onClick={handleGenerateAllVideos} 
                                isLoading={isAnyVideoLoading}
                                className="text-[10px] h-10 bg-white text-black hover:bg-stone-200 px-6 rounded-sm font-bold"
                            >
                                Animate All Scenes
                            </Button>
                        )}
                        {state.generatedImages.some(img => !img.isLoading) && (
                            <Button 
                                onClick={handleDownloadAll} 
                                variant="outline" 
                                isLoading={isDownloadingAll}
                                className="text-[10px] h-10 border-stone-800 text-stone-400 hover:text-white hover:border-stone-600 px-6 rounded-sm"
                            >
                                Download ZIP
                            </Button>
                        )}
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {state.generatedImages.map((img, idx) => (
                        <div key={img.id} className="group flex flex-col">
                             <div className="flex justify-between items-center mb-4">
                                <div className="flex flex-col">
                                   <span className="text-[9px] uppercase tracking-[0.2em] text-stone-600 font-bold">Scene {idx + 1}</span>
                                   <span className="text-[11px] font-serif text-stone-300 italic">{img.sceneName}</span>
                                </div>
                                <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-all">
                                  <button title="Regenerate Frame" onClick={() => handleRegenerate(img.id)} disabled={img.isLoading || img.isVideoLoading} className="text-stone-500 hover:text-bronze transition-colors">
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-3.5 h-3.5 ${img.isLoading ? 'animate-spin' : ''}`}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                      </svg>
                                  </button>
                                </div>
                             </div>

                             <div className="aspect-[9/16] bg-stone-900 relative overflow-hidden shadow-2xl transition-transform duration-500 group-hover:-translate-y-1">
                                {img.videoUrl ? (
                                  <video 
                                    src={img.videoUrl} 
                                    className="w-full h-full object-cover" 
                                    autoPlay 
                                    loop 
                                    muted 
                                    playsInline
                                  />
                                ) : (
                                  <div className="w-full h-full">
                                    {img.isLoading ? (
                                        <div className="absolute inset-0 flex items-center justify-center bg-stone-900/50">
                                          <div className="w-8 h-8 border border-bronze border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    ) : (
                                        <img src={img.url} className="w-full h-full object-cover grayscale-[0.1] group-hover:grayscale-0 transition-all duration-700" />
                                    )}
                                  </div>
                                )}
                                
                                {img.isVideoLoading && (
                                  <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center z-10">
                                    <div className="w-8 h-8 border border-bronze border-t-transparent rounded-full animate-spin mb-4"></div>
                                    <span className="text-[9px] uppercase tracking-[0.3em] text-bronze font-bold animate-pulse">Cinematic Rendering...</span>
                                  </div>
                                )}

                                <div className="absolute top-4 right-4 flex flex-col gap-2">
                                   {img.videoUrl && <span className="bg-bronze text-white text-[8px] px-2 py-1 uppercase tracking-widest font-bold shadow-lg">Motion</span>}
                                   <span className="bg-stone-950/80 text-stone-400 text-[8px] px-2 py-1 uppercase tracking-widest font-bold border border-stone-800">4K Render</span>
                                </div>
                             </div>
                             
                             <div className="py-5 space-y-5">
                                <p className="text-[11px] text-stone-500 leading-relaxed line-clamp-2 italic">"{img.description}"</p>
                                
                                <div className="grid grid-cols-1 gap-2">
                                   {!img.videoUrl ? (
                                     <button 
                                       onClick={() => handleGenerateVideo(img.id)}
                                       disabled={img.isLoading || img.isVideoLoading || !img.url}
                                       className="w-full text-[10px] py-3 uppercase tracking-widest bg-stone-900 text-stone-300 border border-stone-800 hover:border-bronze hover:text-white transition-all font-semibold disabled:opacity-30"
                                     >
                                       {img.isVideoLoading ? 'Rendering Video...' : 'Transform to Motion'}
                                     </button>
                                   ) : (
                                     <div className="flex gap-2">
                                       <button 
                                         onClick={() => downloadFile(img.videoUrl!, `${img.id}_ThongDH.mp4`)}
                                         className="flex-1 text-[10px] py-3 uppercase tracking-widest bg-white text-black font-bold hover:bg-stone-200 transition-all"
                                       >
                                         Get MP4
                                       </button>
                                       <button 
                                         title="Re-render Motion"
                                         onClick={() => handleGenerateVideo(img.id)}
                                         disabled={img.isVideoLoading}
                                         className="px-4 bg-stone-900 border border-stone-800 hover:border-stone-600 transition-all"
                                       >
                                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-4 h-4 text-stone-500 ${img.isVideoLoading ? 'animate-spin' : ''}`}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                         </svg>
                                       </button>
                                     </div>
                                   )}
                                   <button 
                                     onClick={() => downloadFile(img.url, `${img.id}_ThongDH.png`)}
                                     disabled={img.isLoading || img.isVideoLoading}
                                     className="w-full text-[9px] py-2 uppercase tracking-widest text-stone-600 hover:text-stone-300 transition-all font-medium disabled:opacity-0"
                                   >
                                     Download Still Frame (.png)
                                   </button>
                                </div>
                             </div>
                        </div>
                    ))}
                </div>
            </section>
            )}

          </div>
        </div>
      </main>

      <footer className="border-t border-stone-900 mt-20 py-12">
         <div className="max-w-[1400px] mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex flex-col items-center md:items-start gap-2">
               <span className="text-xl font-serif text-white tracking-tighter">ThongDH<span className="text-bronze">.</span> Studio</span>
               <span className="text-[9px] uppercase tracking-[0.3em] text-stone-600">The Future of Digital Fashion Identity</span>
            </div>
            <p className="text-[10px] text-stone-600 uppercase tracking-widest">© 2025 ThongDH Studio. Powered by Gemini 3.0 Pro & Veo 3.1</p>
         </div>
      </footer>
    </div>
  );
};

export default App;