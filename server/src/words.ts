import type { Language, WordCategory } from './types.js';

export interface CategorizedWords {
  animals: string[];
  objects: string[];
  food: string[];
  places: string[];
}

export const DICTIONARY: Record<Language, CategorizedWords> = {
  en: {
    animals: [
      'alligator', 'ant', 'bear', 'bee', 'butterfly', 'cat', 'chicken', 'cow', 'crab',
      'dinosaur', 'dog', 'dolphin', 'dragon', 'duck', 'elephant', 'fish', 'frog',
      'giraffe', 'horse', 'jellyfish', 'kangaroo', 'lion', 'monkey', 'octopus', 'owl',
      'panda', 'parrot', 'penguin', 'rabbit', 'seahorse', 'shark', 'spider', 'squirrel',
      'starfish', 'swan', 'tiger', 'turtle', 'unicorn', 'whale', 'zebra'
    ],
    objects: [
      'airplane', 'anchor', 'astronaut', 'backpack', 'balloon', 'bicycle', 'book',
      'camera', 'campfire', 'candle', 'car', 'chair', 'clock', 'compass', 'computer',
      'crown', 'drum', 'fire truck', 'fireworks', 'glasses', 'globe', 'guitar',
      'hammer', 'hat', 'helicopter', 'key', 'kite', 'ladder', 'lamp', 'laptop',
      'mailbox', 'microphone', 'mirror', 'motorcycle', 'paintbrush', 'paper plane',
      'piano', 'robot', 'rocket', 'satellite', 'scissors', 'shoe', 'skateboard',
      'snowman', 'sock', 'spaceship', 'submarine', 'sunglasses', 'telescope', 'tent',
      'toothbrush', 'train', 'trophy', 'umbrella', 'violin', 'windmill'
    ],
    food: [
      'apple', 'avocado', 'banana', 'birthday cake', 'bread', 'carrot', 'cheese',
      'coffee', 'cookie', 'cupcake', 'donut', 'hamburger', 'hot dog', 'ice cream',
      'lemon', 'orange', 'pineapple', 'pizza', 'popcorn', 'pumpkin', 'sandwich',
      'strawberry', 'taco', 'watermelon'
    ],
    places: [
      'beach', 'bridge', 'cactus', 'castle', 'cloud', 'forest', 'house', 'island',
      'lighthouse', 'moon', 'mountain', 'mushroom', 'planet', 'rainbow', 'sandcastle',
      'sunflower', 'tornado', 'tree', 'volcano'
    ]
  },
  es: {
    animals: [
      'águila', 'ballena', 'caballo', 'cebra', 'conejo', 'delfín', 'elefante', 'gato',
      'jirafa', 'león', 'lobo', 'mono', 'oso', 'pájaro', 'pato', 'pingüino', 'rana',
      'serpiente', 'tiburón', 'tigre', 'toro', 'tortuga', 'vaca', 'zorro'
    ],
    objects: [
      'avión', 'barco', 'bicicleta', 'cámara', 'carro', 'cepillo', 'cohete', 'computadora',
      'corona', 'escalera', 'espejo', 'guitarra', 'lámpara', 'libro', 'llave', 'mochila',
      'paraguas', 'pelota', 'reloj', 'robot', 'silla', 'teléfono', 'tijeras', 'tren'
    ],
    food: [
      'arroz', 'café', 'chocolate', 'fresa', 'galleta', 'hamburguesa', 'helado', 'huevo',
      'manzana', 'naranja', 'pan', 'pastel', 'pescado', 'pizza', 'plátano', 'queso',
      'sándwich', 'sopa', 'taco', 'tomate', 'uva'
    ],
    places: [
      'aeropuerto', 'bosque', 'casa', 'castillo', 'cueva', 'desierto', 'escuela', 'estadio',
      'faro', 'hospital', 'iglesia', 'isla', 'montaña', 'parque', 'playa', 'puente', 'volcán'
    ]
  },
  fr: {
    animals: [
      'aigle', 'baleine', 'canard', 'chat', 'cheval', 'chien', 'dauphin', 'éléphant',
      'girafe', 'grenouille', 'lapin', 'lion', 'loup', 'manchot', 'oiseau', 'ours',
      'poisson', 'renard', 'requin', 'serpent', 'singe', 'tigre', 'tortue', 'vache', 'zèbre'
    ],
    objects: [
      'avion', 'ballon', 'bateau', 'bicyclette', 'caméra', 'chapeau', 'clé', 'fusée',
      'guitare', 'horloge', 'lampe', 'livre', 'lunettes', 'miroir', 'ordinateur', 'parapluie',
      'piano', 'robot', 'sac à dos', 'chaise', 'téléphone', 'train', 'voiture'
    ],
    food: [
      'ananas', 'banane', 'café', 'chocolat', 'croissant', 'fraise', 'fromage', 'gâteau',
      'glace', 'pain', 'pomme', 'pizza', 'salade', 'sandwich', 'soupe', 'tomate'
    ],
    places: [
      'aéroport', 'château', 'désert', 'école', 'forêt', 'gare', 'hôpital', 'hôtel',
      'île', 'maison', 'montagne', 'musée', 'parc', 'phare', 'plage', 'pont', 'volcan'
    ]
  },
  de: {
    animals: [
      'Adler', 'Affe', 'Bär', 'Delfin', 'Elefant', 'Ente', 'Fisch', 'Frosch', 'Fuchs',
      'Giraffe', 'Hase', 'Hund', 'Katze', 'Kuh', 'Löwe', 'Pferd', 'Pinguin', 'Schildkröte',
      'Schlange', 'Tiger', 'Vogel', 'Wal', 'Wolf', 'Zebra'
    ],
    objects: [
      'Auto', 'Ball', 'Bleistift', 'Buch', 'Brille', 'Fahrrad', 'Flugzeug', 'Gitarre',
      'Handy', 'Hut', 'Kamera', 'Lampe', 'Messer', 'Rakete', 'Regenschirm', 'Roboter',
      'Rucksack', 'Schere', 'Schlüssel', 'Schiff', 'Spiegel', 'Stuhl', 'Tisch', 'Uhr', 'Zug'
    ],
    food: [
      'Apfel', 'Banane', 'Brot', 'Burger', 'Ei', 'Eis', 'Erdbeere', 'Kaffee', 'Käse',
      'Keks', 'Kuchen', 'Pizza', 'Pommes', 'Salat', 'Sandwich', 'Schokolade', 'Suppe', 'Tomate'
    ],
    places: [
      'Bahnhof', 'Berg', 'Brücke', 'Burg', 'Flughafen', 'Haus', 'Höhle', 'Hotel',
      'Insel', 'Kirche', 'Krankenhaus', 'Museum', 'Park', 'Schule', 'Strand', 'Vulkan', 'Wald', 'Wüste'
    ]
  }
};

// Flattened English words for backward compatibility with existing tests
export const WORDS = [
  ...DICTIONARY.en.animals,
  ...DICTIONARY.en.objects,
  ...DICTIONARY.en.food,
  ...DICTIONARY.en.places,
];

export function getWordPool(category: WordCategory = 'all', language: Language = 'en'): string[] {
  const langDict = DICTIONARY[language] || DICTIONARY.en;
  if (category === 'all' || !langDict[category]) {
    return [
      ...langDict.animals,
      ...langDict.objects,
      ...langDict.food,
      ...langDict.places,
    ];
  }
  return langDict[category];
}

export function chooseWords(
  count: number,
  used: Set<string>,
  category: WordCategory = 'all',
  language: Language = 'en'
): string[] {
  const fullPool = getWordPool(category, language);
  const available = fullPool.filter((word) => !used.has(word.toLowerCase()));
  const pool = available.length >= count ? [...available] : [...fullPool];

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
