/**
 * 信號處理工具類
 * 實現譜減法雜訊抑制和自適應濾波算法
 */

export class SpectralSubtraction {
  private noiseSpectrum: Float32Array;
  private alpha = 2.0;  // 過減因子
  private beta = 0.01;  // 最小增益
  private isInitialized = false;
  
  constructor(spectrumSize: number) {
    this.noiseSpectrum = new Float32Array(spectrumSize);
  }
  
  /**
   * 更新噪音估計
   * @param spectrum 當前頻譜
   * @param isVoice 是否為語音段
   */
  updateNoiseEstimate(spectrum: Float32Array, isVoice: boolean): void {
    if (!isVoice) {
      if (!this.isInitialized) {
        // 初次初始化，直接複製
        for (let i = 0; i < spectrum.length; i++) {
          this.noiseSpectrum[i] = spectrum[i];
        }
        this.isInitialized = true;
      } else {
        // 指數移動平均更新噪音估計
        for (let i = 0; i < spectrum.length; i++) {
          this.noiseSpectrum[i] = 0.95 * this.noiseSpectrum[i] + 0.05 * spectrum[i];
        }
      }
    }
  }
  
  /**
   * 譜減法雜訊抑制
   * @param spectrum 輸入頻譜
   * @returns 增強後的頻譜
   */
  suppress(spectrum: Float32Array): Float32Array {
    if (!this.isInitialized) {
      return spectrum; // 如果還沒有噪音估計，直接返回原頻譜
    }
    
    const enhanced = new Float32Array(spectrum.length);
    
    for (let i = 0; i < spectrum.length; i++) {
      if (spectrum[i] > 0 && this.noiseSpectrum[i] > 0) {
        // 計算信噪比
        const snr = spectrum[i] / this.noiseSpectrum[i];
        
        // 計算增益函數
        let gain = Math.max(this.beta, 1 - this.alpha / snr);
        
        // 平滑增益函數以避免音樂噪音
        gain = this.smoothGain(gain, i);
        
        enhanced[i] = gain * spectrum[i];
      } else {
        enhanced[i] = spectrum[i];
      }
    }
    
    return enhanced;
  }
  
  /**
   * 平滑增益函數
   */
  private smoothGain(gain: number, binIndex: number): number {
    // 簡單的頻域平滑
    const smoothingFactor = 0.8;
    return smoothingFactor * gain + (1 - smoothingFactor) * this.beta;
  }
  
  /**
   * 重置噪音估計
   */
  reset(): void {
    this.noiseSpectrum.fill(0);
    this.isInitialized = false;
  }
}

export class AdaptiveFilter {
  private weights: Float32Array;
  private learningRate = 0.01;
  private filterLength: number;
  
  constructor(filterLength: number = 32) {
    this.filterLength = filterLength;
    this.weights = new Float32Array(filterLength);
    // 初始化權重為小隨機值
    for (let i = 0; i < filterLength; i++) {
      this.weights[i] = (Math.random() - 0.5) * 0.001;
    }
  }
  
  /**
   * LMS 自適應濾波算法
   * @param input 輸入信號
   * @param desired 期望信號
   * @returns 濾波器輸出
   */
  adapt(input: Float32Array, desired: number): number {
    if (input.length < this.filterLength) {
      return desired; // 如果輸入長度不足，直接返回期望信號
    }
    
    // 計算濾波器輸出
    let output = 0;
    for (let i = 0; i < this.filterLength; i++) {
      output += this.weights[i] * input[input.length - this.filterLength + i];
    }
    
    // 計算誤差
    const error = desired - output;
    
    // 更新權重 (LMS算法)
    for (let i = 0; i < this.filterLength; i++) {
      this.weights[i] += this.learningRate * error * input[input.length - this.filterLength + i];
    }
    
    return output;
  }
  
  /**
   * 設置學習率
   */
  setLearningRate(rate: number): void {
    this.learningRate = Math.max(0.001, Math.min(0.1, rate));
  }
  
  /**
   * 重置濾波器
   */
  reset(): void {
    this.weights.fill(0);
    for (let i = 0; i < this.filterLength; i++) {
      this.weights[i] = (Math.random() - 0.5) * 0.001;
    }
  }
}

/**
 * 小波變換消噪 (簡化版本)
 */
export class WaveletDenoising {
  private threshold = 0.1;
  
  /**
   * 簡單的小波閾值消噪
   * @param signal 輸入信號
   * @returns 消噪後的信號
   */
  denoise(signal: Float32Array): Float32Array {
    const denoised = new Float32Array(signal.length);
    
    // 使用軟閾值函數
    for (let i = 0; i < signal.length; i++) {
      const absValue = Math.abs(signal[i]);
      if (absValue > this.threshold) {
        denoised[i] = Math.sign(signal[i]) * (absValue - this.threshold);
      } else {
        denoised[i] = 0;
      }
    }
    
    return denoised;
  }
  
  /**
   * 自適應設置閾值
   * @param noiseLevel 估計的噪音水平
   */
  setAdaptiveThreshold(noiseLevel: number): void {
    this.threshold = Math.max(0.05, Math.min(0.3, noiseLevel * 2));
  }
}

/**
 * 綜合信號處理器
 * 整合多種降噪算法
 */
export class SignalProcessor {
  private spectralSubtraction: SpectralSubtraction;
  private adaptiveFilter: AdaptiveFilter;
  private waveletDenoising: WaveletDenoising;
  private enabled = true;
  
  constructor(spectrumSize: number) {
    this.spectralSubtraction = new SpectralSubtraction(spectrumSize);
    this.adaptiveFilter = new AdaptiveFilter();
    this.waveletDenoising = new WaveletDenoising();
  }
  
  /**
   * 綜合信號增強處理
   * @param spectrum 頻譜數據
   * @param timeSignal 時域信號
   * @param isVoice 是否為語音
   * @param noiseLevel 噪音水平
   * @returns 處理後的頻譜
   */
  processSignal(
    spectrum: Float32Array, 
    timeSignal: Float32Array, 
    isVoice: boolean,
    noiseLevel: number
  ): Float32Array {
    if (!this.enabled) {
      return spectrum;
    }
    
    let processedSpectrum = spectrum;
    
    // 1. 更新噪音估計
    this.spectralSubtraction.updateNoiseEstimate(spectrum, isVoice);
    
    // 2. 譜減法降噪
    if (isVoice) {
      processedSpectrum = this.spectralSubtraction.suppress(processedSpectrum);
    }
    
    // 3. 自適應閾值設置
    this.waveletDenoising.setAdaptiveThreshold(noiseLevel);
    
    // 4. 小波消噪 (應用於時域信號的頻域表示)
    if (timeSignal.length > 0) {
      // Apply wavelet denoising to time signal
      this.waveletDenoising.denoise(timeSignal);
      // 這裡可以進一步結合時域處理結果，暫時保持頻域處理
    }
    
    return processedSpectrum;
  }
  
  /**
   * 啟用/禁用信號處理
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /**
   * 重置所有處理器
   */
  reset(): void {
    this.spectralSubtraction.reset();
    this.adaptiveFilter.reset();
  }
  
  /**
   * 獲取處理器狀態
   */
  getStatus(): {
    enabled: boolean;
    spectralSubtractionReady: boolean;
  } {
    return {
      enabled: this.enabled,
      spectralSubtractionReady: this.spectralSubtraction['isInitialized']
    };
  }
}
