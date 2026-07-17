import placeholderAssessment from './generated/wcagAssessment.example.json';
import type { WcagAssessment } from './types';

const generatedAssessmentModules = import.meta.glob<{ default: WcagAssessment }>(
  './generated/wcagAssessment.json',
  { eager: true }
);

export const assessment =
  generatedAssessmentModules['./generated/wcagAssessment.json']?.default ??
  (placeholderAssessment as WcagAssessment);
