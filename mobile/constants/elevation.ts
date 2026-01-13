// Elevation system - intentionally flat design (no shadows)

export interface ElevationStyle {
  // Empty - intentionally flat
}

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
