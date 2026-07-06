import { EntityEnum } from '../services/entities.js';

export const accessInquiry: Record<
  keyof typeof EntityEnum,
  Array<(typeof EntityEnum)[keyof typeof EntityEnum]>
> = {
  [EntityEnum.NTIA]: [EntityEnum.FEDERAL_AGENCY, EntityEnum.COMMERCIAL],
  [EntityEnum.FEDERAL_AGENCY]: [EntityEnum.NTIA],
  [EntityEnum.COMMERCIAL]: [EntityEnum.NTIA],
};
