export interface Topic {
  sn: string;
  topic: string;
  objectives: string[];
  examType: 'WAEC' | 'NECO' | 'JAMB';
  subject: string;
}

const financialAccountingData: Omit<Topic, 'examType' | 'subject'>[] = [
  {
    sn: "1",
    topic: "Introduction to Financial Accounting",
    objectives: ["History, nature and functions of Accounting.", "Users of Accounting information.", "Stages in the Accounting process.", "Characteristics of Accounting information."]
  },
  {
    sn: "2",
    topic: "The Accounting Equation and Double Entry Principles",
    objectives: ["Accounting Equation.", "Purpose and functions of source documents.", "Subsidiary books.", "The ledger: classification of Accounts.", "Cash Book: analytical cash book, including petty cash book.", "Preparation of Trial Balance.", "Bank Reconciliation Statements.", "Correction of errors and Suspense Account."]
  },
  {
    sn: "3",
    topic: "Accounting Concepts",
    objectives: ["Meaning.", "Types.", "Significance.", "Limitations."]
  },
  {
    sn: "4",
    topic: "The Final Accounts of a Sole Trader/proprietorship",
    objectives: ["Trading, profit and loss accounts/Income statement.", "Balance sheet/statement of financial position.", "Adjustments to final accounts."]
  },
  {
    sn: "5",
    topic: "Provisions and Reserves",
    objectives: ["Provision for doubtful debts/Allowance for doubtful debts.", "Provision for discounts.", "Depreciation – concepts, reasons for recording and methods: (i) straight line; (ii) reducing balance; (iii) sum of the years digits; (iv) revaluation.", "Accounting for depreciation.", "Reserves – revenue and capital reserves."]
  },
  {
    sn: "6",
    topic: "Manufacturing Accounts",
    objectives: ["Purpose of Manufacturing Accounts.", "Cost classification in Manufacturing Accounts.", "Preparation of final Accounts of Manufacturing concern."]
  },
  {
    sn: "7",
    topic: "Control Accounts and Self-balancing Ledgers",
    objectives: ["Meaning and uses of control accounts.", "Types: (i) sales ledger control (ii) purchases ledger control", "Preparation of Control Accounts.", "Reconciliation of Control Accounts."]
  },
  {
    sn: "8",
    topic: "Single Entry and Incomplete Records",
    objectives: ["Meaning and limitations.", "Computation of profit or loss from opening and closing balance sheets.", "Conversion of single entry to double entry.", "Preparation of final accounts from a set of incomplete records.", "Mark up and Margin."]
  },
  {
    sn: "9",
    topic: "Accounts of Not-for-Profit Making Organizations",
    objectives: ["Meaning and terminologies.", "Receipts and payments accounts.", "Subscriptions Account.", "Income and expenditure accounts.", "Accumulated fund.", "Balance sheet.", "Profit or loss from income-generating activities."]
  },
  {
    sn: "10",
    topic: "Partnership Accounts",
    objectives: ["Nature and formation of partnership.", "Partnership agreements/Deed.", "Profit and loss appropriation accounts.", "Partners capital account and balance sheet.", "Admission of a new partner.", "Treatment of goodwill and revaluation of assets.", "Dissolution of partnership."]
  },
  {
    sn: "11",
    topic: "Company Accounts",
    objectives: ["Nature and formation of a company.", "Types of companies and shares.", "Issue of shares.", "Loan capital, debentures/loan notes and mortgages.", "Final accounts of company for internal use only.", "Interpretation of accounts using simple ratios.", "Purchase of business account.", "Statement of Cash Flow (using direct and indirect methods)."]
  },
  {
    sn: "12",
    topic: "Accounting for Value Added Tax",
    objectives: ["Purpose of VAT.", "Characteristics of VAT.", "Bases of computing input/output VAT.", "Preparation of VAT returns.", "Exempt goods and services."]
  },
  {
    sn: "13",
    topic: "Departmental and Branch Accounts",
    objectives: ["Meaning and importance.", "Differences between a department and branch.", "Preparation of departmental account.", "Preparation of Branch Account excluding foreign branches.", "Inter branch transactions."]
  },
  {
    sn: "14",
    topic: "Public Sector Accounting",
    objectives: ["Meaning and difference between Public Sector and Private Sector Accounts.", "Sources of public revenue.", "Capital and recurrent expenditures.", "Preparation of simple government accounts."]
  },
  {
    sn: "15",
    topic: "Information Technology in Accounting",
    objectives: ["Manual and computerized Accounting Processing Systems.", "Processes involved in data processing.", "Computer Hardware and Software.", "Merits and demerits of manual and computerized accounting processing systems."]
  },
  {
    sn: "16",
    topic: "Miscellaneous Accounts",
    objectives: ["Meaning, introduction, terminologies and preparation of simple: (i) Joint Venture Accounts (ii) Consignment Accounts (iii) Contract Accounts (iv) Hire Purchase Accounts"]
  },
  {
    sn: "17",
    topic: "Financial System",
    objectives: ["Meaning and components.", "Meaning, functions and features of: (i) money market; (ii) capital market; (iii) insurance market.", "Methods of raising funds from the capital market: (i) offer for sale; (ii) offer for subscription; (iii) rights issue; (iv) private placement;", "Requirements for accessing the capital market.", "Benefits of capital market to: (i) investors; (ii) government; (iii) economy; (iv) individual company;", "Types, features and reasons for regulation."]
  }
];

const mathematicsData: Omit<Topic, 'examType' | 'subject'>[] = [
  {
    sn: "1",
    topic: "Number Bases",
    objectives: ["Conversion of bases", "Operations in different bases", "Applications"]
  },
  {
    sn: "2",
    topic: "Fractions, Decimals, Percentages",
    objectives: ["Conversion and operations", "Approximation", "Standard form"]
  }
];

