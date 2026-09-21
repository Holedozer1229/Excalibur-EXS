// Long-form, query-focused body copy for the highest-potential tarot cards.
// Each entry is 400–600 words split into intro / upright / reversed / context,
// written to satisfy the "<Card> tarot card meaning" search intent.

export interface LongformSection {
  heading: string;
  paragraphs: string[];
}

export interface TarotLongform {
  intro: string;
  upright: LongformSection;
  reversed: LongformSection;
  context: LongformSection;
}

export const TAROT_LONGFORM: Record<string, TarotLongform> = {
  "the-moon": {
    intro:
      "The Moon is the eighteenth card of the Major Arcana and one of the most atmospheric cards in the tarot. Where The Sun offers clarity, The Moon offers the tide — the pull of dream, memory, and half-seen truth. When The Moon appears in a reading, you are being asked to trust the part of you that knows without evidence, and to be careful with the part of you that mistakes fear for fact.",
    upright: {
      heading: "The Moon upright meaning",
      paragraphs: [
        "Upright, The Moon points to the dreamlike layer of a situation. Something in your life is not what it seems on the surface — not because anyone is lying, but because the truth has not yet finished forming. Intuition, dream imagery, and stray coincidences are your best data right now. Journal them. Don't demand that they make sense yet.",
        "In love, The Moon upright can describe a relationship where feelings run deep but neither person is naming them clearly. In work, it often marks a project whose shape you sense before you can defend it — protect it from premature critique and let it develop. In shadow work, The Moon lights the doorway to material you have not looked at directly: old fears, inherited patterns, the ancestral undertow.",
        "The classical imagery — two towers, a dog and a wolf howling, a crayfish crawling from the pool — is a map of the psyche moving between the tame and the wild. The Moon does not ask you to pick a side. It asks you to walk the path between them without pretending the wildness isn't there.",
      ],
    },
    reversed: {
      heading: "The Moon reversed meaning",
      paragraphs: [
        "Reversed, The Moon usually signals one of two shifts. Either the fog is lifting — a truth you sensed for weeks is finally surfacing, and you can act on what you now clearly see — or the fog is thickening in a way you can name: anxiety, projection, imagined worst-cases dressed as intuition.",
        "The distinction matters. Genuine intuition tends to feel steady and slightly boring; anxiety tends to feel urgent and cinematic. If a fear is looping, The Moon reversed is telling you it is your fear talking, not your knowing. In relationships, this reversal often reveals a suspicion as unfounded, or, conversely, confirms what was suspected all along. In creative work, it marks the moment a vague idea becomes describable to another person.",
      ],
    },
    context: {
      heading: "How to read The Moon in a spread",
      paragraphs: [
        "The Moon is contextual. Next to The Sun or The Star, it softens — dream is on its way to clarity. Next to The Devil, The Tower, or the Nine of Swords, it sharpens: the shadow material is asking to be worked with directly. In a past-present-future spread, The Moon in the past often describes a period of confusion you have already outgrown; in the future, it is a request to slow down and gather more information before committing.",
        "If you drew The Moon as your card of the day, do not make a large decision on impulse. Sleep on it. Write down your dreams. Notice what image, animal, or phrase repeats to you between now and tomorrow — that repetition is The Moon's actual message.",
      ],
    },
  },

  "the-sun": {
    intro:
      "The Sun is the nineteenth card of the Major Arcana and the tarot's brightest signal. Where The Moon holds mystery, The Sun holds visibility — warmth, vitality, the plain gladness of a thing being what it is. When The Sun appears in a reading, something in your life is ready to be seen, celebrated, and stated out loud.",
    upright: {
      heading: "The Sun upright meaning",
      paragraphs: [
        "Upright, The Sun is one of the most straightforwardly positive cards in the deck. It marks clarity after confusion, health after illness, honesty after evasion. Whatever you have been working on is beginning to show its true colors — and the true colors are good. Trust that the good news is real, and let yourself receive it without immediately looking for a catch.",
        "In love, The Sun upright reads as warmth without pretense — a relationship that lets both people be childlike, playful, and unguarded. In work, it can indicate public recognition, a launch that lands well, or an offer that will still look good in six months. In healing, it is the card of returning energy: appetite, laughter, and the wish to be around people again.",
        "The card's traditional imagery — a naked child on a white horse under a golden sun — is a picture of nothing hidden. The Sun's core instruction is to stop rehearsing your life in shadow and step into the field where it actually happens.",
      ],
    },
    reversed: {
      heading: "The Sun reversed meaning",
      paragraphs: [
        "Reversed, The Sun rarely turns cruel — it dims. You may be temporarily disconnected from something that usually gladdens you. The joy is still there, but a cloud has moved across it: burnout, over-scheduling, a small betrayal, or the ache of comparing your life to a curated version of someone else's.",
        "The Sun reversed can also warn about overexposure — sharing too soon, promising more than the moment can hold, or letting confidence tip into arrogance. The remedy is small and physical: sunlight on skin, water, sleep, a walk, an honest conversation with one person you trust. The Sun does not want to be argued back into brightness. It wants to be lived back into it.",
      ],
    },
    context: {
      heading: "How to read The Sun in a spread",
      paragraphs: [
        "The Sun amplifies whatever it neighbors. Next to Cups it means love that is being expressed, not merely felt. Next to Pentacles, it means work that will be paid and recognized. Next to Swords, it can mean a hard truth said kindly — and received. Even beside difficult cards it lightens them: The Tower with The Sun is a collapse that leads directly to a better life.",
        "If you drew The Sun as your card of the day, take up more room than usual. Say the thing. Wear the color. Make the introduction. This is not a day for cleverness; it is a day for warmth.",
      ],
    },
  },

  "the-hermit": {
    intro:
      "The Hermit is the ninth card of the Major Arcana and the tarot's quiet teacher. He stands on a mountain, alone, holding a lantern lit by a single star. When The Hermit appears in a reading, you are being asked to withdraw not from your life but from its noise, so that you can hear what you actually think.",
    upright: {
      heading: "The Hermit upright meaning",
      paragraphs: [
        "Upright, The Hermit means solitude in service of understanding. This is not loneliness and it is not avoidance — it is the deliberate step back that turns experience into wisdom. You may need a weekend without your phone, a walk without a destination, a season without new commitments. The answer you are looking for is not further out; it is further in.",
        "In love, The Hermit often marks a period where one or both people need space to become themselves again before the relationship can move forward. In work, it favors research, study, and craft over networking and launch. In grief or transition, The Hermit is the card that gives you permission to take as long as you need.",
        "The lantern in the Hermit's hand contains a six-pointed star — light he made from his own patience. His message is that inner light is a real light. It can be lit, tended, and lent to someone else. But it cannot be borrowed in a hurry.",
      ],
    },
    reversed: {
      heading: "The Hermit reversed meaning",
      paragraphs: [
        "Reversed, The Hermit usually means one of two things. Either you have withdrawn too far and the solitude has soured into isolation — the mountain has stopped teaching you and started numbing you — or you have refused solitude when you clearly needed it, and are trying to think your way through an issue that only silence can resolve.",
        "The Hermit reversed can also point to a teacher, mentor, or elder whose counsel is worth seeking, or to your own inner authority being ignored in favor of louder outside voices. The corrective is precise: if you have been alone, invite one trusted person in. If you have been surrounded, close the door for an evening. The medicine is whichever one you have been avoiding.",
      ],
    },
    context: {
      heading: "How to read The Hermit in a spread",
      paragraphs: [
        "The Hermit slows down a reading. Next to the Wands, he cools their fire into direction. Next to the Cups, he asks whether a feeling has been fully felt. Next to the Pages, he says the youngest energy in the reading needs an elder — a book, a teacher, a lineage. In a career spread, The Hermit is often the card that suggests a sabbatical, a certification, or a season of deep skill-building over another job hop.",
        "If you drew The Hermit as your card of the day, protect a single hour. No inputs, no output. Sit with the question you have been outrunning. The answer, when it comes, will be quiet and unmistakable.",
      ],
    },
  },

  "strength": {
    intro:
      "Strength is the eighth card of the Major Arcana in most modern decks and one of the tarot's most misunderstood cards. Its picture — a woman calmly closing a lion's jaws with her bare hands — is not a scene of domination. It is a scene of a fierce thing meeting a gentler thing and choosing to be met. When Strength appears in a reading, you are being asked to lead with softness on purpose.",
    upright: {
      heading: "Strength upright meaning",
      paragraphs: [
        "Upright, Strength is quiet courage, self-mastery, and the capacity to hold your own intensity without letting it run the room. It is the strength of the person who does not need to raise their voice, the athlete who has trained past adrenaline, the parent who does not match a child's tantrum. The card asks: can you stay with what is difficult here without either fleeing it or forcing it?",
        "In love, Strength describes a relationship where both people have learned to name a feeling before it becomes a fight. In work, it favors long games — building a body of work, holding boundaries kindly, refusing the false urgency of other people's panic. In healing, Strength is the card of learning that your appetites — for food, attention, risk, sex, distraction — are not enemies. They are the lion. They can be met.",
        "The infinity symbol above the woman's head is not decoration. It is the card's core instruction: your capacity is renewable if you don't force it.",
      ],
    },
    reversed: {
      heading: "Strength reversed meaning",
      paragraphs: [
        "Reversed, Strength usually points to one of two imbalances. Either you are white-knuckling a situation that only tenderness could resolve — trying to force what needs to be soothed — or you have collapsed into softness where a firm no was the whole answer. Self-doubt, self-abandonment, and the habit of shrinking to keep the peace all live here.",
        "Strength reversed can also mark a burnout point: the reserves you have been drawing on are actually finite, and the body is starting to send the bill. The remedy is not to try harder. It is to eat, sleep, feel, and then act from a rested nervous system. The lion is not a problem to be defeated. It is a part of you asking to be led.",
      ],
    },
    context: {
      heading: "How to read Strength in a spread",
      paragraphs: [
        "Strength changes tone next to its neighbors. Beside The Chariot, it says: win by mastering yourself, not the field. Beside The Devil, it says: the compulsion loses power the moment you stop being ashamed of it. Beside Cups, it names emotional maturity; beside Swords, it names the discipline to think before speaking.",
        "If you drew Strength as your card of the day, the assignment is small and exact: notice one moment when your impulse is to harden, and choose to soften instead — without abandoning what you want. That is the whole card.",
      ],
    },
  },

  "the-high-priestess": {
    intro:
      "The High Priestess is the second card of the Major Arcana and the tarot's keeper of the inner voice. She sits between two pillars — one black, one white — with a veil of pomegranates behind her and a scroll partly hidden in her lap. When The High Priestess appears in a reading, you are being told that the answer already exists inside you, and that you have not been quiet enough to hear it.",
    upright: {
      heading: "The High Priestess upright meaning",
      paragraphs: [
        "Upright, The High Priestess means intuition, mystery, and the honoring of what has not yet been spoken. She is the card that says: don't fill this silence. Something wants to arrive in it. She favors dreams over analysis, patience over performance, and the small still voice over the loud confident one.",
        "In love, The High Priestess often marks a connection where more is being felt than said — sometimes healthily, sometimes not. She asks whether the unspoken is sacred or simply avoided. In work, she rewards research, discernment, and the willingness to sit on a decision one more night. In spiritual life, she is the card of practice: the meditation cushion, the daily journal, the walk without a podcast.",
        "The scroll in her lap is labeled Tora — partially hidden, deliberately. The High Priestess never gives you the whole book at once. She gives you the page you can actually read today.",
      ],
    },
    reversed: {
      heading: "The High Priestess reversed meaning",
      paragraphs: [
        "Reversed, The High Priestess almost always means the same thing in a different key: you have stopped listening to yourself. It may show up as second-guessing a clear inner no, ignoring a body signal, over-consulting other people, or drowning intuition in information. The card is not scolding — it is inviting you back.",
        "The High Priestess reversed can also mark secrets under pressure. Something is being kept quiet that wants to be told, or something is being told that wanted to be kept quiet. In either case, the corrective is a period of deliberate silence: no advice, no scrolling, no explaining yourself. Sit with the question until your own answer becomes audible again.",
      ],
    },
    context: {
      heading: "How to read The High Priestess in a spread",
      paragraphs: [
        "The High Priestess deepens whatever she neighbors. Next to The Magician, she reminds you that will without listening is noise. Next to The Lovers, she asks whether the choice is being made from knowing or from wanting to be chosen. Next to Swords, she cautions against thinking your way out of something the body has already decided.",
        "If you drew The High Priestess as your card of the day, do less. Move the appointment. Delay the reply. Take the long way home. The answer you need is not being withheld from you — it is being waited on. Give it the quiet it asked for.",
      ],
    },
  },
};

export const getTarotLongform = (slug: string): TarotLongform | undefined =>
  TAROT_LONGFORM[slug];
