export interface Option {
  a: string;
  b: string;
  c: string;
  d: string;
  e?: string;
}

export interface JambQuestion {
  id: number;
  question: string;
  option: Option;
  section: string;
  image: string;
  answer: string;
  solution: string;
  examtype: string;
  examyear: string;
  questionNub: number | null;
  hasPassage: number;
  category: string;
}

export const ENGLISH_ARCHIVE: JambQuestion[] = [
  {
    "id": 271,
    "question": "His loss suddenly became <i>redeemable</i> ",
    "option": {
      "a": "Incurable  ",
      "b": "exclusive",
      "c": "recoverable ",
      "d": "repulsive",
      "e": ""
    },
    "section": "choose the option nearest in meaning to the word or phrase in italics",
    "image": "",
    "answer": "c",
    "solution": "",
    "examtype": "utme",
    "examyear": "2006",
    "questionNub": null,
    "hasPassage": 0,
    "category": "others"
  },
  {
    "id": 674,
    "question": "YOUR sister should come with us tomorrow?",
    "option": {
      "a": "Should your brother come with us tomorrow?",
      "b": "Should our brother come with us tomorrow?",
      "c": "Should Ado's sister come with us tomorrow?",
      "d": "Should my sister come with us tomorrow?",
      "e": ""
    },
    "section": "<b>In each of questions 78 to 80, the word in capital letters has an emphatic stress. Choose the option that best fits the expression in the sentence.</b>",
    "image": "",
    "answer": "c",
    "solution": "In answering questions on emphatic stress, the statement which contradicts the emphasized word is usually the correct option.\n\nFrom the question above, the emphatic stress is placed on 'YOUR', and the option which contradicts it, is option 'C'.\n\nShould ADO's sister come with us tomorrow? No!\n\nYOUR sister should come with us tomorrow?",
    "examtype": "utme",
    "examyear": "2001",
    "questionNub": 78,
    "hasPassage": 0,
    "category": "others"
  },
  {
    "id": 974,
    "question": "I want to .......this chance to acquaint you the latest development?",
    "option": {
      "a": "size",
      "b": "seize",
      "c": "sieze",
      "d": "cease",
      "e": ""
    },
    "section": "<b>In each of the questions 64 to 83, choose the option that best completes the gap(s).</b> \n",
    "image": "",
    "answer": "b",
    "solution": "I want to  seize  this chance to acquaint you the latest development?\n\nseize; to take (an opportunity) eagerly and decisively.",
    "examtype": "utme",
    "examyear": "2011",
    "questionNub": 79,
    "hasPassage": 0,
    "category": "others"
  },
  {
    "id": 806,
    "question": "The writer seems to suggest that",
    "option": {
      "a": " nigerians do not understand the sense in deregulation",
      "b": " the anxiety caused by the deregulation queation is groundless",
      "c": " a deregulation economy will cause the government to be indifferent to the plight of ordinary nigerians",
      "d": "only a heartless cartel will benefit bt the deregulation of the oil industry",
      "e": ""
    },
    "section": "Those who have been following the argument for and against the deregulation of the oil industry in Nigeria may have got the impression that deregulation connotes lack of control or indifference on the part of the government. But there is nothing so far from official quarters to suggest that deregulation will cause the government to relinquish its control of the oil industry because the absence of direct control does not mean that it will surrender all its rights to the entrepreneurs who may want to participate in the industry. Yet the opposition expressed so far against stems from the fear that the government would leave Nigerians at the mercy of a heartless cartel who would command the heights of the oil industry and cause pump price of fuel to rise above the means of most Nigerians.<br><br> As a result of such fears, many Nigerians have become resentful of deregulation and in fact the Nigeria Labour Congress (NLC) has threatened to ‘deregulate’ the government if it should go ahead with the deregulation plan. But Nigerians have not fared any better with the economy totally in government control. Until recently, the most important sectors of the economy were in the hands of the government. Today, the deregulation of some of these sectors has broken its monopoly and introduced healthy competition to make a little easier for Nigerians. A good example is the breaking of the stifling monopoly of Nigeria Airways. Today, the traveller is king at the domestic airports as opposed to the struggle that air travels used to be under Nigeria Airways monopoly. Before, it was almost easier for a camel to pass through the eye of a needle than for travellers to board a plane.",
    "image": "",
    "answer": "b",
    "solution": "",
    "examtype": "utme",
    "examyear": "2002",
    "questionNub": 10,
    "hasPassage": 1,
    "category": "passage-b"
  },
  {
    "id": 1450,
    "question": "The novel places emphasis on the",
    "option": {
      "a": "need for strict parenting and schooling for children",
      "b": " social disparity between the rich and the poor in the society",
      "c": "relevance of bridging the communication gap between children and their parents",
      "d": "abnormalities of the society and the confusion that comes with childishness",
      "e": ""
    },
    "section": "<b>Questions below are based on Bolaji Abdullahi's \"Sweet Sixteen\"</b>",
    "image": "",
    "answer": "c",
    "solution": "The writer appreciates the maintenance of close relationship between Aliya and her father. Her father was more or less her friend. This made for a fine balance of personal development for Aliya as her father guides her constantly on the realities of life, sexual maturity and exposition as well the need to excel in life.",
    "examtype": "utme",
    "examyear": "2019",
    "questionNub": 77,
    "hasPassage": 0,
    "category": "others"
  },
  {
    "id": 1048,
    "question": "There are still <u>virtuous</u> women in our society today",
    "option": {
      "a": "clever",
      "b": "upright",
      "c": "devilsh",
      "d": "intelligent",
      "e": ""
    },
    "section": "In each of the questions 51 to 65 choose the option <b>nearest in meaning</b> to the underlined word or phrase.",
    "image": "",
    "answer": "b",
    "solution": "virtuous; having or showing high moral standards.",
    "examtype": "utme",
    "examyear": "2012",
    "questionNub": 54,
    "hasPassage": 0,
    "category": "others"
  },
  {
    "id": 648,
    "question": "When Ajike met her ..... husband at the party, she felt like reconciling with him?",
    "option": {
      "a": "estranged",
      "b": "strange",
      "c": "carring",
      "d": "loving",
      "e": ""
    },
    "section": "<b>In each of the questions 32 to 56, fill the each gap with the most appropriate option from the list option from the list provided.</b>",
    "image": "",
    "answer": "a",
    "solution": "",
    "examtype": "utme",
    "examyear": "2001",
    "questionNub": 52,
    "hasPassage": 0,
    "category": "others"
  },
  {
    "id": 327,
    "question": "The Vice-Chancellor <i>relinquished</i> power at the end of busterm ",
    "option": {
      "a": "abandoned   ",
      "b": "wielded  ",
      "c": "gave up",
      "d": " clung on to.",
      "e": ""
    },
    "section": "choose the option opposite in meaning to the word or phrase in italics.",
    "image": "",
    "answer": "d",
    "solution": "",
    "examtype": "utme",
    "examyear": "2007",
    "questionNub": null,
    "hasPassage": 0,
    "category": "others"
  },
  {
    "id": 221,
    "question": "Your mother CAN cook the meal",
    "option": {
      "a": " Who will cook the meal?",
      "b": "Can my father cook the meal?",
      "c": "Isn't my mother able to cook the meal7",
      "d": "What can my mother do?",
      "e": ""
    },
    "section": "the word in capital letters has the emphatic stress. Choose the option to which the given sentence relates",
    "image": "",
    "answer": "c",
    "solution": "",
    "examtype": "utme",
    "examyear": "2005",
    "questionNub": null,
    "hasPassage": 0,
    "category": "others"
  },
  {
    "id": 873,
    "question": "His meteoric rise to fame surprise everyone?",
    "option": {
      "a": "His rise to fame was only temporary",
      "b": "People were amazed at his rapid success",
      "c": "He became successful very suddenly",
      "d": "He rose to the top quite unexpectedly",
      "e": ""
    },
    "section": "<b>In each of questions 76 to 80, select the option that best explains the information conveyed in the sentence.</b>\n",
    "image": "",
    "answer": "b",
    "solution": "",
    "examtype": "utme",
    "examyear": "2002",
    "questionNub": 77,
    "hasPassage": 0,
    "category": "others"
  },
  {
    "id": 1175,
    "question": "If you are confused.......anything, phone my office",
    "option": {
      "a": "of",
      "b": "with",
      "c": "about",
      "d": "for",
      "e": ""
    },
    "section": "<b>In each of question 66 to 85, choose the option that best completes the gap (s)</b>\n",
    "image": "",
    "answer": "c",
    "solution": "About is correct.\n\"Confused with\", is generally used when you fail to distinguish or mistake one for an other. For example, 'I always confuse Tanya with her sister'.\nOn the other hand, \"Confused about\" is used when 'confuse' is given it's literal meaning. For example, \"I am confused about what to do with this degree that I've got\".",
    "examtype": "utme",
    "examyear": "2013",
    "questionNub": 83,
    "hasPassage": 0,
    "category": "others"
  },
  {
    "id": 1271,
    "question": "Who introduced the snail delicacy?",
    "option": {
      "a": "Salma",
      "b": "Ngozi",
      "c": "Ada",
      "d": "Tomiwa",
      "e": ""
    },
    "section": "This question is based on Khadijat Abubakar Jalli's novel, \"The Life Changer\"",
    "image": "",
    "answer": "d",
    "solution": "",
    "examtype": "utme",
    "examyear": "2022",
    "questionNub": 18,
    "hasPassage": 0,
    "category": "others"
  },
  {
    "id": 801,
    "question": "From the passage, which of these is a disadvantage of defining by enumerating?",
    "option": {
      "a": "enumeration always leave doubts in the mind of the speaker",
      "b": "the words or objects listed may not all share similar characteristics",
      "c": "the property and examples enumerated may not be all inclusive",
      "d": "many important members of the group may be left out of the enumeration",
      "e": ""
    },
    "section": "If our thoughts is to be clear and we are to succeed in communicating it to other people, we must have some method of fixing the meaning of the words we use...",
    "image": "",
    "answer": "c",
    "solution": "",
    "examtype": "utme",
    "examyear": "2002",
    "questionNub": 5,
    "hasPassage": 1,
    "category": "passage-a"
  },
  {
    "id": 893,
    "question": "The evidence the leader gave was <u>incontrovertible</u>?",
    "option": {
      "a": "indulbitable",
      "b": "contestable",
      "c": "practicable",
      "d": "logical",
      "e": ""
    },
    "section": "<b>In each of questions 86 to 100, choose the option opposite in meaning to the underlined word(s).</b>",
    "image": "",
    "answer": "b",
    "solution": "",
    "examtype": "utme",
    "examyear": "2002",
    "questionNub": 97,
    "hasPassage": 0,
    "category": "others"
  },
  {
    "id": 1345,
    "question": "ll the people in the bus died in that _________  accident",
    "option": {
      "a": "serious",
      "b": "reckless",
      "c": "fatal",
      "d": "dangerous",
      "e": ""
    },
    "section": "From the words lettered A to D, choose the word or group of words that best completes each of the following sentences.",
    "image": "",
    "answer": "c",
    "solution": "Option C, Fatal best qualifies the noun 'accident'",
    "examtype": "utme",
    "examyear": "2020",
    "questionNub": 32,
    "hasPassage": 0,
    "category": "others"
  },
  {
    "id": 845,
    "question": "Didn't ......... draw your attention to the entry requirements?",
    "option": {
      "a": "anyone",
      "b": "someone",
      "c": "somebody",
      "d": "everyone",
      "e": ""
    },
    "section": "<b>LEXIS, STRUCTURE AND ORAL FORMS (Questions 26 to 75 carry 1 mark each)...</b>",
    "image": "",
    "answer": "a",
    "solution": "",
    "examtype": "utme",
    "examyear": "2002",
    "questionNub": 49,
    "hasPassage": 0,
    "category": "others"
  },
  {
    "id": 580,
    "question": "  Based on the facts before me, I have no alternative...........to hold you responsible ",
    "option": {
      "a": "only ",
      "b": "as ",
      "c": "than ",
      "d": "but",
      "e": ""
    },
    "section": "choose the option that best completes the gap(s)",
    "image": "",
    "answer": "c",
    "solution": "",
    "examtype": "utme",
    "examyear": "2010",
    "questionNub": null,
    "hasPassage": 0,
    "category": "others"
  },
  {
    "id": 476,
    "question": "The president has mapped out so many <i>laudable</i> projects to embark upon ",
    "option": {
      "a": "laughable   ",
      "b": "good",
      "c": " praiseworthy   ",
      "d": "valuable.",
      "e": ""
    },
    "section": "choose the option nearest in meaning to the word or phrase in italics.",
    "image": "",
    "answer": "c",
    "solution": "",
    "examtype": "utme",
    "examyear": "2009",
    "questionNub": null,
    "hasPassage": 0,
    "category": "others"
  }
];

export function getGroupedQuestions() {
  const grouped: Record<string, JambQuestion[]> = {};
  
  ENGLISH_ARCHIVE.forEach(q => {
    if (!grouped[q.examyear]) {
      grouped[q.examyear] = [];
    }
    grouped[q.examyear].push(q);
  });

  return Object.entries(grouped)
    .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
    .map(([year, questions]) => ({ year, questions }));
}