const agriculturalScienceData: Omit<Topic, 'examType' | 'subject'>[] = [
  { sn: "1", topic: "Meaning and Importance of Agriculture", objectives: ["Definition and branches of agricultural science.", "Importance of agriculture to the individual, community, and nation."] },
  { sn: "2", topic: "Problems of Agricultural Development & Possible Solutions", objectives: ["Problems related to land tenure, basic amenities, finance, transportation, storage and processing facilities, agricultural education and extension, tools and machinery, farm inputs, marketing system, environmental degradation.", "Possible solutions."] },
  { sn: "3", topic: "Meaning & Difference Between Subsistence and Commercial Agriculture", objectives: ["Meaning of subsistence and commercial agriculture.", "Differences based on characteristics.", "Advantages and disadvantages.", "Problems."] },
  { sn: "4", topic: "Roles of Government in Agricultural Development", objectives: ["Agricultural finance (credit, subsidy).", "Agricultural education.", "Agricultural extension services.", "Agricultural policies and programmes."] },
  { sn: "5", topic: "Role of Non-Governmental Organizations in Agricultural Development", objectives: ["Meaning of NGOs.", "Roles of NGOs in agricultural development."] },
  { sn: "6", topic: "Agricultural Laws & Reforms", objectives: ["Land tenure systems in West Africa.", "Government laws on land use.", "Advantages/disadvantages of land use Act and reforms."] },
  { sn: "7", topic: "Meaning & Importance of Agricultural Ecology", objectives: ["Meaning of agricultural ecology and ecosystem.", "Components of farm ecosystem.", "Interactions in terrestrial and aquatic agro-ecosystem."] },
  { sn: "8", topic: "Land & Its Uses", objectives: ["Meaning of land.", "Characteristics of land.", "Uses: agricultural (crop, wildlife, livestock), non-agricultural (industry, housing, transport)."] },
  { sn: "9", topic: "Factors Affecting Land Availability for Agricultural Purpose", objectives: ["Physical factors (soil, topography, degradation, pollution).", "Economic factors (population, industry, mining, tourism).", "Socio-cultural factors (tenure system, religion)."] },
  { sn: "10", topic: "Agro-Allied Industries and Relationship Between Agriculture and Industry", objectives: ["Agro-based industries and raw materials (paper, beverage, textile, soap).", "Relationship (agriculture provides market/food to industry)."] },
  { sn: "11", topic: "Environmental Factors Affecting Crop and Animal Production & Distribution", objectives: ["Climatic factors (rainfall, temp, light, wind, humidity).", "Biotic factors (predators, pests, pathogens, weeds, interrelationships).", "Edaphic factors (soil pH, texture, structure, type)."] },
  { sn: "12", topic: "Rock Formation", objectives: ["Types of rock (igneous, sedimentary, metamorphic).", "Processes of rock formation."] },
  { sn: "13", topic: "Soil Formation & Profile Development", objectives: ["Factors of soil formation (parent rock, organisms, climate, topography, time).", "Processes (physical/chemical weathering).", "Soil profile development."] },
  { sn: "14", topic: "Types, Composition & Properties of Soil", objectives: ["Types of soil.", "Chemical and biological composition.", "Soil pH.", "Physical properties (texture, structure)."] },
  { sn: "15", topic: "Plant Nutrients and Nutrient Cycle", objectives: ["Macro and micro nutrients.", "Factors affecting availability.", "Methods of replenishing nutrients.", "Nitrogen, carbon, water, and phosphorus cycles.", "Organic agriculture."] },
  { sn: "16", topic: "Irrigation", objectives: ["Meaning of irrigation system.", "Types (overhead, surface, underground).", "Advantages/disadvantages.", "Importance/problems."] },
  { sn: "17", topic: "Drainage", objectives: ["Meaning of drainage.", "Importance.", "Types (surface, subsurface/underground).", "Advantages/disadvantages."] },
  { sn: "18", topic: "Agricultural Pollution", objectives: ["Meaning.", "Causes/sources (excessive chemicals, spillage, livestock waste).", "Effects on farmers/productivity."] },
  { sn: "19", topic: "Simple Farm Tools", objectives: ["Meaning.", "Types (cutlass, hoe, spade, shovel, etc.).", "General maintenance."] },
  { sn: "20", topic: "Farm Machinery & Implements", objectives: ["Farm machinery (tractor, tools/machines).", "Tractor-coupled implements (plough, harrows, ridgers, planters, sprayers)."] },
  { sn: "21", topic: "Maintenance Practices & Precautionary Measures", objectives: ["Reasons for maintenance.", "Maintenance of farm machinery (check water/oil, service, keep clean)."] },
  { sn: "22", topic: "Agricultural Mechanization", objectives: ["Meaning.", "Mechanized operations.", "Advantages/disadvantages/limitations."] },
  { sn: "23", topic: "Prospects of Agricultural Mechanization", objectives: ["Prospects in the region."] },
  { sn: "24", topic: "Farm Power", objectives: ["Sources of farm power.", "Advantages/disadvantages."] },
  { sn: "25", topic: "Farm Surveying", objectives: ["Meaning.", "Equipment.", "Uses.", "Maintenance.", "Importance."] },
  { sn: "26", topic: "Farm Planning", objectives: ["Meaning.", "Factors.", "Importance."] },
  { sn: "27", topic: "Principles of Farmstead Planning", objectives: ["Meaning of farmstead.", "Importance.", "Factors in design.", "Farmstead layout."] },
  { sn: "28", topic: "Classification of Crops", objectives: ["Classification based on uses.", "Classification based on life cycle.", "Classification based on morphology."] },
  { sn: "29", topic: "Husbandry of Selected Crops", objectives: ["Botanical names, varieties, requirements, preparation, propagation, cultural practices for cereals, pulses, roots/tubers, vegetables, fruits, beverages, spices, oils, fibres, latex."] },
  { sn: "30", topic: "Pasture & Forage Crops", objectives: ["Meaning.", "Uses.", "Types.", "Common grasses/legumes.", "Factors affecting distribution/productivity.", "Establishment.", "Management."] },
  { sn: "31", topic: "Crop Improvement", objectives: ["Aims.", "Methods (introduction, selection, breeding).", "Mendel’s laws.", "Advantages/disadvantages."] },
  { sn: "32", topic: "Forest Management", objectives: ["Meaning.", "Importance.", "Regulations.", "Management practices.", "Implications of deforestation."] },
  { sn: "33", topic: "Agro-Forestry Practices in Africa", objectives: ["Meaning.", "Practices (taungya, alley cropping, ley farming)."] },
  { sn: "34", topic: "Meaning & Importance of Ornamental Plants", objectives: ["Meaning.", "Importance."] },
  { sn: "35", topic: "Common Types of Ornamental Plants", objectives: ["Types (bedding, hedging, lawn).", "Examples."] },
  { sn: "36", topic: "Settings & Locations for Planting Ornamental Plants", objectives: ["Siting and design."] },
  { sn: "37", topic: "Methods of Cultivating Ornamental Plants", objectives: ["By seed.", "Vegetative propagation."] },
  { sn: "38", topic: "Maintenance of Ornamental Plants", objectives: ["General maintenance."] },
  { sn: "39", topic: "Disease of Crops", objectives: ["Meaning.", "General effects.", "Causal organisms, symptoms, mode of transmission, prevention, and control of diseases for cereals, legumes, beverages, tubers, fruits, fibre, vegetables, stored produce."] },
  { sn: "40", topic: "Pests of Crops", objectives: ["Meaning.", "Classification (insect/non-insect).", "Insect mouthparts.", "Important insect-pests, damage, control for major crops.", "Non-insect pests.", "Side effects of control methods.", "Economic importance."] },
  { sn: "41", topic: "Weeds", objectives: ["Meaning.", "Types.", "Effects.", "Characteristic features.", "Methods of controlling (cultural, biological, chemical, physical, mechanical)."] },
  { sn: "42", topic: "Types & Classification of Farm Animals", objectives: ["Types of farm animals.", "Classification by habitat (terrestrial/aquatic) and uses (food, protection, pet)."] },
  { sn: "43", topic: "Anatomy & Physiology of Farm Animals", objectives: ["Parts of farm animals.", "Organs.", "Systems (digestive, circulatory, respiratory)."] },
  { sn: "44", topic: "Animal Reproduction", objectives: ["Meaning.", "Role of hormones.", "Reproductive systems.", "Processes.", "Egg formation in poultry."] },
  { sn: "45", topic: "Environmental Physiology", objectives: ["Meaning.", "Effects of climatic factors (temperature, relative humidity, light) on growth, reproduction, milk/egg production."] },
  { sn: "46", topic: "Livestock Management", objectives: ["Meaning.", "Requirements (housing, feeding, hygiene, finishing).", "Importance of management practices."] },
  { sn: "47", topic: "Animal Nutrition", objectives: ["Meaning.", "Classification of feeds.", "Nutrients (sources/functions).", "Types of ration.", "Malnutrition."] },
  { sn: "48", topic: "Rangeland & Pasture Management", objectives: ["Meaning/importance.", "Common grasses/legumes.", "Factors affecting production.", "Methods of improvement (stocking, rotation, fertilizer, etc.)."] },
  { sn: "49", topic: "Animal Improvement", objectives: ["Meaning.", "Aims.", "Methods (introduction, selection, breeding).", "Artificial insemination (meaning, methods, advantages/disadvantages)."] },
  { sn: "50", topic: "Animal Health Management", objectives: ["Meaning.", "Causal organisms.", "Predisposing factors.", "Reaction of animals.", "Causal organisms, symptoms, control of livestock diseases (viral, bacterial, fungal, protozoan).", "Parasites (types, control).", "General method of prevention/control (quarantine, immunization, etc)."] },
  { sn: "51", topic: "Aquaculture", objectives: ["Meaning.", "Types (fish, shrimp, crab).", "Meaning/importance of fish farming.", "Fish pond (siting, establishment, maintenance).", "Fishery regulations.", "Fishing methods/tools."] },
  { sn: "53", topic: "Apiculture or Bee Keeping", objectives: ["Meaning.", "Types of bees.", "Importance.", "Methods.", "Equipment.", "Precautionary measures."] },
  { sn: "54", topic: "Basic Economic Principles", objectives: ["Scarcity.", "Choice.", "Scale of preference.", "Law of diminishing returns."] },
  { sn: "55", topic: "Factors of Production", objectives: ["Land.", "Capital.", "Labour.", "Management/entrepreneur."] },
  { sn: "56", topic: "Principles of Demand", objectives: ["Definition.", "Law of demand.", "Factors affecting demand.", "Curves."] },
  { sn: "57", topic: "Principles of Supply", objectives: ["Definition.", "Law of supply.", "Curves.", "Factors affecting supply."] },
  { sn: "58", topic: "Implications of Demand & Supply for Agricultural Production", objectives: ["Price support.", "Price control.", "Subsidy."] },
  { sn: "59", topic: "Functions of a Farm Manager", objectives: ["Meaning.", "Functions."] },
  { sn: "60", topic: "Problems Faced by Farm Managers", objectives: ["Common constraints and management limitations."] },
  { sn: "61", topic: "Agricultural Finance", objectives: ["Meaning/importance.", "Sources.", "Classes (short/medium/long term, institutional/non, cash/kind).", "Problems (farmers/institutions).", "Capital market."] },
  { sn: "62", topic: "Farm Records and Accounts", objectives: ["Importance.", "Types of records.", "Designing records.", "Farm accounts (expenditure, income, profit/loss, balance sheet)."] },
  { sn: "63", topic: "Marketing of Agricultural Produce", objectives: ["Meaning/importance.", "Agents/functions.", "Marketing functions.", "Export crops.", "Guidelines/bodies for exporting.", "Problems."] },
  { sn: "64", topic: "Agricultural Insurance", objectives: ["Meaning/importance.", "Types of policies.", "Premium.", "Problems."] },
  { sn: "65", topic: "Agricultural Extension", objectives: ["Meaning/importance.", "Methods.", "Programmes in West Africa.", "Problems."] }
];

const arabicData: Omit<Topic, 'examType' | 'subject'>[] = [
  {
    sn: "1",
    topic: "Comprehension",
    objectives: ["15 questions based on 3 Arabic passages of about 70 words each.", "Topics within the experience of candidates.", "Multiple-choice."]
  },
  {
    sn: "2",
    topic: "Translation",
    objectives: ["Familiar subjects.", "Essential vocalization and punctuation."]
  },
  {
    sn: "3",
    topic: "Grammar",
    objectives: [
      "Parts of Speech: Nouns, pronouns, singular, dual, sound, and broken plurals.",
      "Gender: Masculine and feminine.",
      "Construct phrases, adjectives, conjunctions, permutative, and emphatic.",
      "Verbs: The perfect, the imperfect, and the imperative.",
      "Particles governing imperfect verbs.",
      "Kanna, Inna, Zanna and their respective associates.",
      "Transitive and intransitive verbs, the five verbs, conjugation of verbs.",
      "Numbers from one to one thousand.",
      "Active and passive voices.",
      "The verbal noun, the active participle, the passive participle, the elative, and special adjectival forms."
    ]
  },
  {
    sn: "4",
    topic: "Composition",
    objectives: ["120 words essay.", "Formal or informal letter.", "Orderly and coherent presentation of ideas, use of appropriate diction and style, correct spelling, punctuation, and grammar.", "Types: narrative, descriptive, argumentative, or dialogue."]
  },
  {
    sn: "5",
    topic: "Literature",
    objectives: ["Four periods of Arabic Literature.", "One compulsory question and any other three."]
  },
  {
    sn: "6",
    topic: "Oral Test",
    objectives: ["Speaking proficiency.", "Familiarity with prescribed themes."]
  }
];

