/**
 * Widget System Exports
 *
 * Central export file for all widget components and utilities.
 */

// Schema and utilities
export {
  WIDGET_TYPES,
  INPUT_TO_OUTPUT_MAP,
  WIDGET_CATEGORIES,
  WIDGET_METADATA,
  isInputWidget,
  isOutputWidget,
  getOutputWidgetType,
  detectWidgetTrigger,
  getInputWidgets,
} from './schemas/WidgetSchemas';

// Main renderer
export { default as WidgetRenderer, isWidgetImplemented } from './WidgetRenderer';

// Tools menu
export { default as ToolsMenu } from './ToolsMenu';

// Shared components
export { default as ChipSelector } from './shared/ChipSelector';
export { default as SliderInput } from './shared/SliderInput';
export { default as DropdownSelector } from './shared/DropdownSelector';
export { default as LocationPicker } from './shared/LocationPicker';
export { default as ProbabilityBar } from './shared/ProbabilityBar';
export { default as ToggleSwitch } from './shared/ToggleSwitch';
export { default as NumberInput } from './shared/NumberInput';
export { default as DataTable } from './shared/DataTable';
export { default as ActionButton } from './shared/ActionButton';
export { default as WidgetSuggestion } from './shared/WidgetSuggestion';

// Input Widgets
export { default as WeatherInputWidget } from './input/WeatherInputWidget';
export { default as FeedFormulationWidget } from './input/FeedFormulationWidget';
export { default as SoilQueryWidget } from './input/SoilQueryWidget';
export { default as FertilizerInputWidget } from './input/FertilizerInputWidget';
export { default as ClimateQueryWidget } from './input/ClimateQueryWidget';
export { default as DecisionTreeWidget } from './input/DecisionTreeWidget';

// Output Widgets
export { default as WeatherForecastCard } from './output/WeatherForecastCard';
export { default as DietRecommendationCard } from './output/DietRecommendationCard';
export { default as SoilProfileCard } from './output/SoilProfileCard';
export { default as FertilizerResultCard } from './output/FertilizerResultCard';
export { default as ClimateForecastCard } from './output/ClimateForecastCard';
export { default as RecommendationListCard } from './output/RecommendationListCard';
