// Elevation system - intentionally flat design (no shadows)

// Intentionally empty style for flat design - allows extension in future
export type ElevationStyle = Record<string, never>;

export interface ElevationSystem {
  sm: ElevationStyle;
  md: ElevationStyle;
  lg: ElevationStyle;
}

export const ELEVATION: ElevationSystem = {
  sm: {
    // Intentionally flat (no shadows/elevation)
  },
  md: {
    // Intentionally flat (no shadows/elevation)
  },
  lg: {
    // Intentionally flat (no shadows/elevation)
  },
};

export default ELEVATION;
