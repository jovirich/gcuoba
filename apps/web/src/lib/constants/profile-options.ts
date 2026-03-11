import nigeriaData from './nigeria.json';

export const PROFILE_TITLE_OPTIONS = [
  { value: 'mr', label: 'Mr' },
  { value: 'mrs', label: 'Mrs' },
  { value: 'ms', label: 'Ms' },
  { value: 'chief', label: 'Chief' },
  { value: 'dr', label: 'Dr' },
  { value: 'prof', label: 'Prof' },
] as const;

type NigeriaStateRecord = {
  name: string;
  lgas: string[];
};

type NigeriaData = {
  states: NigeriaStateRecord[];
};

const typedNigeriaData = nigeriaData as NigeriaData;

export const NIGERIA_STATES = typedNigeriaData.states
  .map((state) => state.name)
  .sort((left, right) => left.localeCompare(right));

export const NIGERIA_LGAS_BY_STATE = new Map(
  typedNigeriaData.states.map((state) => [
    state.name,
    [...state.lgas].sort((left, right) => left.localeCompare(right)),
  ]),
);
