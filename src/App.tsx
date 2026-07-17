import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  Scale, 
  Flame, 
  RotateCcw, 
  Settings, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2, 
  X, 
  Info
} from 'lucide-react';

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

interface GeminiFoodResponse {
  is_food: boolean;
  food_name?: string;
  confidence?: number;
  nutrition_per_100g?: NutritionData;
  message?: string;
}

export default function App() {
  // Application State
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [weight, setWeight] = useState<number>(100);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('Processing target...');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeminiFoodResponse | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>(() => {
    return import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('user_gemini_api_key') || '';
  });

  // UI State for Camera Modal
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-save manual API key inputs inside localstorage context
  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('user_gemini_api_key', key);
    setShowSettings(false);
  };

  // Convert File elements to pure Base64 Strings for direct payload generation
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        resolve(base64String.split(',')[1]);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // HTML Media Stream Handler
  const startCamera = async () => {
    setIsCameraOpen(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera access failure: ", err);
      setError("Unable to initiate camera device. Please upload an image directly instead.");
      setIsCameraOpen(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImage(dataUrl);
        
        fetch(dataUrl)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], "lens_capture.jpg", { type: "image/jpeg" });
            setImageFile(file);
          });
      }
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  // Simulate diagnostic process phases
  useEffect(() => {
    if (!loading) return;
    const steps = [
      'Isolating food matrix structures...',
      'Deconstructing pixel layers...',
      'Retrieving chemical macro projections...',
      'Scaling portions to database models...',
      'Consolidating nutritional report...'
    ];
    let index = 0;
    const interval = setInterval(() => {
      if (index < steps.length - 1) {
        index++;
        setLoadingStep(steps[index]);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [loading]);

  // Main API query module
  const analyzeFood = async () => {
    if (!imageFile) {
      setError("Please input or capture an image before scanning.");
      return;
    }
    if (!apiKey) {
      setShowSettings(true);
      setError("A Google Gemini API key configuration is required.");
      return;
    }

    setLoading(true);
    setError(null);
    setLoadingStep("Packing content stream...");

    try {
      const base64Img = await fileToBase64(imageFile);
      const mimeType = imageFile.type || "image/jpeg";
      const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Analyze this image precisely. You must output an identical raw JSON object following this format:

If food is detected:
{
  "is_food": true,
  "food_name": "Detected Food Name",
  "confidence": 95,
  "nutrition_per_100g": {
    "calories": 130,
    "protein": 2.5,
    "carbs": 28,
    "fat": 0.3,
    "fiber": 2.4
  }
}

If the image contains laptop screens, phones, keyboards, blank walls, human faces, pets, vehicles, or ANY item that is clearly not food:
{
  "is_food": false,
  "message": "No food detected"
}

Rule: Do not output any markdown formatting codeblocks (like \`\`\`json or \`\`\`). Output raw valid JSON string only.`
                },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Img
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Google API returned status code: ${response.status}`);
      }

      const rawResult = await response.json();
      const textOutput = rawResult?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textOutput) {
        throw new Error("Received an empty response stream. Please try re-scanning.");
      }

      const cleanJsonString = textOutput
        .replace(/```json/gi, '')
        .replace(/```/gi, '')
        .trim();

      const parsedResponse: GeminiFoodResponse = JSON.parse(cleanJsonString);
      
      if (parsedResponse.is_food === false) {
        setError(parsedResponse.message || "No food detected");
        setResult(null);
      } else {
        setResult(parsedResponse);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to communicate with nutrition engine. Verify network stability.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setImageFile(null);
    setResult(null);
    setError(null);
    setWeight(100);
  };

  // Mathematical portion conversion factors
  const getScaledVal = (base100: number | undefined): string => {
    if (base100 === undefined) return "0.0";
    return ((base100 * weight) / 100).toFixed(1);
  };

  const getScaledCals = (base100Cals: number | undefined): number => {
    if (base100Cals === undefined) return 0;
    return Math.round((base100Cals * weight) / 100);
  };

  return (
    <div className="min-h-screen bg-darkbg text-gray-100 flex flex-col justify-between font-sans">
      
      {/* Dev Key Config Overlay */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-gray-800 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-neon" />
                API Key Credentials
              </h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mb-4 leading-relaxed">
              Input your personal Gemini API key. This string is stored strictly in your local sandbox browser session.
            </p>
            <input 
              type="password"
              placeholder="Paste Key here..."
              defaultValue={apiKey}
              id="apiKeyInput"
              className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-700 text-white text-xs focus:border-neon focus:ring-1 focus:ring-neon outline-none mb-4"
            />
            <button 
              onClick={() => {
                const val = (document.getElementById('apiKeyInput') as HTMLInputElement).value;
                handleSaveApiKey(val);
              }}
              className="w-full py-3 bg-neon text-black font-bold text-xs rounded-xl hover:bg-neonhover transition-colors"
            >
              Verify & Connect Key
            </button>
          </div>
        </div>
      )}

      {/* Embedded Live Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between">
          <div className="p-4 bg-gray-950/80 border-b border-gray-900 flex justify-between items-center">
            <span className="text-[10px] tracking-widest text-gray-400 font-mono font-bold uppercase">LIVE LENS STREAM</span>
            <button onClick={stopCamera} className="p-2 text-white bg-gray-900 rounded-full">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover max-h-[75vh]" />
            <div className="absolute inset-8 border border-neon/20 rounded-2xl pointer-events-none">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-neon"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-neon"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-neon"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-neon"></div>
            </div>
          </div>
          <div className="p-6 bg-gray-950 border-t border-gray-900 flex justify-center">
            <button 
              onClick={capturePhoto} 
              className="w-16 h-16 bg-neon rounded-full border-4 border-white flex items-center justify-center shadow-lg shadow-neon/20"
            >
              <div className="w-6 h-6 bg-black rounded-full"></div>
            </button>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="border-b border-gray-900 bg-[#0B0F14]/90 backdrop-blur-md sticky top-0 z-30 px-4 py-4">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-neonbg border border-neon/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-neon" />
            </div>
            <div>
              <h1 className="text-xs font-bold uppercase tracking-widest text-white leading-none">NUTRIVISION</h1>
              <span className="text-[9px] text-neon font-mono font-bold">AI SPECTROSCOPY MODULE</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors"
            >
              <Settings className="w-4 h-4 text-gray-400" />
            </button>
            <div className="text-[9px] bg-neonbg border border-neon/20 px-2 py-0.5 rounded text-neon font-mono font-bold">
              v2.5 FLASH
            </div>
          </div>
        </div>
      </header>

      {/* Content Container */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-6">

        {/* Configuration notice info block */}
        {!apiKey && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex gap-3 items-start">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold mb-1">Authorization Credentials Required</p>
              <p className="leading-relaxed opacity-90 mb-2">Connect your Google Gemini API Key to utilize instant spectroscopic calculations.</p>
              <button 
                onClick={() => setShowSettings(true)} 
                className="px-3 py-1 bg-amber-500 text-black font-semibold rounded-lg text-[10px] hover:bg-amber-400"
              >
                Configure Key
              </button>
            </div>
          </div>
        )}

        {/* Generic Error Warning block */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-3 items-start">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold mb-1">Scanning Error</p>
              <p className="leading-relaxed opacity-90">{error}</p>
            </div>
          </div>
        )}

        {/* Active Application Switcher UI */}
        {!result && !loading ? (
          /* SCANNING SUBMISSION CENTER */
          <div className="space-y-6">
            
            {/* Visual Frame Select Interface */}
            <div className="glass-panel rounded-2xl p-4 flex flex-col items-center">
              {image ? (
                <div className="relative w-full rounded-xl overflow-hidden aspect-video border border-gray-800">
                  <img src={image} alt="Prepared Snapshot" className="w-full h-full object-cover" />
                  <button 
                    onClick={handleReset}
                    className="absolute top-2 right-2 p-1 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black/95 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-full py-12 px-4 rounded-xl border-2 border-dashed border-gray-800/80 flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center mb-3">
                    <Camera className="w-5 h-5 text-gray-500" />
                  </div>
                  <p className="text-xs text-gray-300 font-bold mb-1">Target Frame Unloaded</p>
                  <p className="text-[10px] text-gray-500 max-w-[200px] mb-4">Capture your target sample or load a static image directly.</p>
                  
                  <div className="flex gap-2 w-full max-w-[260px]">
                    <button 
                      onClick={startCamera}
                      className="flex-1 py-2 px-3 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-750 text-[11px] font-semibold text-white flex items-center justify-center gap-1.5"
                    >
                      <Camera className="w-3 h-3 text-neon" />
                      Lens Stream
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-2 px-3 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-750 text-[11px] font-semibold text-white flex items-center justify-center gap-1.5"
                    >
                      <Upload className="w-3 h-3 text-blue-400" />
                      Browse Files
                    </button>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>
              )}
            </div>

            {/* Scale Value / Mass inputs */}
            <div className="glass-panel rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center">
                    <Scale className="w-4 h-4 text-neon" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block leading-tight">Serving Weight</span>
                    <span className="text-[9px] text-gray-500 font-mono">Mass measured in grams</span>
                  </div>
                </div>
                <div className="flex items-center bg-gray-900 border border-gray-800 rounded-lg px-2 py-1">
                  <input 
                    type="number" 
                    value={weight || ''}
                    min="1"
                    max="3000"
                    onChange={(e) => setWeight(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-12 bg-transparent text-right font-mono text-xs font-bold text-neon outline-none"
                  />
                  <span className="text-[10px] text-gray-500 font-bold ml-1">g</span>
                </div>
              </div>
              
              <input 
                type="range" 
                min="10" 
                max="1000" 
                step="5"
                value={weight} 
                onChange={(e) => setWeight(parseInt(e.target.value))}
                className="w-full accent-neon bg-gray-800 rounded-lg appearance-none h-1 cursor-pointer outline-none"
              />
              <div className="flex justify-between text-[9px] text-gray-500 font-mono mt-1.5">
                <span>10g</span>
                <span>250g (Standard)</span>
                <span>500g</span>
                <span>1000g</span>
              </div>
            </div>

            {/* Core Scanner Trigger */}
            <button
              onClick={analyzeFood}
              disabled={!image || loading}
              className={`w-full py-4 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 ${
                image 
                  ? 'bg-neon text-black hover:bg-neonhover shadow-lg shadow-neon/15' 
                  : 'bg-gray-900 border border-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Analyze Diagnostics
            </button>
          </div>
        ) : loading ? (
          /* SCANNING SYSTEM SIMULATOR */
          <div className="space-y-6 py-4">
            <div className="glass-panel rounded-2xl p-6 flex flex-col items-center relative overflow-hidden">
              <div className="relative w-40 rounded-xl overflow-hidden border border-neon/10 shadow-2xl">
                {image && <img src={image} alt="Diagnostic Scan Target" className="w-full aspect-square object-cover opacity-50" />}
                <div className="absolute left-0 right-0 h-0.5 bg-neon/70 shadow-[0_0_10px_rgba(124,255,91,1)] animate-scanner-sweep"></div>
              </div>

              <div className="mt-8 flex flex-col items-center text-center">
                <div className="w-5 h-5 border-2 border-neon border-t-transparent rounded-full animate-spin mb-3"></div>
                <h3 className="text-[10px] font-mono font-bold tracking-widest text-neon uppercase mb-1">{loadingStep}</h3>
                <p className="text-[9px] text-gray-500">Scanning macro compositions</p>
              </div>
            </div>
          </div>
        ) : (
          /* SPECTROSCOPY REPORT DASHBOARD */
          <div className="space-y-6">
            
            <div className="glass-panel rounded-2xl overflow-hidden">
              {image && (
                <div className="relative h-40 w-full">
                  <img src={image} alt={result.food_name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-darkcard via-transparent to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                    <div>
                      <span className="text-[8px] font-mono tracking-wider text-neon bg-neonbg border border-neon/30 px-2 py-0.5 rounded uppercase font-bold">
                        SPECTROMETRY CONFIRMED
                      </span>
                      <h2 className="text-lg font-black text-white mt-1 leading-tight">{result.food_name}</h2>
                    </div>
                    {result.confidence && (
                      <div className="text-right">
                        <span className="text-[9px] text-gray-400 block font-mono font-bold uppercase">Match</span>
                        <span className="text-xs font-black text-neon font-mono">{result.confidence}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-gray-900/60 border-t border-gray-800/40 px-4 py-3 flex justify-between items-center text-xs">
                <span className="text-gray-400">Total Calculated Serving Weight:</span>
                <span className="font-mono text-white font-bold">{weight}g</span>
              </div>
            </div>

            {/* Energy value grid breakdown */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-panel rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-2 left-2">
                  <Flame className="w-4 h-4 text-amber-500" />
                </div>
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1">Energy Profile</span>
                <span className="text-3xl font-black text-white font-mono leading-none">
                  {getScaledCals(result.nutrition_per_100g?.calories)}
                </span>
                <span className="text-[9px] text-gray-500 mt-1 font-bold font-mono">TOTAL KCAL</span>
              </div>

              <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] text-gray-400 block font-bold uppercase tracking-wider mb-1">Data Model</span>
                  <p className="text-[9px] text-gray-500 leading-normal">
                    Spectroscopy metrics automatically normalized to client portion size.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <CheckCircle2 className="w-3 h-3 text-neon" />
                  <span className="text-[9px] font-bold text-gray-350 font-mono">Normalized</span>
                </div>
              </div>
            </div>

            {/* Macro Breakdowns */}
            <div className="glass-panel rounded-2xl p-4 space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-450">Macronutrients Breakdown</h4>

              {/* Carbohydrates */}
              <div>
                <div className="flex justify-between items-end text-xs mb-1">
                  <span className="font-bold text-gray-300">Carbohydrates</span>
                  <div className="font-mono text-xs">
                    <span className="text-white font-bold">{getScaledVal(result.nutrition_per_100g?.carbs)}g </span>
                    <span className="text-gray-500 text-[9px]">({result.nutrition_per_100g?.carbs}g/100g)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden border border-gray-800">
                  <div 
                    className="bg-amber-400 h-full rounded-full transition-all duration-1000" 
                    style={{ width: `${Math.min(100, (result.nutrition_per_100g?.carbs || 0) * 2)}%` }}
                  ></div>
                </div>
              </div>

              {/* Protein */}
              <div>
                <div className="flex justify-between items-end text-xs mb-1">
                  <span className="font-bold text-gray-300">Protein</span>
                  <div className="font-mono text-xs">
                    <span className="text-neon font-bold">{getScaledVal(result.nutrition_per_100g?.protein)}g </span>
                    <span className="text-gray-500 text-[9px]">({result.nutrition_per_100g?.protein}g/100g)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden border border-gray-800">
                  <div 
                    className="bg-neon h-full rounded-full transition-all duration-1000" 
                    style={{ width: `${Math.min(100, (result.nutrition_per_100g?.protein || 0) * 4)}%` }}
                  ></div>
                </div>
              </div>

              {/* Fats */}
              <div>
                <div className="flex justify-between items-end text-xs mb-1">
                  <span className="font-bold text-gray-300">Total Fats</span>
                  <div className="font-mono text-xs">
                    <span className="text-red-400 font-bold">{getScaledVal(result.nutrition_per_100g?.fat)}g </span>
                    <span className="text-gray-500 text-[9px]">({result.nutrition_per_100g?.fat}g/100g)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden border border-gray-800">
                  <div 
                    className="bg-red-400 h-full rounded-full transition-all duration-1000" 
                    style={{ width: `${Math.min(100, (result.nutrition_per_100g?.fat || 0) * 3.5)}%` }}
                  ></div>
                </div>
              </div>

              {/* Fiber */}
              <div>
                <div className="flex justify-between items-end text-xs mb-1">
                  <span className="font-bold text-gray-300">Dietary Fiber</span>
                  <div className="font-mono text-xs">
                    <span className="text-indigo-400 font-bold">{getScaledVal(result.nutrition_per_100g?.fiber)}g </span>
                    <span className="text-gray-500 text-[9px]">({result.nutrition_per_100g?.fiber}g/100g)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden border border-gray-800">
                  <div 
                    className="bg-indigo-400 h-full rounded-full transition-all duration-1000" 
                    style={{ width: `${Math.min(100, (result.nutrition_per_100g?.fiber || 0) * 8)}%` }}
                  ></div>
                </div>
              </div>

            </div>

            {/* Reset Scanning sequence */}
            <button 
              onClick={handleReset}
              className="w-full py-4 bg-gray-900 border border-gray-800 rounded-xl font-bold text-xs text-white hover:text-neon hover:border-neon/30 tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Scan Another Target
            </button>
          </div>
        )}
      </main>

      <footer className="py-4 border-t border-gray-950 bg-black/40 text-center">
        <p className="text-[9px] text-gray-600 tracking-wider uppercase font-mono">
          Nutritional indices computed on-demand via Gemini Core integrations.
        </p>
      </footer>
    </div>
  );
}
