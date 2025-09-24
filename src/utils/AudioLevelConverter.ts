/**
 * Audio level conversion utilities for dB and linear values
 */
export class AudioLevelConverter {
  /**
   * Convert decibels to linear value (0.0-1.0)
   * @param db Decibel value (typically -100 to 0)
   * @returns Linear value between 0.0 and 1.0
   */
  static dbToLinear(db: number): number {
    // Clamp dB value to reasonable range
    const clampedDb = Math.max(-100, Math.min(0, db));
    return Math.pow(10, clampedDb / 20);
  }
  
  /**
   * Convert linear value (0.0-1.0) to decibels
   * @param linear Linear value between 0.0 and 1.0
   * @returns Decibel value
   */
  static linearToDb(linear: number): number {
    // Avoid log(0) by setting minimum value
    const clampedLinear = Math.max(0.000001, Math.min(1.0, linear));
    return 20 * Math.log10(clampedLinear);
  }
  
  /**
   * Format decibel value for display
   * @param db Decibel value
   * @returns Formatted string (e.g., "-40.0dB")
   */
  static formatDb(db: number): string {
    return `${db.toFixed(1)}dB`;
  }
  
  /**
   * Calculate RMS (Root Mean Square) from audio data array
   * @param dataArray Uint8Array from AnalyserNode
   * @returns RMS value between 0.0 and 1.0
   */
  static calculateRMS(dataArray: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = dataArray[i] / 255;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / dataArray.length);
  }
  
  /**
   * Calculate current audio level in dB from analyser data
   * @param dataArray Uint8Array from AnalyserNode
   * @returns Current audio level in dB
   */
  static getCurrentLevelDb(dataArray: Uint8Array): number {
    const rms = this.calculateRMS(dataArray);
    return this.linearToDb(rms);
  }
}
