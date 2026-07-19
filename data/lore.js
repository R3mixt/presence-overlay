/* ============ AUDIO MAP — recorded narration files go here ============
   Keys are record ids (e.g. "way-cradle"), values are audio URLs. Until a
   recording exists, the synthesized Presence voice stands in. */
const audioMap={};

/* ============ ARCHIVE ROUTING ============
   Which wiki article each record opens in the Abidan Archive relay. */
const wikiFor={
 "way-cradle":"Cradle","way-harrow":"The_Way_and_The_Worlds",
 "way-limit":"Ozriel","way-scour":"The_Way_and_The_Worlds","way-oasis":"Mad_King",
 "way-fathom":"The_Way_and_The_Worlds","way-asylum":"Elder_Empire",
 "way-amalgam":"Traveler%27s_Gate",
 "way-commandment":"The_Way_and_The_Worlds","way-jester":"The_Way_and_The_Worlds",
 "way-986":"Suriel","way-jubilee":"The_Way_and_The_Worlds",
 "way-solitude":"The_Way_and_The_Worlds","way-obelisk":"The_Way_and_The_Worlds",
 "way-943":"Mad_King",
 "sector-11":"The_Way_and_The_Worlds","sector-13":"Suriel","sector-21":"The_Way_and_The_Worlds",
 "way-sanctum":"The_Way_and_The_Worlds","way-haven":"Mad_King","way-outpost":"Makiel",
 "way-vroshir":"Vroshir","way-edge":"The_Way_and_The_Worlds",
 "way-corrupt1":"The_Way_and_The_Worlds","way-corrupt2":"The_Way_and_The_Worlds",
 "poi-samara":"Suriel","poi-ruins":"Eithan_Arelius","poi-grave":"Blackflame_Empire",
 "poi-ghostwater":"Dross","poi-ninecloud":"Akura_Mercy","poi-valley-return":"Wei_Shi_Lindon",
 "poi-labyrinth":"Ozriel","poi-ascension":"Wei_Shi_Lindon",
 "poi-harrow-suriel":"Suriel","poi-limit-ozriel":"Ozriel","poi-scour-camps":"The_Way_and_The_Worlds",
 "poi-oasis-strike":"Mad_King","poi-fathom-battle":"Mad_King","poi-fathom-horizon":"The_Last_Horizon",
 "poi-asylum-deep":"Kelarac","poi-asylum-capital":"Calder_Marten",
 "poi-amalgam-rift":"The_Way_and_The_Worlds","poi-amalgam-valinhall":"Valinhall",
 "poi-amalgam-elysia":"Elysia"
};

/* ============ SANCTUM LOCAL CACHE ============
   Original summaries in this overlay's own words, used when the external
   relay is unreachable. Each entry chains onward so drill-down works offline. */
