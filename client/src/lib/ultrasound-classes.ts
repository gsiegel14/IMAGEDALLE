export interface UltrasoundClass {
  id: string;
  name: string;
  description: string;
}

export const ultrasoundClasses: Record<string, UltrasoundClass> = {
  "Hepatic_Normal": {
    id: "Hepatic_Normal",
    name: "Hepatic Normal",
    description: "Hepatic vein PWD showing triphasic pattern with prominent S wave below baseline (anterograde flow toward heart) larger than D wave, and small A wave above baseline. Waveform shows sharp, well-defined peaks with clear cardiac phasicity corresponding to cardiac cycle."
  },
  "Hepatic_Mild": {
    id: "Hepatic_Mild",
    name: "Hepatic Mild",
    description: "Hepatic vein PWD demonstrating S wave below baseline but diminished in amplitude compared to D wave (S<D pattern). Both waves remain below baseline with preserved triphasic pattern but altered S:D ratio indicating early congestion."
  },
  "Hepatic_Severe": {
    id: "Hepatic_Severe",
    name: "Hepatic Severe",
    description: "Hepatic vein PWD showing complete reversal of A, S, and D waves with majority of waveform appearing above baseline. S and A waves remain distinctly visible but are inverted (above baseline), indicating reversed flow direction away from heart during cardiac cycle. Normal flow direction is lost with predominantly positive deflections."
  },
  "Portal_Normal": {
    id: "Portal_Normal",
    name: "Portal Normal",
    description: "Portal vein PWD showing continuous hepatopetal flow consistently above baseline (towards liver) with minimal undulation. Appears as flat spectral band of uniform thickness throughout cardiac cycle without significant pulsatility (<30% variation)."
  },
  "Portal_Mild": {
    id: "Portal_Mild",
    name: "Portal Mild",
    description: "Portal vein PWD showing mild pulsatility 30-50% with all flow remaining above baseline. Spectral envelope displays gentle regular undulations synchronized with cardiac phases creating wavy appearance rather than flat band."
  },
  "Portal_Severe": {
    id: "Portal_Severe",
    name: "Portal Severe",
    description: "Portal vein PWD showing marked biphasic or monophasic pattern with deep systolic notches but flow remaining predominantly above baseline. Displays extreme velocity changes with deep scalloping of waveform nearly reaching baseline during systole. Greater than 50% pulsitile"
  },
  "Renal_Normal": {
    id: "Renal_Normal",
    name: "Renal Normal",
    description: "Renal PWD showing arterial component above baseline with sharp systolic peaks, while venous component appears as continuous band below baseline with minimal pulsatility. Venous waveform shows uniform spectral density without cardiac-synchronized undulations."
  },
  "Renal_Mild": {
    id: "Renal_Mild",
    name: "Renal Mild",
    description: "Renal PWD with normal arterial component above baseline, while venous component below baseline shows mild pulsatility with distinct S and D waves. Venous spectral envelope displays visible cardiac-synchronized undulations with discrete narrowing during systole."
  },
  "Renal_Severe": {
    id: "Renal_Severe",
    name: "Renal Severe",
    description: "Renal PWD with normal arterial component above baseline, while venous flow below baseline shows severe discontinuous pattern. Venous spectral envelope appears deeply notched or interrupted during systole creating D-dominant waveform. Flow almost disappears during systole resulting in discrete separated pulses."
  }
};