const englishData: Omit<Topic, 'examType' | 'subject'>[] = [
  {
    sn: "1",
    topic: "Lexis",
    objectives: ["Vocabulary associated with building, agriculture, fishing, stock exchange, health, environment, culture, law, travel, government, sports, religion, science, animal husbandry, advertising, and body systems.", "Idiomatic expressions and collocations.", "Structural elements (tenses, pronouns, prepositions).", "Figurative usage and literary devices."]
  },
  {
    sn: "2",
    topic: "Structure",
    objectives: ["Patterns of word-form changes (number, tense, degree).", "Patterns of word groups and sentence formation.", "Correct use of structural words (conjunctions, determiners, prepositions)."]
  },
  {
    sn: "3",
    topic: "Essay Writing",
    objectives: ["Styles: Letter, Speech, Narration, Description, Argument/Debate, Report, Article, Exposition, Creative writing.", "Evaluation: Content, Organization, Expression, Mechanical Accuracy."]
  },
  {
    sn: "4",
    topic: "Comprehension",
    objectives: ["Synonyms/equivalents.", "Factual content.", "Logical inferences.", "Sentiments, emotions, or attitudes.", "Grammatical structure functions.", "Literary terms and figures of speech.", "Recasting sentences."]
  },
  {
    sn: "5",
    topic: "Summary",
    objectives: ["Extracting relevant information.", "Concise summarizing and avoiding repetition.", "Summary of specific aspects."]
  },
  {
    sn: "6",
    topic: "Oral English",
    objectives: ["Vowels (Pure and diphthongs).", "Consonants and clusters.", "Rhymes.", "Word stress and syllable structure.", "Emphatic stress and intonation patterns.", "Phonetic symbols."]
  }
];

const biologyData: Omit<Topic, 'examType' | 'subject'>[] = [
  { sn: "1", topic: "Concept of Living", objectives: ["Living and non-living things.", "Classification (Monera, Protoctista, Fungi, Plantae, Animalia).", "Differences between plants and animals."] },
  { sn: "2", topic: "Organization of Life", objectives: ["Cell.", "Tissue (Hydra).", "Organ (storage organ).", "Organ System (mammals and plants)."] },
  { sn: "3", topic: "Forms in Which Living Cells Exist", objectives: ["Single/free-living.", "Colony (Volvox).", "Filament (Spirogyra).", "Part of a living organism."] },
  { sn: "4", topic: "Cell", objectives: ["Structure/function.", "Plant vs animal.", "Environment (diffusion, osmosis, active transport).", "Nutrition."] },
  { sn: "5", topic: "Cellular Respiration", objectives: ["Aerobic/anaerobic processes.", "Energy release."] },
  { sn: "6", topic: "Excretion", objectives: ["Single-celled aquatic organisms.", "Waste products."] },
  { sn: "7", topic: "Growth", objectives: ["Mitosis.", "Aspects of growth.", "Growth hormones/auxins.", "Tropisms.", "Movement (cilia/flagella, cyclosis)."] },
  { sn: "8", topic: "Reproduction", objectives: ["Asexual (fission, budding, vegetative).", "Sexual (conjugation, gametogenesis, fertilization)."] },
  { sn: "9", topic: "Skeleton & Supporting Systems in Animals", objectives: ["Skeletal materials.", "Types (exoskeleton, endoskeleton, hydrostatic).", "Bones.", "Mechanism/functions."] },
  { sn: "10", topic: "Supporting Tissues in Plants", objectives: ["Features.", "Functions."] },
  { sn: "11", topic: "Transport System", objectives: ["Need for transport.", "Transport in animals (heart, blood, lymph).", "Transport in plants (water/minerals)."] },
  { sn: "12", topic: "Respiratory System", objectives: ["Body surface, gills, lungs.", "Gaseous exchange mechanisms."] },
  { sn: "13", topic: "Excretory System", objectives: ["Mechanisms.", "Types (Kidney, stomata).", "Plant excretion."] },
  { sn: "14", topic: "Regulation of Internal Environment (Homeostasis)", objectives: ["Kidney, Liver, Skin."] },
  { sn: "15", topic: "Hormonal Coordination", objectives: ["Animal hormones.", "Plant hormones."] },
  { sn: "16", topic: "Nervous Coordination", objectives: ["Central Nervous System.", "Peripheral Nervous System.", "Neurone.", "Nervous actions (reflex arc)."] },
  { sn: "17", topic: "Sense Organs", objectives: ["Eye.", "Ear."] },
  { sn: "18", topic: "The Reproductive System", objectives: ["Mammals.", "Metamorphosis in insects.", "Flowering plants (pollination, fertilization, fruits, dispersal)."] },
  { sn: "19", topic: "Plant & Animal Nutrition", objectives: ["Nutrition in plants (photosynthesis, nutrients).", "Nutrition in animals (food substances, balanced diet, enzymes, modes)."] },
  { sn: "20", topic: "Basic Ecological Concepts", objectives: ["Ecosystem.", "Factors.", "Energy flow.", "Decomposition.", "Ecological management.", "Pollution.", "Population ecology (succession, factors)."] },
  { sn: "21", topic: "Conservation of Natural Resources", objectives: ["Resources.", "Ways of conservation."] },
  { sn: "22", topic: "Variation in Population", objectives: ["Morphological.", "Physiological."] },
  { sn: "23", topic: "Biology of Heredity (Genetics)", objectives: ["Terminologies.", "Mendel’s laws.", "Chromosomes.", "Linkage, sex determination.", "Application."] },
  { sn: "24", topic: "Adaptation for Survival & Evolution", objectives: ["Behavioural adaptations.", "Evidence/theories of evolution."] }
];

const chemistryData: Omit<Topic, 'examType' | 'subject'>[] = [
  { sn: "1", topic: "Introduction to Chemistry", objectives: ["Measurement of physical quantities.", "Scientific measurements and importance.", "Scientific Methods."] },
  { sn: "2", topic: "Structure of an Atom", objectives: ["Gross features.", "Atomic number, neutrons, isotopes, mass.", "Relative atomic/molecular mass.", "Electron Configuration, Orbitals, Rules."] },
  { sn: "3", topic: "Separation Techniques", objectives: ["Classification of mixtures.", "Separation techniques.", "Criteria for purity."] },
  { sn: "4", topic: "Periodic Chemistry", objectives: ["Periodicity.", "Periodic law/trends.", "Group seven halogens.", "Transition series."] },
  { sn: "5", topic: "Chemical Bonds", objectives: ["Ionic, covalent, coordinate, metallic bonding.", "Molecular shapes.", "Intermolecular forces (Hydrogen, van der Waals)."] },
  { sn: "6", topic: "Stoichiometry & Chemical Reactions", objectives: ["Symbols, formulae, equations.", "Laws of combination.", "Mole, concentration, dilution."] },
  { sn: "7", topic: "States of Matter", objectives: ["Kinetic theory.", "Gas laws.", "Solids (structures/properties).", "Diamond/graphite."] },
  { sn: "8", topic: "Energy & Energy Changes", objectives: ["Energy and enthalpy.", "Illustrations of changes."] },
  { sn: "9", topic: "Acids, Bases & Salts", objectives: ["Definitions.", "Properties.", "pH concept.", "Salts (preparation, uses).", "Acid-Base titration."] },
  { sn: "10", topic: "Solubility of Substances", objectives: ["General principles.", "Practical application."] },
  { sn: "11", topic: "Chemical Kinetics & Equilibrium Rate", objectives: ["Rate of reactions (factors, theories).", "Equilibrium (Le Chatelier’s principle)."] },
  { sn: "12", topic: "Redox Reactions", objectives: ["Oxidation-reduction.", "Electrochemical cells.", "Electrolysis (Faraday’s laws, application).", "Corrosion."] },
  { sn: "13", topic: "Chemistry of Carbon Compounds", objectives: ["Classification, functional groups.", "Crude oil.", "Alkanes, Alkenes, Alkynes.", "Benzene.", "Alkanols, Alkanoic acids, Alkanoates."] },
  { sn: "14", topic: "Chemistry, Industry & the Environment", objectives: ["Industrial chemistry.", "Pollution.", "Biotechnology."] },
  { sn: "15", topic: "Basic Biochemistry & Synthetic Polymers", objectives: ["Proteins, Amino acids.", "Fats/oils (soaps).", "Carbohydrates.", "Synthetic polymers (properties/uses)."] }
];