const localKB={
 "Cradle":{s:"Iteration 110. An unusually large world, saturated with vital aura, where sacred artists refine power along thousands of Paths. The founding Abidan ascended from Cradle, and so did Ozriel; its Monarchs hold the world sealed beneath them, and four Dreadgods walk it. No other iteration in the sector has produced as much trouble or as much talent.",t:["Wei Shi Lindon","Monarch","Dreadgods","Ozriel"]},
 "Wei Shi Lindon":{s:"Born Unsouled in Sacred Valley — judged empty of talent and set at the bottom of his clan. After the Judge Suriel showed him his home's recorded fate, he left the valley to advance by any means available: borrowed techniques, a forbidden Path, and stubbornness that outlasted everything set against it.",t:["Suriel","Yerin","Dross","Dreadgods"]},
 "Suriel":{s:"Judge of the Abidan Court — the Phoenix, sixth among the seven, whose division handles restoration. Born mortal in Sector 13. Her detour to a dying valley on Cradle, and one small mercy there, set the entire deviation in motion.",t:["Ozriel","Makiel","Wei Shi Lindon"]},
 "Ozriel":{s:"The Reaper. Born Ozmanthus Arelius on Cradle, the finest soulsmith the world ever produced. He forged the Scythe that grants dying worlds a clean end, grew disgusted with a Court that only manages decay, and vanished. Every crisis in this sector grew in the hole he left behind.",t:["Mad King","Eithan Arelius","Dreadgods"]},
 "Mad King":{s:"Daruman, first among the Vroshir. Once a good king and a candidate of the Abidan's executor program, he tried to save his world by merging with Oth'kimeth, a Fiend of chaos called the Conqueror — and the merge unmade him. Imprisoned at Haven, freed by his allies, and responsible for the destruction of Oasis.",t:["Vroshir","Ozriel"]},
 "Vroshir":{s:"Those who live outside the Way and Abidan law, and call it freedom. They raid registered iterations and name themselves liberators of worlds; their greatest, the Silverlords, field forces that contest Judges. The war around Cradle drew them in strength.",t:["Mad King","Makiel"]},
 "Makiel":{s:"Judge of the Abidan — the Hound, first among the seven, reader of fate. From Oversight his division tracks the futures of every registered iteration. He judged Cradle's deviation an error to be corrected, whatever the correction cost.",t:["Suriel","Ozriel"]},
 "Dross":{s:"A mind-spirit born from a discarded prototype in the ruins of Northstrider's Ghostwater facility. He attached himself to Lindon, worked his way up from tool to friend, and processes combat futures faster than anyone gives him credit for.",t:["Northstrider","Wei Shi Lindon"]},
 "Yerin":{s:"Disciple of the Sword Sage, carrying his legacy — and a blood-shadow she never asked for. Lindon's first and fiercest ally, later far more, and one of the deadliest sacred artists of her generation. Winner of the Uncrowned King tournament.",t:["Wei Shi Lindon"]},
 "Eithan Arelius":{s:"Patriarch of the Arelius family in the Blackflame Empire: janitor, showman, and considerably more than he appears. He recruited Lindon and Yerin on sight and spent years playing a longer game than anyone around him suspected.",t:["Ozriel","Wei Shi Lindon"]},
 "Northstrider":{s:"A Monarch with no fixed territory — a self-made power of the deep waters. Builder of the Ghostwater research facility and of constructs that read the world; the closest thing Cradle has to a working scientist at the peak of power.",t:["Monarch","Dross"]},
 "Akura Mercy":{s:"Daughter of the Monarch Akura Malice. Kind by deliberate choice, in a family built on shadow and ambition — and dangerous despite the kindness. She fought beside Lindon and Yerin from the Uncrowned tournament onward.",t:["Monarch","Wei Shi Lindon"]},
 "Blackflame Empire":{s:"An empire of the Ashwind continent founded on the Path of Black Flame — destruction and dominance. Its ruling dragon-line burned itself out generations ago, and its capital, Serpent's Grave, is built inside a dragon's skeleton.",t:["Wei Shi Lindon","Monarch"]},
 "Dreadgods":{s:"Four calamities that walk Cradle: the Wandering Titan, the Weeping Dragon, the Bleeding Phoenix, and the Silent King. Born long ago from an experiment on hunger madra. Even Monarchs do not fight them — only herd them away from what they value.",t:["Monarch","Ozriel"]},
 "Monarch":{s:"The practical peak of the sacred arts within Cradle: artists who touched the heavens and refused the invitation upward, holding the world's ceiling shut beneath them. A handful of them rule the continents through treaty, fear, and centuries of accumulated power.",t:["Dreadgods","Northstrider"]},
 "Valinhall":{s:"A Territory of steel and stillness, entered through gates on Amalgam — home of a house that trains its Travelers without mercy. Simon, son of Kalman, entered it to save his village and came out carrying its strength.",t:["The Way and The Worlds"]},
 "Elysia":{s:"The city at the heart of the oldest conflict among Amalgam's Travelers and their Territories — a prize, a battleground, and an origin all at once.",t:["Valinhall"]},
 "Kelarac":{s:"A Great Elder of Asylum — the Collector of Souls, who bargains through deep water. His deals deliver exactly what was asked for, which is rarely what was wanted.",t:["Calder Marten"]},
 "Calder Marten":{s:"A Navigator of Asylum's Aion Sea: ship's captain, reader of Elder bargains, and a man perpetually in over his head. Central figure of the Elder Empire records.",t:["Kelarac"]},
 "The Last Horizon":{s:"Fathom's chronicle: Captain Varic Vallenar assembles a legendary crew — pilot, genius, knight, weapon — aboard a ship bound past the last horizon of charted space.",t:["The Way and The Worlds"]},
 "The Way and The Worlds":{s:"The Way is the medium of order and existence. Iterations are the worlds suspended within it; the Abidan patrol it; chaos erodes its edges; the Vroshir live beyond them. Every chronicle in this sector — Cradle, Traveler's Gate, Elder Empire, the Last Horizon — shares this one cosmology.",t:["Vroshir","Ozriel","Suriel"]},
 "Traveler's Gate":{s:"Amalgam's chronicle — the sector's oldest. Travelers open gates to Territories and wield what those realms lend them; Simon of Valinhall stands at the center of its war.",t:["Valinhall","Elysia"]},
 "Elder Empire":{s:"Asylum's chronicle: one war told twice, from opposite sides — the Navigator Calder Marten and the assassin Shera, each the villain of the other's account.",t:["Calder Marten","Kelarac"]}
};
