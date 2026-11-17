export const HOSTS = ['rocco', 'pebble', 'june'] as const
export type Host = (typeof HOSTS)[number]

export const HOST_CHOICES = ['random', ...HOSTS] as const
export type HostChoice = (typeof HOST_CHOICES)[number]
/** The order host choices are listed in (Random last, as in the mockups). Display only: HOST_CHOICES keeps its order for the schema. */
export const HOST_CHOICES_SHOWN: readonly HostChoice[] = [...HOSTS, 'random']

export const EXPRESSIONS = ['greeting', 'asking', 'waiting', 'cheering', 'consoling', 'relaxing'] as const
export type Expression = (typeof EXPRESSIONS)[number]

export const ANIMAL_AVATARS = [
  'giant-pacific-octopus',
  'moray-eel',
  'mystery',
  'pacific-seahorse',
  'penguin-chick',
] as const
export type AnimalAvatar = (typeof ANIMAL_AVATARS)[number]