const civicEducationData: Omit<Topic, 'examType' | 'subject'>[] = [
  { sn: "1", topic: "Values", objectives: ["Definition.", "Types.", "Importance of values to society."] },
  { sn: "2", topic: "Citizenship and Nationalism", objectives: ["Citizenship meaning/education.", "Duties/obligations.", "Nationalism.", "Promoting national consciousness.", "Nationalistic roles.", "Civic problems."] },
  { sn: "3", topic: "Human Rights", objectives: ["Meaning.", "Categories.", "Characteristics.", "UDHR (background, 7 core freedoms, importance, roles, limitations)."] },
  { sn: "4", topic: "Law and Order", objectives: ["Definition.", "Features.", "Importance.", "Constituted authority (meaning, types, importance/roles)."] },
  { sn: "5", topic: "Responsible Parenthood", objectives: ["Meaning.", "Roles.", "Importance in national development."] },
  { sn: "6", topic: "Traffic Regulations", objectives: ["Meaning.", "Importance.", "Roles of individual/government."] },
  { sn: "7", topic: "Interpersonal Relationships", objectives: ["Meaning.", "Types.", "Skills.", "Inter-communal relationships (meaning, importance).", "Conflicts (meaning, resolving skills)."] },
  { sn: "8", topic: "Cultism", objectives: ["Meaning/origin.", "Cult groups/symbols.", "Reasons.", "Consequences.", "Prevention."] },
  { sn: "9", topic: "Drugs and Drug Abuse", objectives: ["Meaning.", "Drugs abused.", "How/symptoms.", "Addict behaviors.", "Prevention.", "Government agencies/laws."] },
  { sn: "10", topic: "Human Trafficking", objectives: ["Meaning.", "Causes.", "Effects/consequences.", "Efforts to stop."] },
  { sn: "11", topic: "HIV/AIDS", objectives: ["Meaning.", "Causes.", "Symptoms/effects.", "Prevention.", "Stigmatization."] },
  { sn: "12", topic: "Youth Empowerment", objectives: ["Meaning.", "Skills.", "Importance/benefits.", "Government efforts."] },
  { sn: "13", topic: "Structure and Functions of Government", objectives: ["Meaning.", "Structure/tiers.", "Functions."] },
  { sn: "14", topic: "Democracy, Rule of Law, and National Development", objectives: ["Democracy (meaning, types, features, importance, pillars, problems).", "Rule of law (meaning, features, importance, problems).", "National development.", "How they promote dev."] },
  { sn: "15", topic: "Political Apathy", objectives: ["Meaning.", "Causes.", "Consequences.", "Protection of interests.", "Ways of discouraging."] },
  { sn: "16", topic: "Civil Society and Popular Participation", objectives: ["Popular participation (meaning, types, need, modes, achieving).", "Civil society (meaning, functions, necessity, qualities, problems)."] },
  { sn: "17", topic: "Public Service in Democracy", objectives: ["Meaning.", "Functions.", "Problems.", "Reasons for shortcomings.", "Ways of improving."] }
];

const crkData: Omit<Topic, 'examType' | 'subject'>[] = [
  { sn: "1", topic: "The Sovereignty of God", objectives: ["God, the Creator.", "God, the Controller of the universe."] },
  { sn: "2", topic: "Leadership Roles", objectives: ["Joseph.", "Moses.", "Joshua.", "Deborah."] },
  { sn: "3", topic: "Parental Responsibility", objectives: ["Eli and Samuel."] },
  { sn: "4", topic: "Consequences of Saul's Disobedience", objectives: ["Saul's rejection and death."] },
  { sn: "5", topic: "Submission to the Will of God", objectives: ["David’s submission.", "David’s sin, repentance, and forgiveness."] },
  { sn: "6", topic: "Making Decisions", objectives: ["Solomon’s wisdom.", "Unwise decisions of Solomon and Rehoboam."] },
  { sn: "7", topic: "Supremacy of God", objectives: ["Religious tensions during Ahab’s reign.", "Elijah at Mount Carmel."] },
  { sn: "8", topic: "Greed and Its Effects", objectives: ["Ahab.", "Gehazi."] },
  { sn: "9", topic: "Religious Reforms", objectives: ["The reign of King Josiah."] },
  { sn: "10", topic: "Concern for One's Nation", objectives: ["Condition of the nation.", "Response to the state of the nation."] },
  { sn: "11", topic: "Faith in God", objectives: ["Faith and courage.", "Faith and power."] },
  { sn: "12", topic: "Nature of God", objectives: ["True religion and social justice (Amos).", "God’s divine love (Hosea)."] },
  { sn: "13", topic: "Baptism & Temptation of Jesus", objectives: ["The Baptism.", "The Temptation."] },
  { sn: "14", topic: "The Call & Demands of Discipleship", objectives: ["Response of the disciples.", "Requirements for following Jesus."] },
  { sn: "15", topic: "Jesus' Teaching on Forgiveness", objectives: ["Importance of mutual forgiveness."] },
  { sn: "16", topic: "The Trials of Jesus", objectives: ["Jesus at Gethsemane.", "Peter’s Denials.", "Condemnation of Jesus."] },
  { sn: "17", topic: "The Crucifixion, Burial & Resurrection of Jesus", objectives: ["Crucifixion and burial.", "The Resurrection."] },
  { sn: "18", topic: "Fellowship in the Early Church", objectives: ["Life, organization, and common sharing."] },
  { sn: "19", topic: "The Holy Spirit & The Mission to the Gentiles", objectives: ["Holy Spirit at Pentecost.", "Mission to the Gentiles."] },
  { sn: "20", topic: "Opposition to the Gospel Message", objectives: ["Arrest, persecution, and deliverance of the apostles."] },
  { sn: "21", topic: "The Epistles of James", objectives: ["Faith and Works.", "Impartiality.", "Effective Prayers."] },
  { sn: "22", topic: "The Epistles of 1st Peter", objectives: ["Good Citizenship.", "Christians living among non-Christians.", "Interpersonal relationships."] }
];

const commerceData: Omit<Topic, 'examType' | 'subject'>[] = [
  { sn: "1", topic: "Introduction", objectives: ["Definition of Commerce and E-Commerce.", "History/Background.", "Scope and Functions."] },
  { sn: "2", topic: "Occupation", objectives: ["Meaning.", "Types: Industrial, Commercial, and Service.", "Factors determining occupation, Career Opportunities."] },
  { sn: "3", topic: "Production", objectives: ["Meaning.", "Factors (land, labour, capital, entrepreneurship).", "Types (Primary, Secondary, Tertiary).", "Division of labour/specialization.", "Inter-relationship with exchange."] },
  { sn: "4", topic: "Business Units", objectives: ["Meaning/objectives.", "Forms (Sole proprietorship, Partnership, Co-operative, Public enterprises, Companies).", "Formation, characteristics, pros/cons.", "Amalgamations, Mergers, Trusts, etc."] },
  { sn: "5", topic: "Trade Associations", objectives: ["Aims and functions of Trade Associations, Chambers of Commerce, Employers' Associations, Consumerism."] },
  { sn: "6", topic: "Business Capital and Profits", objectives: ["Capital (authorized, paid-up, etc.).", "Credit (sources, instruments).", "Working capital.", "Profits.", "Turnover."] },
  { sn: "7", topic: "Trade", objectives: ["Home Trade (Retail, Wholesale, Distribution channels).", "Foreign Trade (Import, export, entrepot, terms of trade, barriers, tariffs, trade authorities)."] },
  { sn: "8", topic: "Purchase and Sale of Goods", objectives: ["Procedures/documents (Orders, Invoices, etc.).", "Price Quotations.", "Terms of Payment.", "Means of payment (Legal tender, cheques, e-payments, etc.)."] },
  { sn: "9", topic: "Finance and Financial Institutions", objectives: ["Money (history, forms, functions).", "Banks (Central, Commercial, specialized, E-banking, accounts).", "Insurance (Principles, types, risks, underwriting, re-insurance).", "Capital market.", "Stock Exchange.", "Commodity Exchange."] },
  { sn: "10", topic: "Transport, Tourism, Communication, and Warehousing", objectives: ["Transport (types, advantages/disadvantages).", "Tourism.", "Communication (types, services).", "Warehousing (importance, functions, types)."] },
  { sn: "11", topic: "Advertising", objectives: ["Meaning.", "Roles.", "Types.", "Methods.", "Media."] },
  { sn: "12", topic: "Introduction to Marketing", objectives: ["Marketing (meaning, importance, functions).", "Marketing Mix (4Ps).", "Customer Services.", "Sales Promotion."] },
  { sn: "13", topic: "Legal Aspects of Business", objectives: ["Contract.", "Agency.", "Sale of Goods Act.", "Hire Purchase Act.", "Consumer Protection (legislation, consumerism)."] },
  { sn: "14", topic: "Government Policies Relating to Business", objectives: ["Commercialisation, Privatisation, and Deregulation."] },
  { sn: "15", topic: "Introduction to Business Management", objectives: ["Meaning/objectives.", "Business Management functions.", "Business resources.", "Organizational structure.", "Environment influence.", "Social responsibility."] },
  { sn: "16", topic: "Economic Groupings", objectives: ["History, objectives, achievements, problems of ECOWAS, NBC, LCBC, Mano-River Union, EU, etc."] }
];

