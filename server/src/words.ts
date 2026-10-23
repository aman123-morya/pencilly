// Kept locally: game rounds must not depend on a remote word API.
export const WORDS = [
  'apple', 'airplane', 'alligator', 'anchor', 'ant', 'astronaut', 'avocado',
  'backpack', 'balloon', 'banana', 'basketball', 'beach', 'bear', 'bee', 'bicycle',
  'birthday cake', 'book', 'bread', 'bridge', 'butterfly', 'cactus', 'camera',
  'campfire', 'candle', 'car', 'carrot', 'castle', 'cat', 'chair', 'cheese',
  'chicken', 'clock', 'cloud', 'coffee', 'compass', 'computer', 'cookie',
  'cow', 'crab', 'crown', 'cupcake', 'dinosaur', 'dog', 'dolphin', 'donut',
  'dragon', 'drum', 'duck', 'elephant', 'eye', 'feather', 'fire truck',
  'fireworks', 'fish', 'flower', 'football', 'forest', 'frog', 'giraffe',
  'glasses', 'globe', 'guitar', 'hamburger', 'hammer', 'hat', 'heart',
  'helicopter', 'horse', 'hot dog', 'house', 'ice cream', 'island', 'jellyfish',
  'kangaroo', 'key', 'kite', 'ladder', 'lamp', 'laptop', 'lemon', 'lighthouse',
  'lion', 'mailbox', 'microphone', 'mirror', 'monkey', 'moon', 'motorcycle',
  'mountain', 'mushroom', 'octopus', 'orange', 'owl', 'paintbrush', 'panda',
  'paper plane', 'parrot', 'penguin', 'piano', 'pineapple', 'pizza', 'planet',
  'popcorn', 'pumpkin', 'rabbit', 'rainbow', 'robot', 'rocket', 'sandcastle',
  'sandwich', 'satellite', 'scissors', 'seahorse', 'shark', 'shoe', 'skateboard',
  'snowman', 'sock', 'spaceship', 'spider', 'squirrel', 'starfish', 'strawberry',
  'submarine', 'sunflower', 'sunglasses', 'swan', 'taco', 'telescope', 'tent',
  'tiger', 'toothbrush', 'tornado', 'train', 'tree', 'trophy', 'turtle',
  'umbrella', 'unicorn', 'violin', 'volcano', 'watermelon', 'whale', 'windmill',
  'wizard', 'zebra'
];

export function chooseWords(count: number, used: Set<string>): string[] {
  const available = WORDS.filter((word) => !used.has(word));
  const pool = available.length >= count ? available : [...WORDS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
