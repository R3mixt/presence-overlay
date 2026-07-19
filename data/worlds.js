/* ============ WORLD DEFINITIONS ============
   Visual parameters for each rendered world. pal entries are HSL triples used
   by the terrain colorist; seeds keep every rebuild identical. */
const WORLDS={
  cradle:{seed:110,sea:0.02,ice:0.26,pr:20,star:0xaed4ff,orbit:170,tilt:0.14,period:110,res:[2048,1024],
    pal:{deep:[218,65,15],shal:[204,68,33],low:[128,36,31],high:[95,30,44],peak:[45,22,80]},atmo:0x5aa7ff},
  harrow:{seed:217,sea:-0.05,ice:0,cracks:true,pr:11,star:0xff8866,orbit:95,tilt:0.35,period:70,res:[1024,512],
    pal:{deep:[8,60,10],shal:[14,70,22],low:[220,8,26],high:[220,6,38],peak:[0,55,45]},atmo:0xc96a5a},
  limit:{seed:216,sea:-0.12,ice:0.1,cracks:true,pr:11,star:0x9a7bff,orbit:110,tilt:-0.3,period:82,res:[1024,512],
    pal:{deep:[260,40,8],shal:[255,45,18],low:[235,12,20],high:[240,10,34],peak:[265,45,60]},atmo:0x7a5adf},
  scour:{seed:213,sea:0.08,ice:0.4,pr:10,star:0xcfe0ff,orbit:130,tilt:0.5,period:125,res:[1024,512],
    pal:{deep:[200,20,20],shal:[195,25,34],low:[80,8,50],high:[70,6,62],peak:[60,10,86]},atmo:0x9fb2c8},
  oasis:{seed:129,sea:0.0,ice:0.15,shattered:true,pr:12,star:0xffd9a0,orbit:100,tilt:0.2,period:92,res:[1024,512],
    pal:{deep:[190,60,18],shal:[180,65,36],low:[140,35,36],high:[100,28,48],peak:[50,30,82]},atmo:0xd9b36b},
  fathom:{seed:119,sea:0.22,ice:0.12,lights:true,pr:14,star:0x8ad4ff,orbit:120,tilt:-0.18,period:100,res:[1024,512],
    pal:{deep:[225,70,14],shal:[210,75,32],low:[260,15,30],high:[250,12,44],peak:[210,20,78]},atmo:0x6ac8e8},
  asylum:{seed:112,sea:0.3,ice:0.05,pr:13,star:0x8fd4b8,orbit:105,tilt:0.42,period:86,res:[1024,512],
    pal:{deep:[200,55,9],shal:[185,50,20],low:[150,25,26],high:[120,20,38],peak:[90,15,60]},atmo:0x4a8f7a},
  corrupt1:{seed:661,sea:-0.2,ice:0,cracks:true,pr:9,res:[512,256],
    pal:{deep:[0,50,6],shal:[6,55,12],low:[230,6,16],high:[230,5,24],peak:[0,60,34]},atmo:0x8b2020},
  corrupt2:{seed:662,sea:-0.3,ice:0,cracks:true,pr:10,res:[512,256],
    pal:{deep:[350,45,5],shal:[355,50,10],low:[240,5,12],high:[240,4,20],peak:[350,65,30]},atmo:0x6e1418},
  amalgam:{seed:9,sea:0.05,ice:0.2,rifts:true,pr:13,star:0xf0a8e8,orbit:115,tilt:-0.4,period:94,res:[1024,512],
    pal:{deep:[215,60,18],shal:[200,65,34],low:[110,40,32],high:[35,45,42],peak:[0,0,88]},atmo:0xd98bd0},
  /* minor iterations named in the books — smaller textures, faster boot */
  commandment:{seed:246,sea:0.06,ice:0.3,pr:9,star:0xbcd8ff,orbit:80,tilt:0.22,period:78,res:[512,256],
    pal:{deep:[214,60,14],shal:[206,62,30],low:[135,32,30],high:[105,24,42],peak:[48,18,80]},atmo:0x5a9fe0},
  jester:{seed:247,sea:0.1,ice:0.1,pr:9,star:0xe8b8ff,orbit:85,tilt:-0.35,period:72,res:[512,256],
    pal:{deep:[268,55,14],shal:[280,55,30],low:[160,30,32],high:[300,18,40],peak:[45,25,82]},atmo:0xb37be0},
  i986:{seed:986,sea:-0.02,ice:0.2,pr:10,star:0xffe0b0,orbit:90,tilt:0.3,period:96,res:[512,256],
    pal:{deep:[205,50,15],shal:[196,55,30],low:[70,35,38],high:[40,30,46],peak:[42,18,78]},atmo:0xd9b36b},
  jubilee:{seed:411,sea:0.12,ice:0.18,pr:9,star:0xaef0c8,orbit:78,tilt:0.1,period:84,res:[512,256],
    pal:{deep:[210,62,14],shal:[195,64,32],low:[115,42,32],high:[95,28,44],peak:[50,22,82]},atmo:0x6fd0a0},
  solitude:{seed:412,sea:0.05,ice:0.55,pr:9,star:0xdce8ff,orbit:82,tilt:0.48,period:130,res:[512,256],
    pal:{deep:[212,35,18],shal:[204,38,32],low:[205,10,48],high:[210,8,60],peak:[210,8,88]},atmo:0xa8c4e8,
  },
  obelisk:{seed:413,sea:-0.08,ice:0.12,pr:9,star:0xc8b8a8,orbit:76,tilt:-0.2,period:68,res:[512,256],
    pal:{deep:[220,40,12],shal:[210,42,26],low:[30,22,34],high:[28,16,44],peak:[35,12,72]},atmo:0x9a8b78}
};