const economicsData: Omit<Topic, 'examType' | 'subject'>[] = [
  { sn: "1", topic: "Definition and Scope of Economics", objectives: ["Scarcity and Choice.", "Scale of Preference.", "Opportunity Cost.", "Production Possibility Curve.", "Economic activities (Production, Distribution, Consumption).", "Classification (Primary, Secondary, Tertiary)."] },
  { sn: "2", topic: "Factors of Production", objectives: ["Land, labour, capital, and entrepreneurship (meaning, characteristics, importance)."] },
  { sn: "3", topic: "Types and Basic Features of Economic Systems", objectives: ["Capitalism, socialism, and mixed economy (features, pros/cons).", "Economic problems and solutions."] },
  { sn: "4", topic: "Basic Tools of Economic Analysis", objectives: ["Tables, graphs, and charts.", "Statistical measures (mean, median, mode)."] },
  { sn: "5", topic: "Demand", objectives: ["Concept/law of demand.", "Demand schedules/curves.", "Exceptions.", "Types of demand.", "Factors determining demand.", "Elasticity of demand (types, measurement, importance)."] },
  { sn: "6", topic: "Supply", objectives: ["Concept/law of supply.", "Supply schedules/curves.", "Types of supply.", "Factors determining supply.", "Elasticity of supply (importance)."] },
  { sn: "7", topic: "Theory of Consumer Behaviour", objectives: ["Utility concepts (total, average, marginal).", "Law of diminishing marginal utility.", "Consumer equilibrium.", "Relationship between marginal utility and demand."] },
  { sn: "8", topic: "Theory of Price Determination", objectives: ["Market interaction.", "Equilibrium price and quantity.", "Price controls (max/min).", "Rationing/black market."] },
  { sn: "9", topic: "Theory of Production", objectives: ["Division of labour and specialization.", "Scale of production.", "Productivity concepts.", "Law of variable proportions."] },
  { sn: "10", topic: "Theory of Cost and Revenue", objectives: ["Cost concepts (total, average, marginal, variable, fixed).", "Economist vs accountant view of cost.", "Revenue concepts (total, average, marginal)."] },
  { sn: "11", topic: "Market Structures", objectives: ["Characteristics of market structures.", "Perfect competition.", "Imperfect competition (monopoly, monopolistic competition).", "Price discrimination."] },
  { sn: "12", topic: "Business Organizations", objectives: ["Types (Sole Propr., Partnership, Companies, Co-operatives, etc.).", "Sources of funds.", "Privatization/Commercialization.", "Indigenization."] },
  { sn: "13", topic: "Distributive Trade", objectives: ["Distribution process.", "Role of producers, wholesalers, retailers.", "Government agencies role.", "Problems/solutions."] },
  { sn: "14", topic: "Population and Labour Market", objectives: ["Population (size, growth, migration, distribution, census, development).", "Labour market (labour force/capital, efficiency, wage determination, unemployment, Trade Unions)."] },
  { sn: "15", topic: "Agriculture", objectives: ["Structure/systems of agriculture.", "Importance to economy.", "Marketing products.", "Policies.", "Problems/remedies."] },
  { sn: "16", topic: "Industrialization", objectives: ["Meaning/types of industry.", "Localization.", "Strategy/importance in development.", "Problems.", "Link to agriculture."] },
  { sn: "17", topic: "National Income", objectives: ["Concepts (GDP, GNP, NNP, etc.).", "Measuring NI.", "Uses/limitations of NI data."] },
  { sn: "18", topic: "Money and Inflation", objectives: ["Money (definition, history, functions).", "Inflation (meaning, types, causes, effects, control)."] },
  { sn: "19", topic: "Financial Institutions", objectives: ["Types (banks, insurance, etc.).", "Development/functions.", "Markets (money/capital)."] },
  { sn: "20", topic: "Public Finance", objectives: ["Fiscal policy.", "Government revenue.", "Taxation (types, principles, incidence, effects).", "Public expenditure.", "Budget and national debt."] },
  { sn: "21", topic: "Economic Development and Planning", objectives: ["Growth vs development.", "Characteristics/problems of DCs.", "Development planning (objectives, types)."] },
  { sn: "22", topic: "International Trade and Balance of Payments", objectives: ["Trade (differences, basis, comparative advantage, policies).", "BOP (meaning, components, disequilibrium, adjustments)."] },
  { sn: "23", topic: "Economic Integration", objectives: ["Objectives/features.", "ECOWAS."] },
  { sn: "24", topic: "International Economic Organizations", objectives: ["OPEC, ECA, IMF, IBRD, AfDB, UNCTAD, etc."] },
  { sn: "25", topic: "Major Natural Resources", objectives: ["Development/effects (petroleum, gold, diamond, timber, etc.)."] }
];

const furtherMathematicsData: Omit<Topic, 'examType' | 'subject'>[] = [
  { sn: "1", topic: "Sets", objectives: ["Defined properties.", "Notations.", "Disjoint sets, Universal set, complement.", "Venn diagrams.", "Laws (Commutative, Associative, Distributive)."] },
  { sn: "2", topic: "Surds", objectives: ["Surds of form a/√b, a√b, a + b√n."] },
  { sn: "3", topic: "Binary Operations", objectives: ["Properties (Closure, Commutativity, Associativity, Distributivity, Identity, Inverse)."] },
  { sn: "4", topic: "Logical Reasoning", objectives: ["Syntax rules (true/false, implications, deductions).", "Truth tables."] },
  { sn: "5", topic: "Functions", objectives: ["Domain/co-domain.", "Mappings (one-to-one, onto, identity, constant).", "Inverse.", "Composite functions."] },
  { sn: "6", topic: "Polynomial Functions", objectives: ["Linear equations/inequalities.", "Quadratic equations/inequalities.", "Cubic equations."] },
  { sn: "7", topic: "Rational Functions", objectives: ["Standard forms.", "Partial fractions."] },
  { sn: "8", topic: "Indices and Logarithmic Functions", objectives: ["Indices.", "Logarithms."] },
  { sn: "9", topic: "Permutations and Combinations", objectives: ["Arrangements.", "Selection."] },
  { sn: "10", topic: "Binomial Theorem", objectives: ["Expansion of (a + b)^n.", "Approximation of (1 + x)^n."] },
  { sn: "11", topic: "Sequences and Series", objectives: ["Basic progressions (AP, GP).", "Sum to infinity."] },
  { sn: "12", topic: "Matrices and Linear Transformation", objectives: ["Matrices.", "Determinants.", "Inverse of 2x2.", "Linear Transformations."] },
  { sn: "13", topic: "Trigonometry", objectives: ["Ratios and Rules.", "Compound/Multiple Angles.", "Functions and Equations."] },
  { sn: "14", topic: "Co-ordinate Geometry", objectives: ["Straight Lines.", "Conic Sections."] },
  { sn: "15", topic: "Differentiation", objectives: ["Limit.", "Derivative.", "Polynomials.", "Trigonometric.", "Product/quotient rules.", "Implicit.", "Transcendental.", "2nd order, rates, maxima/minima."] },
  { sn: "16", topic: "Integration", objectives: ["Indefinite Integral.", "Definite Integral.", "Applications."] },
  { sn: "17", topic: "Statistics", objectives: ["Tabulation and graphical representation.", "Measures of location.", "Measures of dispersion.", "Correlation."] },
  { sn: "18", topic: "Probability", objectives: ["Meaning (relative frequency).", "Calculation (simple sample spaces).", "Addition/multiplication.", "Distributions."] },
  { sn: "19", topic: "Vectors", objectives: ["Scalar and vector definitions.", "Representation/algebra.", "Commutative/Associative/Distributive properties.", "Unit vectors.", "Position vectors.", "Resolution/composition.", "Dot product.", "Cross product."] },
  { sn: "20", topic: "Statics", objectives: ["Force.", "Representation.", "Composition/resolution (coplanar).", "Equilibrium.", "Resultants.", "Moments.", "Friction."] },
  { sn: "21", topic: "Dynamics", objectives: ["Motion concepts.", "Equations of Motion.", "Impulse/momentum.", "Projectiles."] }
];

const geographyData: Omit<Topic, 'examType' | 'subject'>[] = [
  { sn: "1", topic: "Map Work", objectives: ["Map scales/measurements.", "Reading/interpretation.", "Topographic/thematic maps."] },
  { sn: "2", topic: "Elementary Surveying", objectives: ["Techniques (Chain, tape, compass, plane table).", "Survey preparation/applications."] },
  { sn: "3", topic: "Geographic Information System (GIS)", objectives: ["Basic concepts/components.", "Applications in geography.", "Remote sensing."] },
  { sn: "4", topic: "Statistical Maps and Diagrams", objectives: ["Graphical representation.", "Bar graphs, pie charts, line/flow charts.", "Dot/isopleth/density maps."] },
  { sn: "5", topic: "Elements of Physical Geography", objectives: ["Earth basics.", "Earth movements.", "Structure of earth."] },
  { sn: "6", topic: "Hydrosphere", objectives: ["Ocean basins/salinity.", "Currents.", "Lakes, rivers, lagoons.", "Water resources."] },
  { sn: "7", topic: "Rocks", objectives: ["Types/characteristics/formation.", "Rock cycle.", "Economic importance."] },
  { sn: "8", topic: "Tectonic Processes", objectives: ["Plate tectonics.", "Earth movements (folding/faulting).", "Earthquakes/volcanicity."] },
  { sn: "9", topic: "Denudational Processes", objectives: ["Weathering.", "Mass movement.", "Erosion, transportation, deposition.", "Landforms."] },
  { sn: "10", topic: "Weather and Climate", objectives: ["Elements/factors.", "World climate types.", "Climate change."] },
  { sn: "11", topic: "Environmental Conservation", objectives: ["Problems/hazards.", "Conservation methods.", "Sustainable management.", "Policies."] },
  { sn: "12", topic: "World Population", objectives: ["Growth/distribution patterns.", "Structure.", "Data sources.", "Growth problems."] },
  { sn: "13", topic: "Settlement", objectives: ["Rural/urban.", "Patterns.", "Urbanization.", "Urban problems/planning."] },
  { sn: "14", topic: "Transportation", objectives: ["Types.", "Networks/patterns.", "Factors.", "Problems/solutions."] },
  { sn: "15", topic: "Industry", objectives: ["Classification/factors of location.", "Major regions.", "Problems/prospects."] },
  { sn: "16", topic: "Trade", objectives: ["Types (Local/regional/int).", "Balance of trade/payments.", "Trade organizations."] },
  { sn: "17", topic: "Tourism", objectives: ["Attractions.", "Economic importance.", "Problems/solutions."] },
  { sn: "18", topic: "Regional Geography of Africa", objectives: ["Physical features/economic importance.", "Resources.", "Agriculture/oil/lumbering/mining.", "Population.", "ECOWAS integration."] },
  { sn: "19", topic: "Regional Geography of Nigeria", objectives: ["Physical setting/population.", "Resources.", "Agriculture/Transport/Industry/Tourism.", "Environmental concerns.", "ECOWAS role."] },
  { sn: "20", topic: "Regional Geography of Ghana", objectives: ["Physical setting.", "Population/settlement.", "Economic activities.", "Manufacturing, trade, tourism.", "Environmental challenges."] },
  { sn: "21", topic: "Regional Geography of Liberia", objectives: ["Physical setting.", "Population/resources.", "Economic activities/spatial distribution.", "Economic challenges."] },
  { sn: "22", topic: "Regional Geography of Senegambia", objectives: ["Physical setting.", "Population/resource utilization.", "Economic activities.", "Environmental concerns."] }
];

