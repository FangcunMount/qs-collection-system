import {
  SCALE_MEDICAL_CATEGORY_VALUES,
  isMedicalScaleCategory,
} from '../scaleCatalogHome';

describe('scaleCatalogHome', () => {
  it('accepts only the eight canonical medical scale categories', () => {
    expect(SCALE_MEDICAL_CATEGORY_VALUES).toEqual([
      'slp', 'emt', 'pressure', 'efn', 'adhd', 'td', 'asd', 'sii',
    ]);
    expect(isMedicalScaleCategory('emt')).toBe(true);
    expect(isMedicalScaleCategory('')).toBe(false);
    expect(isMedicalScaleCategory(null)).toBe(false);
    expect(isMedicalScaleCategory('personality')).toBe(false);
  });
});
