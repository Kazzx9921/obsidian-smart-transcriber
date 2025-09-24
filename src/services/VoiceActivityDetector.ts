/**
 * 智能語音活動檢測器
 * 基於傳統信號處理算法實現人聲與電腦音頻的智能區分
 */

export interface VoiceFeatures {
  // 頻域特徵
  fundamentalEnergy: number;      // 基頻能量 (85-300Hz)
  formantEnergy: number;          // 共振峰能量 (1000-4000Hz) 
  spectralCentroid: number;       // 頻譜重心
  spectralRolloff: number;        // 頻譜滾降點
  
  // 時域特徵
  zeroCrossingRate: number;       // 過零率
  shortTimeEnergy: number;        // 短時能量
  
  // 動態特徵
  energyVariation: number;        // 能量變化率
  spectralFlux: number;          // 頻譜變化率
}

export interface VoiceDetectionResult {
  isHumanVoice: boolean;         // 是否為人聲
  isComputerAudio: boolean;      // 是否為電腦音頻
  confidence: number;            // 置信度 (0-1)
  features: VoiceFeatures;       // 提取的特徵
  audioLevel: number;            // 音頻級別 (0-100)
}

export class VoiceActivityDetector {
  private analyser: AnalyserNode;
  private frequencyData: Uint8Array;
  private timeData: Uint8Array;
  
  // 語音特徵檢測參數 (基於 44.1kHz 採樣率，FFT Size 256)
  private readonly VOICE_FREQUENCY_BANDS = {
    // 人聲基頻範圍 85-300Hz 對應的 bin 範圍
    fundamental: { start: 1, end: 4 },    // ~86Hz - 344Hz
    // 人聲共振峰範圍 1000-4000Hz 對應的 bin 範圍  
    formants: { start: 12, end: 47 },     // ~1031Hz - 4031Hz
    // 高頻範圍
    highFreq: { start: 48, end: 127 }     // 4kHz以上
  };
  
  // 自適應參數
  private backgroundNoiseLevel = 0;
  private adaptiveThreshold = 0.3;
  private noiseEstimationBuffer: number[] = [];
  private previousSpectrum: Float32Array | null = null;
  private energyHistory: number[] = [];
  
  // 檢測閾值 (調整為更靈敏的參數)
  private readonly DETECTION_THRESHOLDS = {
    minVoiceEnergy: 0.01,          // 降低最小語音能量閾值
    voiceFormantRatio: 1.5,         // 降低語音共振峰比例要求
    voiceZcrRange: [0.1, 0.5],     // 擴大語音過零率範圍
    computerAudioHighFreqRatio: 0.5, // 提高電腦音頻高頻比例閾值
    confidenceThreshold: 0.5,       // 降低最終置信度閾值
    minAudioLevel: 20              // 最小音頻級別閾值 (0-100)
  };
  
  constructor(analyser: AnalyserNode) {
    this.analyser = analyser;
    this.frequencyData = new Uint8Array(analyser.frequencyBinCount);
    this.timeData = new Uint8Array(analyser.frequencyBinCount);
    
    // 初始化噪音估計緩衝區
    this.noiseEstimationBuffer = new Array(50).fill(0);
  }
  
  /**
   * 主要的語音活動檢測方法
   */
  detectVoiceActivity(): VoiceDetectionResult {
    // 獲取音頻數據
    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.timeData);
    
    // 1. 頻譜分析
    const spectralFeatures = this.analyzeSpectrum();
    
    // 2. 時域分析
    const temporalFeatures = this.analyzeTimeSignal();
    
    // 3. 動態特徵分析
    const dynamicFeatures = this.analyzeDynamicFeatures(spectralFeatures);
    
    // 4. 背景噪音估計更新
    this.updateBackgroundNoise(spectralFeatures.shortTimeEnergy);
    
    // 5. 綜合特徵 (確保所有必需屬性都有值)
    const features: VoiceFeatures = {
      fundamentalEnergy: spectralFeatures.fundamentalEnergy || 0,
      formantEnergy: spectralFeatures.formantEnergy || 0,
      spectralCentroid: spectralFeatures.spectralCentroid || 0,
      spectralRolloff: spectralFeatures.spectralRolloff || 0,
      zeroCrossingRate: temporalFeatures.zeroCrossingRate || 0,
      shortTimeEnergy: spectralFeatures.shortTimeEnergy || 0,
      energyVariation: dynamicFeatures.energyVariation || 0,
      spectralFlux: dynamicFeatures.spectralFlux || 0
    };
    