const animalHusbandryData: Omit<Topic, 'examType' | 'subject'>[] = [
  { sn: "1", topic: "Importance of Farm Animals", objectives: ["Source of food.", "Raw materials.", "Source of manure.", "Source of feed ingredients.", "Animal power.", "Research, drugs, vaccines.", "Source of employment.", "Sales of products.", "Social functions.", "Security.", "Pets.", "Sports and games."] },
  { sn: "2", topic: "Classification of Farm Animals", objectives: ["Non-ruminants (monogastric).", "Ruminants (polygastric).", "Identification and external features.", "Differences based on stomach and feed."] },
  { sn: "3", topic: "Internal Organs and their Functions", objectives: ["Identification of liver, lungs, heart, etc.", "Functions."] },
  { sn: "4", topic: "Body Systems and their Functions", objectives: ["Digestive, respiratory, nervous, circulatory, skeletal, reproductive systems."] },
  { sn: "5", topic: "Reproduction in Farm Animals", objectives: ["Ovulation, oestrus cycle, heat period.", "Mating, gestation, parturition, lactation.", "Egg formation in poultry.", "Hormonal roles (female and male)."] },
  { sn: "6", topic: "Livestock Management System", objectives: ["Intensive, semi-intensive, extensive systems (pros/cons)."] },
  { sn: "7", topic: "Management Practices of Livestock", objectives: ["Livestock management principles."] },
  { sn: "8", topic: "Meaning and Classes of Animal Feeds", objectives: ["Nutrition basics.", "Feed nutrients (carbs, proteins, fats, vitamins, minerals, water).", "Feed classification (concentrates, roughages, additives)."] },
  { sn: "9", topic: "Animal Feed and Feeding", objectives: ["Livestock rations (types).", "Malnutrition (causes, symptoms, solutions)."] },
  { sn: "10", topic: "Formulation of Livestock Rations", objectives: ["Practical diet formulations (starter, grower, finisher).", "Feed ingredients.", "Factors in feed formulation."] },
  { sn: "11", topic: "Processing and Marketing of Animal Products", objectives: ["Pre, post-slaughtering activities.", "Value addition.", "Marketing channels/agents."] },
  { sn: "12", topic: "Pasture Management", objectives: ["Definition/importance of pasture.", "Forage crops.", "Types/features.", "Terminologies."] },
  { sn: "13", topic: "Range Improvement", objectives: ["Rangeland meaning/features.", "Methods of improvement (reseeding, rot. grazing, etc).", "Role of rangeland."] },
  { sn: "14", topic: "Animal Improvement", objectives: ["Meaning/terminologies.", "Aims (reproductive efficiency, disease resistance, etc)."] },
  { sn: "15", topic: "Methods of Farm Animal Improvement", objectives: ["Introduction, selection, breeding (merits/demerits)."] },
  { sn: "16", topic: "Artificial Insemination", objectives: ["Meaning.", "Methods/precautions.", "Advantages."] },
  { sn: "17", topic: "Farm Animal Diseases and Pathogens", objectives: ["Causal agents.", "Signs of sick animal.", "Identification of diseases.", "Prevention/control."] },
  { sn: "18", topic: "Livestock Parasite and Pests", objectives: ["Classes (ecto/endo).", "Life cycles.", "Control/prevention.", "Livestock pests (rodents, snakes, flies)."] },
  { sn: "19", topic: "Products & By-products of Farm Animals", objectives: ["Identification and uses."] },
  { sn: "20", topic: "Identification of Farm Animals", objectives: ["External parts identification."] }
];

const bookKeepingData: Omit<Topic, 'examType' | 'subject'>[] = [
  { sn: "1", topic: "Introduction to Book Keeping", objectives: ["Meaning (definition, history, nature, importance, functions).", "Career opportunities/beneficiaries.", "Qualities and values of bookkeepers."] },
  { sn: "2", topic: "Assets and Liabilities", objectives: ["Definition, differences, classification, and examples."] },
  { sn: "3", topic: "Business Transactions", objectives: ["Meaning, types, and parties involved."] },
  { sn: "4", topic: "Classification of Accounts", objectives: ["Personal (debtors/creditors), Impersonal (real/nominal)."] },
  { sn: "5", topic: "Source Documents", objectives: ["Definition, identification, types, and uses."] },
  { sn: "6", topic: "Concepts and Conventions", objectives: ["Definition, identification, and differences."] },
  { sn: "7", topic: "Books of Original Entry", objectives: ["Purpose/Types.", "Format, uses, preparation."] },
  { sn: "8", topic: "Ledger and Principles of Double Entry", objectives: ["Ledger (definition, classification, format).", "Double Entry principles (rules, preparation)."] },
  { sn: "9", topic: "Cash Book", objectives: ["Purpose/types (single/double/three column, petty cash book)."] },
  { sn: "10", topic: "Bank Reconciliation Statement", objectives: ["Meaning/purpose.", "Terminologies/documents.", "Causes of differences."] },
  { sn: "11", topic: "Trial Balance and Errors", objectives: ["Functions.", "Preparation.", "Errors (meaning, types, correction).", "Suspense Account."] },
  { sn: "12", topic: "Financial Statement of Sole Proprietorship", objectives: ["Trading Account (definition/valuation methods FIFO/LIFO).", "Profit and Loss Account.", "Balance Sheet."] },
  { sn: "13", topic: "Adjustment to Financial Statement", objectives: ["Prepayments, accruals, depreciation, bad/doubtful debts.", "Depreciation methods."] },
  { sn: "14", topic: "Control Accounts", objectives: ["Sales Ledger and Purchases Ledger Control Accounts."] },
  { sn: "15", topic: "Single Entry and Incomplete Records", objectives: ["Meaning, limitations, final accounts preparation."] },
  { sn: "16", topic: "Accounts for Not-for-Profit Making Organization", objectives: ["Receipts and Payments.", "Income and Expenditure Account."] },
  { sn: "17", topic: "Partnership Accounts", objectives: ["Partnership terms/deed.", "Capital/Current Accounts, P&L, Appropriation, Balance Sheet.", "Admission of new partners/Goodwill."] },
  { sn: "18", topic: "Joint Venture Accounts", objectives: ["Meaning/purpose.", "Differences between joint venture and partnership."] },
  { sn: "19", topic: "Departmental and Branch Accounts", objectives: ["Preparation."] },
  { sn: "20", topic: "Introduction to Company Accounts", objectives: ["Formation.", "Simple financial statements."] },
  { sn: "21", topic: "Interpretation of Accounts", objectives: ["Computation of ratios (profit margins, stock/quick/acid test ratios, ROCE)."] },
  { sn: "22", topic: "Purchase of Business", objectives: ["Reasons, terminologies, and accounts preparation."] },
  { sn: "23", topic: "Consignment Associate", objectives: ["Terminologies and consignment accounts preparation."] },
  { sn: "24", topic: "Hire Purchase", objectives: ["Accounts in seller’s and hirer’s books."] },
  { sn: "25", topic: "Contract Accounts", objectives: ["Purpose, terminologies, and accounts preparation."] },
  { sn: "26", topic: "Cooperative Accounts", objectives: ["Meaning and objectives."] }
];

const dataProcessingData: Omit<Topic, 'examType' | 'subject'>[] = [
  { sn: "1", topic: "Computer and its Environment", objectives: ["Definition/characteristics.", "History.", "Generations."] },
  { sn: "2", topic: "Data and Information", objectives: ["Definition.", "Types of data.", "Handling data.", "Digitalization."] },
  { sn: "3", topic: "Basic Computing", objectives: ["Classification (Type, Size, Usage)."] },
  { sn: "4", topic: "Components of Computer", objectives: ["Input/Output devices.", "System Unit.", "Storage."] },
  { sn: "5", topic: "Information Processing", objectives: ["Definition.", "Stages.", "Information processing cycles."] },
  { sn: "6", topic: "Information Transmission", objectives: ["Definition.", "Methods."] },
  { sn: "7", topic: "Medium of Information Transmission", objectives: ["Types.", "Classification of means of transmission."] },
  { sn: "8", topic: "Networking", objectives: ["Meaning (Networking/Internet/Intranet).", "Types."] },
  { sn: "9", topic: "Internet", objectives: ["Definition.", "Benefits.", "Browsers.", "Security.", "Abuse."] },
  { sn: "10", topic: "Tools for Processing Information", objectives: ["Operating System (definition, types, functions, examples)."] },
  { sn: "11", topic: "Word Processing", objectives: ["Definition.", "Uses.", "Software examples.", "Document management."] },
  { sn: "12", topic: "Spreadsheet", objectives: ["Definition.", "Uses.", "Application examples.", "File management."] },
  { sn: "13", topic: "Database Management System", objectives: ["Definition.", "Uses.", "DBMS examples.", "File management."] },
  { sn: "14", topic: "Presentation Packages", objectives: ["Definition.", "Uses.", "Examples.", "File management."] },
  { sn: "15", topic: "Computer Software", objectives: ["Definition.", "Types (System, Application, Utility)."] },
  { sn: "16", topic: "Graphic Packages", objectives: ["Definition.", "Uses.", "Examples."] },
  { sn: "17", topic: "Computer Maintenance", objectives: ["General cleaning.", "Battery/UPS.", "Drive cleaning.", "Hardware/Software maintenance.", "Crash and data recovery."] },
  { sn: "18", topic: "Computer Ethics", objectives: ["Room management.", "Laboratory rules."] },
  { sn: "19", topic: "Safety Measures", objectives: ["Sitting.", "Positioning devices.", "Illumination.", "Environment management."] },
  { sn: "20", topic: "Career Opportunities in Data Processing", objectives: ["Professions.", "Qualities of a professional.", "Professional bodies."] },
  { sn: "21", topic: "Computer Virus", objectives: ["Definition/types.", "Sources/signals.", "Prevention, detection, deletion."] },
  { sn: "22", topic: "Data Management", objectives: ["Relational Model.", "Database/table creation.", "Relationships.", "Forms/queries/reports."] },
  { sn: "23", topic: "File Organization", objectives: ["Definition.", "Types."] },
  { sn: "24", topic: "Database Security", objectives: ["Concepts (access control, encryption).", "Admin role."] },
  { sn: "25", topic: "Parallel and Distributed Database", objectives: ["Basic concepts."] }
];


const hausaData: Omit<Topic, 'examType' | 'subject'>[] = [
  { sn: "1", topic: "Language", objectives: ["Comprehension (Two short passages).", "Composition/letter writing.", "Sound System (Tsarin Sauti): Consonants, vowels, syllable structure, tones.", "Grammar (Nahawu): Word structure/formation, word classes, grammatical categories, sentence structure.", "Translation."] },
  { sn: "2", topic: "Literature", objectives: ["Literary Appreciation principles.", "Oral Literature (Prose, Poetry, Drama).", "Written Literature (Prose, Poetry, Drama)."] },
  { sn: "3", topic: "Culture", objectives: ["Customs (Greeting, Tarbiyya, Hospitality, Family, Beliefs, Occupations, Traditional Medicine, Authority).", "Institutions."] }
];

const islamicReligiousStudiesData: Omit<Topic, 'examType' | 'subject'>[] = [
  { sn: "1", topic: "Tarikh (Historical Development of Islam)", objectives: ["Jahiliyyah (Arabia before Islam).", "Life of Prophet Muhammad (SAW) (birth, mission, Hijrah, battles, conquest, death).", "Leadership qualities of the Prophet.", "The Khulafaur-Rashidun (biographies, contributions).", "Islam in West Africa (advent, roles of traders/reformers, impact on ancient empires)."] },
  { sn: "2", topic: "Qur'an", objectives: ["Revelation, preservation, and standardization.", "Importance as guidance.", "Selected Suwar (Fatihah, Duha, Tin, 'Alaq 1-5, Qadr, Kafirun, Nasr, Ikhlas, Falaq, Nas).", "Moral lessons on parents, honesty, and prohibition of gambling."] },
  { sn: "3", topic: "Hadith", objectives: ["Definitions (Hadith/Sunnah), significance.", "Parts of Hadith ('Isnad, Matn, Rawi).", "Classification (Sahih, Hasan, Da'if).", "Six Sound Collections.", "Selected Ahadith (an-Nawawi) and lessons."] },
  { sn: "4", topic: "Tawhid and Fiqh (Theology and Jurisprudence)", objectives: ["Iman (faith), Articles of Faith, Shirk.", "Taharah (purification).", "Salat (meaning, kinds).", "Sawm (fasting).", "Zakat (charity).", "Hajj (pilgrimage).", "Shari'ah (sources).", "Nikah (marriage).", "Talaq (divorce)."] }
];

const musicData: Omit<Topic, 'examType' | 'subject'>[] = [
  { sn: "1", topic: "Music Theory", objectives: ["Chords/Triads (Primary/Secondary, 7th chords).", "Chord Progressions & Cadences.", "Four-part harmony (SATB).", "Counterpoint."] },
  { sn: "2", topic: "Composition", objectives: ["Melodic composition.", "Setting text to music."] },
  { sn: "3", topic: "Form and Analysis", objectives: ["Simple forms.", "Extended forms.", "Traditional African forms.", "Contemporary African art music forms."] },
  { sn: "4", topic: "Aural Tests", objectives: ["Rhythmic Dictation.", "Melodic Dictation.", "Chords identification.", "Modulations."] },
  { sn: "5", topic: "Traditional and Contemporary African Music", objectives: ["Role in traditional society.", "Musical Instruments (classification, functions).", "General characteristics.", "Relationship to other arts.", "Traditional dances identification."] },
  { sn: "6", topic: "Performance Test", objectives: ["Instruments and Voice.", "Sight-reading."] },
  { sn: "7", topic: "History and Literature", objectives: ["Traditional musicians/composers.", "Popular musicians (Highlife, Afrobeat, Juju, Fuji, etc.).", "Contemporary art musicians.", "Western composers (Medieval to 20th Century).", "Black Music in the Diaspora."] }
];

const literatureInEnglishData: Omit<Topic, 'examType' | 'subject'>[] = [
  { sn: "1", topic: "African Prose", objectives: ["Amma Darko – Faceless", "Bayo Adebowale – Lonely Days", "Pede Hollist – So the Path Does Not Die", "Elma Shaw – Redemption Road"] },
  { sn: "2", topic: "Non-African Prose", objectives: ["Richard Wright – Native Son", "Patience Swift – The Last Goodman", "Harper Lee – To Kill a Mockingbird", "Susanne Bellefeuille – Path of Lucas"] },
  { sn: "3", topic: "Non-African Drama", objectives: ["William Shakespeare – Othello", "Oliver Goldsmith – She Stoops to Conquer", "Lorraine Hansberry – A Raisin in the Sun", "J.D. Priestley – An Inspector Calls", "Robert Bolt – A Man for All Seasons"] },
  { sn: "4", topic: "African Drama", objectives: ["Frank Ogodo Ogbeche – Harvest of Corruption", "Dele Charley – The Blood of a Stranger", "Wole Soyinka – The Lion and the Jewel", "John Kargbo – Let me die alone", "Bosede Ademilua-Afolayan – Once Upon an Elephant", "Efua Sutherland – The Marriage of Anansewa"] },
  { sn: "5", topic: "African Poetry", objectives: ["Birago Drop – Vanity", "Gbemisola Adeoti – Ambush", "Gabriel Okara – Piano and Drums", "Gbanabam Hallowell – The Dinning Table", "Lenrie Peter – The Panic of Growing Older", "Kofi Awoonor – The Anvil and the Hammer", "Leopold Sedar Senghor – Black Woman", "Niyi Osundare – The Leader and the Led", "Agostinho Neto – The Grieved Lands", "Oumar Farouk Sesay – The Song of the Women of the lands", "Lade Wosornu – Raider of the Treasure Trove", "Onu Chibuike – A Government Driver on his Retirement", "Gabriel Okara – Once Upon a Time", "Elizabeth L.A. Kamara – The Fence", "Wole Soyinka – Night", "Niyi Osundare – Not My Business", "S.O.H. Afriyie-Vidza – Hearty Garlands", "Syl Cheney-Coker – The Breast of the Sea"] },
  { sn: "6", topic: "Non-African Poetry", objectives: ["Alfred Tennyson – Crossing the Bar", "George Herbert – The Pulley", "William Blake – The School Boy", "William Morris – The Proud King", "Robert Frost – Birches", "William Shakespeare – Shall I compare thee to a Summer's Day?", "John Donne – The Good Morrow", "Maya Angelou – Caged Birds", "T. S. Elliot – The Journey of the Magi", "D. H. Lawrence – Bats", "Dyian Thomas – Do not go gentle into the Good night", "G M Hopkins – Binsey Poplar", "Lord Byron – She Walks in Beauty", "Geoffrey Chaucer – The Nun's Priest's Tale", "Seamus Heaney – Digging", "Maya Angelou – Still I Rise", "Fleur Adcock – The Telephone Call", "Wilfred Wilson Gibson – The Stone"] }
];

const marketingData: Omit<Topic, 'examType' | 'subject'>[] = [
  { sn: "1", topic: "Introduction to Marketing", objectives: ["Meaning.", "Basic terms (needs, wants, demands, product, exchange, etc.).", "History in Nigeria.", "Functions of marketing."] },
  { sn: "2", topic: "Marketing Concepts", objectives: ["Meaning.", "Various concepts (production, product, selling, marketing, societal)."] },
  { sn: "3", topic: "Marketing Mix and Marketing Environment", objectives: ["Meaning.", "Elements (4 Ps).", "Environement factors (political, cultural, economic, etc.)."] },
  { sn: "4", topic: "Products", objectives: ["Meaning.", "Classification (Industrial, consumer).", "Product design."] },
  { sn: "5", topic: "Markets", objectives: ["Meaning.", "Classification (Consumer, Organization)."] },
  { sn: "6", topic: "Consumer and Organizational Behavior", objectives: ["Meaning.", "Influencing factors.", "Decision process."] },
  { sn: "7", topic: "Marketing Planning and Research", objectives: ["Meaning, process, importance.", "Elements.", "Data requirements.", "Feedback utilization."] },
  { sn: "8", topic: "Pricing", objectives: ["Meaning.", "Strategies (haggling, cost-plus, demand, competition).", "Price determinants."] },
  { sn: "9", topic: "Advertising", objectives: ["Definition.", "Functions.", "Media types/advantages/disadvantages.", "Adverts production."] },
  { sn: "10", topic: "Sales Promotion", objectives: ["Meaning, functions.", "Forms (coupons, premium offers, merchandising incentives, etc.)."] },
  { sn: "11", topic: "Merchandising", objectives: ["Meaning.", "Elements (packaging, branding, labeling).", "Functions."] },
  { sn: "12", topic: "Distribution", objectives: ["Definition.", "Channels types.", "Channel choice factors.", "Functions of channel members."] },
  { sn: "13", topic: "Transportation", objectives: ["Meaning, mode, importance.", "Documents.", "Choice factors."] },
  { sn: "14", topic: "Warehousing", objectives: ["Meaning, functions/types.", "Activities."] },
  { sn: "15", topic: "Market Unions", objectives: ["Meaning/types.", "Roles in local markets.", "Market facilitators."] },
  { sn: "16", topic: "International Marketing", objectives: ["Meaning, importance.", "Methods.", "Rules and regulations."] },
  { sn: "17", topic: "ICT in Marketing", objectives: ["E-Marketing (meaning, importance, ethics/abuses)."] },
  { sn: "18", topic: "Entrepreneurship in Marketing", objectives: ["Meaning.", "Sources of funds.", "Management of outlets.", "Selling skills."] }
];