    // 6. 分類判斷
    return this.classifyAudioType(features);
  }
  
  /**
   * 頻譜分析 - 提取頻域特徵
   */
  private analyzeSpectrum(): Partial<VoiceFeatures> {
    const spectrum = new Float32Array(this.frequencyData.length);
    for (let i = 0; i < this.frequencyData.length; i++) {
      spectrum[i] = this.frequencyData[i] / 255.0;
    }
    
    // 計算各頻段能量
    const fundamentalEnergy = this.calculateBandEnergy(
      spectrum, 
      this.VOICE_FREQUENCY_BANDS.fundamental.start,
      this.VOICE_FREQUENCY_BANDS.fundamental.end
    );
    
    const formantEnergy = this.calculateBandEnergy(
      spectrum,
      this.VOICE_FREQUENCY_BANDS.formants.start,
      this.VOICE_FREQUENCY_BANDS.formants.end
    );
    
    // 計算頻譜重心
    const spectralCentroid = this.calculateSpectralCentroid(spectrum);
    
    // 計算頻譜滾降點
    const spectralRolloff = this.calculateSpectralRolloff(spectrum, 0.85);
    
    // 計算短時能量
    const shortTimeEnergy = spectrum.reduce((sum, val) => sum + val * val, 0) / spectrum.length;
    
    return {
      fundamentalEnergy,
      formantEnergy,
      spectralCentroid,
      spectralRolloff,
      shortTimeEnergy
    };
  }
  
  /**
   * 時域分析 - 提取時域特徵
   */
  private analyzeTimeSignal(): Partial<VoiceFeatures> {
    // 計算過零率
    let zeroCrossings = 0;
    for (let i = 1; i < this.timeData.length; i++) {
      const prev = (this.timeData[i - 1] - 128) / 128.0;
      const curr = (this.timeData[i] - 128) / 128.0;
      if ((prev >= 0 && curr < 0) || (prev < 0 && curr >= 0)) {
        zeroCrossings++;
      }
    }
    const zeroCrossingRate = zeroCrossings / (this.timeData.length - 1);
    
    return {
      zeroCrossingRate
    };
  }
  
  /**
   * 動態特徵分析 - 提取變化特徵
   */
  private analyzeDynamicFeatures(spectralFeatures: Partial<VoiceFeatures>): Partial<VoiceFeatures> {
    const currentEnergy = spectralFeatures.shortTimeEnergy || 0;
    
    // 更新能量歷史
    this.energyHistory.push(currentEnergy);
    if (this.energyHistory.length > 10) {
      this.energyHistory.shift();
    }
    
    // 計算能量變化率
    let energyVariation = 0;
    if (this.energyHistory.length > 1) {
      const energyDiffs = [];
      for (let i = 1; i < this.energyHistory.length; i++) {
        energyDiffs.push(Math.abs(this.energyHistory[i] - this.energyHistory[i - 1]));
      }
      energyVariation = energyDiffs.reduce((sum, val) => sum + val, 0) / energyDiffs.length;
    }
    
    // 計算頻譜變化率
    let spectralFlux = 0;
    if (this.previousSpectrum) {
      for (let i = 0; i < this.frequencyData.length; i++) {
        const current = this.frequencyData[i] / 255.0;
        const previous = this.previousSpectrum[i];
        const diff = current - previous;
        spectralFlux += diff * diff;
      }
      spectralFlux = Math.sqrt(spectralFlux / this.frequencyData.length);
    }
    
    // 更新前一幀頻譜
    this.previousSpectrum = new Float32Array(this.frequencyData.length);
    for (let i = 0; i < this.frequencyData.length; i++) {
      this.previousSpectrum[i] = this.frequencyData[i] / 255.0;
    }
    
    return {
      energyVariation,
      spectralFlux
    };
  }
  
  /**
   * 音頻類型分類 - 基於多特徵融合的智能判斷
   */
  private classifyAudioType(features: VoiceFeatures): VoiceDetectionResult {
    let humanVoiceScore = 0;
    let computerAudioScore = 0;
    let confidence = 0;
    
    // 1. 基於能量的基本檢測
    if (features.shortTimeEnergy < this.DETECTION_THRESHOLDS.minVoiceEnergy) {
      return {
        isHumanVoice: false,
        isComputerAudio: false,
        confidence: 0.9,
        features,
        audioLevel: 0
      };
    }
    
    // 2. 人聲特徵評分
    
    // 基頻能量檢測 (人聲在 85-300Hz 有明顯能量) - 降低閾值
    if (features.fundamentalEnergy > 0.01) {
      humanVoiceScore += 0.3;
    }
    
    // 共振峰特徵檢測 (人聲在 1-4kHz 有共振峰)
    const formantRatio = features.formantEnergy / (features.fundamentalEnergy + 0.001);
    if (formantRatio > this.DETECTION_THRESHOLDS.voiceFormantRatio) {
      humanVoiceScore += 0.4;
    }
    
    // 過零率檢測 (人聲過零率在特定範圍)
    const [minZcr, maxZcr] = this.DETECTION_THRESHOLDS.voiceZcrRange;
    if (features.zeroCrossingRate >= minZcr && features.zeroCrossingRate <= maxZcr) {
      humanVoiceScore += 0.2;
    }
    
    // 頻譜重心檢測 (人聲頻譜重心通常在中頻)
    if (features.spectralCentroid > 0.2 && features.spectralCentroid < 0.6) {
      humanVoiceScore += 0.1;
    }
    
    // 3. 電腦音頻特徵評分
    
    // 高頻能量檢測 (電腦音頻可能有更多高頻成分)
    const highFreqEnergy = this.calculateBandEnergy(
      new Float32Array(this.frequencyData.map(x => x / 255.0)),
      this.VOICE_FREQUENCY_BANDS.highFreq.start,
      this.VOICE_FREQUENCY_BANDS.highFreq.end
    );
    
    const highFreqRatio = highFreqEnergy / (features.shortTimeEnergy + 0.001);
    if (highFreqRatio > this.DETECTION_THRESHOLDS.computerAudioHighFreqRatio) {
      computerAudioScore += 0.3;
    }
    
    // 頻譜平坦度檢測 (電腦音頻頻譜可能更平坦)
    if (features.spectralRolloff > 0.7) {
      computerAudioScore += 0.2;
    }
    
    // 能量變化檢測 (電腦音頻變化可能更穩定)
    if (features.energyVariation < 0.01) {
      computerAudioScore += 0.1;
    }
    
    // 4. 最終判斷
    const totalScore = humanVoiceScore + computerAudioScore;
    if (totalScore > 0) {
      confidence = Math.min(1.0, totalScore);
      
      if (humanVoiceScore > computerAudioScore && humanVoiceScore > 0.2) {
        return {
          isHumanVoice: true,
          isComputerAudio: false,
          confidence: confidence,
          features,
          audioLevel: Math.min(100, features.shortTimeEnergy * 1000)
        };
      } else if (computerAudioScore > 0.3) {
        return {
          isHumanVoice: false,
          isComputerAudio: true,
          confidence: confidence,
          features,
          audioLevel: Math.min(100, features.shortTimeEnergy * 1000)
        };
      }
    }
    
    // 默認情況 - 未檢測到明確特徵
    return {
      isHumanVoice: false,
      isComputerAudio: false,
      confidence: confidence,
      features,
      audioLevel: Math.min(100, features.shortTimeEnergy * 1000)
    };
  }
  
  /**
   * 計算指定頻段的能量
   */
  private calculateBandEnergy(spectrum: Float32Array, startBin: number, endBin: number): number {
    let energy = 0;
    for (let i = startBin; i <= Math.min(endBin, spectrum.length - 1); i++) {
      energy += spectrum[i] * spectrum[i];
    }
    return energy / (endBin - startBin + 1);
  }
  
  /**
   * 計算頻譜重心
   */
  private calculateSpectralCentroid(spectrum: Float32Array): number {
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < spectrum.length; i++) {
      numerator += i * spectrum[i];
      denominator += spectrum[i];
    }
    
    return denominator > 0 ? (numerator / denominator) / spectrum.length : 0;
  }
  
  /**
   * 計算頻譜滾降點
   */
  private calculateSpectralRolloff(spectrum: Float32Array, threshold: number): number {
    const totalEnergy = spectrum.reduce((sum, val) => sum + val, 0);
    const targetEnergy = totalEnergy * threshold;
    
    let cumulativeEnergy = 0;
    for (let i = 0; i < spectrum.length; i++) {
      cumulativeEnergy += spectrum[i];
      if (cumulativeEnergy >= targetEnergy) {
        return i / spectrum.length;
      }
    }
    
    return 1.0;
  }
  
  /**
   * 更新背景噪音估計
   */
  private updateBackgroundNoise(currentEnergy: number): void {
    // 使用滑動窗口更新噪音估計
    this.noiseEstimationBuffer.push(currentEnergy);
    if (this.noiseEstimationBuffer.length > 50) {
      this.noiseEstimationBuffer.shift();
    }
    
    // 計算背景噪音水平 (使用較低的百分位數)
    const sortedBuffer = [...this.noiseEstimationBuffer].sort((a, b) => a - b);
    const percentile20Index = Math.floor(sortedBuffer.length * 0.2);
    this.backgroundNoiseLevel = sortedBuffer[percentile20Index] || 0;
    
    // 自適應調整檢測閾值
    this.adaptiveThreshold = Math.max(0.1, this.backgroundNoiseLevel * 3);
  }
  
  /**
   * 獲取當前背景噪音水平
   */
  getBackgroundNoiseLevel(): number {
    return this.backgroundNoiseLevel;
  }
  
  /**
   * 獲取當前自適應閾值
   */
  getAdaptiveThreshold(): number {
    return this.adaptiveThreshold;
  }
}