const storeKeepingData: Omit<Topic, 'examType' | 'subject'>[] = [
  { sn: "1", topic: "Overview of Store Keeping", objectives: ["Introduction/importance.", "Components (warehousing, requisition, inventory).", "Career opportunities/skills required.", "Functions/attributes/qualifications of a storekeeper."] },
  { sn: "2", topic: "Equipments and Facilities", objectives: ["Types, uses, and care."] },
  { sn: "3", topic: "Warehousing", objectives: ["Meaning, forms (room, cold room, silos).", "Factors for setting up.", "Documentation.", "Government regulations (NAFDAC, SON)."] },
  { sn: "4", topic: "Requisition", objectives: ["Importance, procedure, documentation (requisition/issue notes).", "E-requisitioning."] },
  { sn: "5", topic: "Inventory and Inventory Control", objectives: ["Meaning, uses, items.", "Perpetual/periodic control.", "Computations (stock out, lead time, stock levels, EOQ)."] },
  { sn: "6", topic: "Stock Value", objectives: ["Meaning/reasons.", "Valuation methods (LIFO, FIFO)."] },
  { sn: "7", topic: "Identification of Store Items", objectives: ["Need for identification.", "Classification.", "Codification (alphabetic, numerical, alphanumeric, decimal)."] },
  { sn: "8", topic: "Safety and Environmental Issues", objectives: ["Store organization/layout.", "Safety standards (First Aid, Fire extinguishing, electrical shielding)."] },
  { sn: "9", topic: "Entrepreneurship", objectives: ["Meaning/importance.", "Skills (managerial, accounting, marketing, promotion).", "Idea generation.", "Feasibility study/proposal writing."] }
];

const governmentData: Omit<Topic, 'examType' | 'subject'>[] = [
  { sn: "1", topic: "Meaning and Scope of Government", objectives: ["Definition of state.", "Institution vs process vs study."] },
  { sn: "2", topic: "Basic Concepts and Principles of Government", objectives: ["Concepts (state, power, legitimacy, democracy, etc.).", "Principles (rule of law, human rights, separation of powers, etc.)."] },
  { sn: "3", topic: "Constitutions", objectives: ["Definition/sources.", "Functions.", "Types and features."] },
  { sn: "4", topic: "Organs of Government", objectives: ["Executive, Legislature, Judiciary.", "Composition, functions, powers/limitations."] },
  { sn: "5", topic: "State Structure and Characteristics", objectives: ["Unitary, Federal, Confederal.", "Presidential/Parliamentary.", "Monarchical/Republican."] },
  { sn: "6", topic: "Citizenship", objectives: ["Meaning.", "Mode of acquisition.", "Rights/duties."] },
  { sn: "7", topic: "Political Parties and Party Systems", objectives: ["Parties (definition, structure, functions).", "Party systems (types, pros/cons)."] },
  { sn: "8", topic: "Pressure Groups, Public Opinion and Mass Media", objectives: ["Pressure Groups (types/operation).", "Public opinion (formation/measurement).", "Mass Media (roles/impact)."] },
  { sn: "9", topic: "Electoral Systems and Processes", objectives: ["Elections.", "Franchise.", "Electoral Systems.", "Electoral Management Body (functions/constraints)."] },
  { sn: "10", topic: "Public/Civil Service Administration", objectives: ["Public/Civil Service.", "Service commissions.", "Public corporations.", "Local Government (structure/revenue/problems)."] },
  { sn: "11", topic: "Pre-colonial Political System", objectives: ["Structural organization (Nigeria, Ghana, Sierra Leone, Gambia, Liberia)."] },
  { sn: "12", topic: "Colonial Administration", objectives: ["British (Indirect Rule).", "French (Assimilation/Association).", "Impact/consequences."] },
  { sn: "13", topic: "Nationalism", objectives: ["Meaning/factors/effects.", "Leaders/movements contributions."] },
  { sn: "14", topic: "Constitutional Developments", objectives: ["Pre-independence constitutions.", "Post-independence constitutions (Nigeria, Ghana, Sierra Leone, Gambia, Liberia)."] },
  { sn: "15", topic: "Development of Major Political Parties", objectives: ["Formation, objectives, achievements/failures (Nigeria, Sierra Leone, The Gambia, Liberia)."] },
  { sn: "16", topic: "Military Rule", objectives: ["Causes, effects, and regimes (Nigeria, Ghana, Sierra Leone, The Gambia, Liberia)."] },
  { sn: "17", topic: "Federal/Unitary Systems of Government", objectives: ["Origin, factors, structure/problems (West Africa)."] },
  { sn: "18", topic: "Foreign Policies", objectives: ["Definitions, factors, objectives (Nigeria, Ghana, Sierra Leone, The Gambia, Liberia)."] },
  { sn: "19", topic: "International Organizations", objectives: ["UNO, Commonwealth, AU (NEPAD), ECOWAS (origin, aims, achievements, problems)."] }
];

const historyData: Omit<Topic, 'examType' | 'subject'>[] = [
  { sn: "1", topic: "The Nigeria Area up to 1800", objectives: ["Land and peoples.", "Early centers of civilization (Nok, Ife, Benin).", "Economic activities.", "External influences."] },
  { sn: "2", topic: "The Nigeria Area 1800 - 1900", objectives: ["Sokoto Caliphate.", "Kanem-Borno.", "Yorubaland.", "Benin, Nupe, Igbo, Efik developments.", "European penetration.", "British conquest."] },
  { sn: "3", topic: "Nigeria 1900 - 1960", objectives: ["Colonial rule establishment.", "1914 Amalgamation.", "Colonial administration/economy.", "Constitutional developments."] },
  { sn: "4", topic: "Nigeria Since Independence", objectives: ["First Republic.", "Civil War.", "Policies/achievements of various regimes."] },
  { sn: "5", topic: "West and North Africa", objectives: ["Islamic reform movements.", "Sierra Leone/Liberia foundations.", "Egypt under Mohammed Ali/Ismail.", "Mahdiyya Movement in Sudan."] },
  { sn: "6", topic: "Eastern and Southern Africa", objectives: ["Omani Empire.", "Ethiopia in 19th century.", "The Mfecane.", "The Great Trek."] },
  { sn: "7", topic: "Imperialism, Colonialism and Nation-building", objectives: ["Scramble for Africa/Berlin Conference.", "Patterns of colonial rule.", "Decolonization.", "Apartheid in South Africa."] }
];

export const syllabusData: Record<string, Topic[]> = {
  "Financial Accounting": financialAccountingData.map(t => ({ ...t, examType: 'WAEC', subject: 'Financial Accounting' })),
  "Mathematics": mathematicsData.map(t => ({ ...t, examType: 'WAEC', subject: 'Mathematics' })),
  "Agricultural Science": agriculturalScienceData.map(t => ({ ...t, examType: 'WAEC', subject: 'Agricultural Science' })),
  "Arabic": arabicData.map(t => ({ ...t, examType: 'WAEC', subject: 'Arabic' })),
  "English Language": englishData.map(t => ({ ...t, examType: 'WAEC', subject: 'English Language' })),
  "Biology": biologyData.map(t => ({ ...t, examType: 'WAEC', subject: 'Biology' })),
  "Chemistry": chemistryData.map(t => ({ ...t, examType: 'WAEC', subject: 'Chemistry' })),
  "Civic Education": civicEducationData.map(t => ({ ...t, examType: 'WAEC', subject: 'Civic Education' })),
  "C.R.K": crkData.map(t => ({ ...t, examType: 'WAEC', subject: 'C.R.K' })),
  "Commerce": commerceData.map(t => ({ ...t, examType: 'WAEC', subject: 'Commerce' })),
  "Economics": economicsData.map(t => ({ ...t, examType: 'WAEC', subject: 'Economics' })),
  "Further Mathematics": furtherMathematicsData.map(t => ({ ...t, examType: 'WAEC', subject: 'Further Mathematics' })),
  "Geography": geographyData.map(t => ({ ...t, examType: 'WAEC', subject: 'Geography' })),
  "Animal Husbandry": animalHusbandryData.map(t => ({ ...t, examType: 'WAEC', subject: 'Animal Husbandry' })),
  "Book-Keeping": bookKeepingData.map(t => ({ ...t, examType: 'WAEC', subject: 'Book-Keeping' })),
  "Data Processing": dataProcessingData.map(t => ({ ...t, examType: 'WAEC', subject: 'Data Processing' })),
  "Hausa": hausaData.map(t => ({ ...t, examType: 'WAEC', subject: 'Hausa' })),
  "Government": governmentData.map(t => ({ ...t, examType: 'WAEC', subject: 'Government' })),
  "History": historyData.map(t => ({ ...t, examType: 'WAEC', subject: 'History' })),
  "Islamic Religious Studies": islamicReligiousStudiesData.map(t => ({ ...t, examType: 'WAEC', subject: 'Islamic Religious Studies' })),
  "Literature in English": literatureInEnglishData.map(t => ({ ...t, examType: 'WAEC', subject: 'Literature in English' })),
  "Marketing": marketingData.map(t => ({ ...t, examType: 'WAEC', subject: 'Marketing' })),
  "Music": musicData.map(t => ({ ...t, examType: 'WAEC', subject: 'Music' })),
  "Store-Keeping": storeKeepingData.map(t => ({ ...t, examType: 'WAEC', subject: 'Store-Keeping' }))
};



