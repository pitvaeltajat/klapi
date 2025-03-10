const items = [
  { name: "Avotulimajoite", amount: 14.0 },
  { name: "Bensakanisteri", amount: 2.0 },
  { name: "Dremel", amount: 1.0 },
  { name: "Eristevaahtomuovi 1m", amount: 60.0 },
  { name: "Hilleberg Nallo 3gt", amount: 1.0 },
  { name: "Hilleberg Nallo 4gt", amount: 1.0 },
  { name: "Husse", amount: 1.0 },
  { name: "Japaninsaha", amount: 1.0 },
  { name: "Jatkojohto Pieni valkoinen", amount: 2.0 },
  { name: "Jatkojohtoja (iso)", amount: 4.0 },
  { name: "Jatkokela", amount: 1.0 },
  { name: "Juomakanisteri", amount: 7.0 },
  { name: "Järeä kyltti", amount: 1.0 },
  { name: "Kaarisaha", amount: 8.0 },
  { name: "Kahvinkeitin ideale", amount: 1.0 },
  { name: "Kalusto pj", amount: 1.0 },
  { name: "Kalusto pj:n salkosarja", amount: 1.0 },
  { name: "Kamina Hawu", amount: 1.0 },
  { name: "Kamina iso pyöreä", amount: 1.0 },
  { name: "Kamina neliö", amount: 1.0 },
  { name: "Kamina pieni pyöreä", amount: 1.0 },
  { name: "Kattila iso", amount: 1.0 },
  { name: "Kattila keskikokoinen", amount: 1.0 },
  { name: "Kattila normaali", amount: 1.0 },
  { name: "Kattila tosi iso", amount: 1.0 },
  { name: "Kattila valtava", amount: 1.0 },
  { name: "Katuharja", amount: 1.0 },
  { name: "Kiilabox", amount: 1.0 },
  { name: "Kiintoavainsarja", amount: 1.0 },
  { name: "Kiipeilyköysi", amount: 4.0 },
  { name: "Kiipeilyvaljaat", amount: 5.0 },
  { name: "Kirves", amount: 12.0 },
  { name: "Kuulosuojaimet", amount: 8.0 },
  { name: "Kuumailmapuhallin", amount: 1.0 },
  { name: "Kympin salkosarja", amount: 1.0 },
  { name: "Kymppi", amount: 1.0 },
  { name: "Kärkisarja", amount: 1.0 },
  { name: "Käsisaha", amount: 10.0 },
  { name: "Köysiä ja naruja", amount: 666.0 },
  { name: "Laavun kepit", amount: 2.0 },
  { name: "Lapio", amount: 10.0 },
  { name: "Laskeutumisvaljaat", amount: 2.0 },
  { name: "Leimaisin", amount: 13.0 },
  { name: "Leka", amount: 2.0 },
  { name: "Leka pieni", amount: 1.0 },
  { name: "Lumilapio", amount: 2.0 },
  { name: "Mankka", amount: 1.0 },
  { name: "Marssitanko", amount: 1.0 },
  { name: "Metsurikypärä", amount: 2.0 },
  { name: "Metsäsuksien varasiteet (pari)", amount: 1.0 },
  { name: "Mitta", amount: 5.0 },
  { name: "Myrskylyhty", amount: 5.0 },
  { name: "Naiger keppi", amount: 666.0 },
  { name: "Naiger maavaate", amount: 4.0 },
  { name: "Naiger teltta", amount: 8.0 },
  { name: "Naulalaatikko", amount: 1.0 },
  { name: "Nokipannu", amount: 1.0 },
  { name: "Nuotiopannu", amount: 20.0 },
  { name: "Nuuskateltta", amount: 1.0 },
  { name: "Onki", amount: 1.0 },
  { name: "Partio Scout banneri", amount: 1.0 },
  { name: "Pelastusliivit", amount: 4.0 },
  { name: "Pelipaidat", amount: 25.0 },
  { name: "Piippurassi", amount: 1.0 },
  { name: "Pistosaha", amount: 3.0 },
  { name: "Pitva banneri iso", amount: 1.0 },
  { name: "Pitva banneri jalalla", amount: 1.0 },
  { name: "Pitva kyltti", amount: 2.0 },
  { name: "Pitva lippu", amount: 1.0 },
  { name: "Pj", amount: 4.0 },
  { name: "Pj salkosarja", amount: 4.0 },
  { name: "Pj:n maavaate", amount: 2.0 },
  { name: "Pocket rocket", amount: 2.0 },
  { name: "Porakone Bosch", amount: 1.0 },
  { name: "Porakone Makita", amount: 1.0 },
  { name: "Primus", amount: 1.0 },
  { name: "Pukkiasuja", amount: 5.0 },
  { name: "Pumppu", amount: 2.0 },
  { name: "Radiopuhelimet", amount: 1.0 },
  { name: "Rastilippu", amount: 46.0 },
  { name: "Rautakanki", amount: 4.0 },
  { name: "Rautasaha", amount: 4.0 },
  { name: "Rengaspoltin", amount: 3.0 },
  { name: "Retkisaha", amount: 4.0 },
  { name: "Retkituoli halpa", amount: 15.0 },
  { name: "Retkituoli laatu", amount: 2.0 },
  { name: "Ruuvilaatikko", amount: 1.0 },
  { name: "Siivilä", amount: 1.0 },
  { name: "Silja Line lippu", amount: 1.0 },
  { name: "Sirkkeli", amount: 1.0 },
  { name: "Sorkkarauta", amount: 3.0 },
  { name: "Suomen lippu", amount: 2.0 },
  { name: "Tavaraverkko", amount: 2.0 },
  { name: "Termospullo", amount: 1.0 },
  { name: "Teroituskivi", amount: 5.0 },
  { name: "Teroituskone", amount: 1.0 },
  { name: "Tikkataulu", amount: 3.0 },
  { name: "Tiskivati", amount: 8.0 },
  { name: "Tolppakengät", amount: 1.0 },
  { name: "Trangia", amount: 7.0 },
  { name: "Trangian multidisc", amount: 4.0 },
  { name: "Turvasaappaat", amount: 1.0 },
  { name: "Työkalubox harmaa", amount: 1.0 },
  { name: "Työkalubox musta salkku", amount: 1.0 },
  { name: "Työkalubox sinininen", amount: 1.0 },
  { name: "Töhö", amount: 1.0 },
  { name: "Töhöjakkara", amount: 1.0 },
  { name: "Valaisin", amount: 6.0 },
  { name: "Vasara", amount: 666.0 },
  { name: "Viiltosuojahousut", amount: 1.0 },
  { name: "Vintilä", amount: 5.0 },
  { name: "Ämpäri", amount: 15.0 },
];
const itemsWithCategories = [
  {
    id: "cl4p94act00040ip7nwj4p60h",
    name: "Avotulimajoite",
    categoryIDs: ["cli5tpvfz00001vqht7ywplrh"],
  },
  {
    id: "cl4p94act00050ip7qpnhozk4",
    name: "Bensakanisteri",
    categoryIDs: ["cli5tpvim00071vqhu9sv4aeh"],
  },
  {
    id: "cl4p94act00060ip71i5xx7r6",
    name: "Dremel",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h"],
  },
  {
    id: "cl4p94act00070ip7xkzm7xpd",
    name: "Eristevaahtomuovi 1m",
    categoryIDs: ["clhz34csz0003l409nfpy1b1g"],
  },
  {
    id: "cl4p94act00080ip7yxlhnnm2",
    name: "Hilleberg Nallo 3gt",
    categoryIDs: ["cli5tpvfz00001vqht7ywplrh"],
  },
  {
    id: "cl4p94act00090ip7wxf7sh6d",
    name: "Hilleberg Nallo 4gt",
    categoryIDs: ["cli5tpvfz00001vqht7ywplrh"],
  },
  {
    id: "cl4p94act00100ip711vx06r3",
    name: "Husse",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h"],
  },
  {
    id: "cl4p94act00110ip7aevqrann",
    name: "Japaninsaha",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h"],
  },
  {
    id: "cl4p94act00120ip7uljgjq6w",
    name: "Jatkojohto Pieni valkoinen",
    categoryIDs: ["clg630lj30003l0084cwhvsv7"],
  },
  {
    id: "cl4p94act00130ip74by2td9n",
    name: "Jatkojohtoja (iso)",
    categoryIDs: ["clg630lj30003l0084cwhvsv7"],
  },
  {
    id: "cl4p94act00140ip7jfbz2sas",
    name: "Jatkokela",
    categoryIDs: ["clg630lj30003l0084cwhvsv7"],
  },
  {
    id: "cl4p94act00150ip79hbnzw4m",
    name: "Juomakanisteri",
    categoryIDs: ["cli5tpvim00071vqhu9sv4aeh"],
  },
  {
    id: "cl4p94act00160ip7m5g39ftt",
    name: "Järeä kyltti",
    categoryIDs: ["cli5tpviu00211vqhgbibwh58"],
  },
  {
    id: "cl4p94act00170ip7j24s3wa3",
    name: "Kaarisaha",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h"],
  },
  {
    id: "cl4p94act00180ip7wrc6clgi",
    name: "Kahvinkeitin ideale",
    categoryIDs: ["clg630lj30003l0084cwhvsv7", "cli5tpviw00281vqh0vhjq2og"],
  },
  {
    id: "cl4p94act00190ip7xtxkk486",
    name: "Kalusto pj",
    categoryIDs: ["cli5tpvfz00001vqht7ywplrh"],
  },
  {
    id: "cl4p94act00200ip7stwpc0re",
    name: "Kalusto pj:n salkosarja",
    categoryIDs: ["cli5tpviz00351vqhk93ohylk"],
  },
  {
    id: "cl4p94act00210ip707aq721g",
    name: "Kamina Hawu",
    categoryIDs: ["cli5tpviz00351vqhk93ohylk"],
  },
  {
    id: "cl4p94act00220ip7j6gkx111",
    name: "Kamina iso pyöreä",
    categoryIDs: ["cli5tpviz00351vqhk93ohylk"],
  },
  {
    id: "cl4p94act00230ip7wonn82gh",
    name: "Kamina neliö",
    categoryIDs: ["cli5tpviz00351vqhk93ohylk"],
  },
  {
    id: "cl4p94act00240ip7p8921x62",
    name: "Kamina pieni pyöreä",
    categoryIDs: ["cli5tpviz00351vqhk93ohylk"],
  },
  {
    id: "cl4p94act00250ip78as2o2yb",
    name: "Kattila iso",
    categoryIDs: ["cli5tpviw00281vqh0vhjq2og"],
  },
  {
    id: "cl4p94act00260ip7x7395xt8",
    name: "Kattila keskikokoinen",
    categoryIDs: ["cli5tpviw00281vqh0vhjq2og"],
  },
  {
    id: "cl4p94act00270ip7c4w3yy1o",
    name: "Kattila normaali",
    categoryIDs: ["cli5tpviw00281vqh0vhjq2og"],
  },
  {
    id: "cl4p94act00280ip7ydy99l85",
    name: "Kattila tosi iso",
    categoryIDs: ["cli5tpviw00281vqh0vhjq2og"],
  },
  {
    id: "cl4p94act00290ip7bp18jzbl",
    name: "Kattila valtava",
    categoryIDs: ["cli5tpviw00281vqh0vhjq2og"],
  },
  {
    id: "cl4p94acu00300ip7gjiqjo5d",
    name: "Katuharja",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h"],
  },
  {
    id: "cl4p94acu00310ip7yth1121f",
    name: "Kiilabox",
    categoryIDs: ["cli5tpviz00351vqhk93ohylk"],
  },
  {
    id: "cl4p94acu00320ip7dv4xnqd3",
    name: "Kiintoavainsarja",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h"],
  },
  {
    id: "cl4p94acu00330ip7lrcp1cbz",
    name: "Kiipeilyköysi",
    categoryIDs: ["cli5tpvj200421vqhrv503nif"],
  },
  {
    id: "cl4p94acu00340ip7885tlgla",
    name: "Kiipeilyvaljaat",
    categoryIDs: ["cli5tpvj200421vqhrv503nif"],
  },
  {
    id: "cl4p94acu00350ip707jwl0u1",
    name: "Kirves",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h"],
  },
  {
    id: "cl4p94acu00360ip79ahec0rm",
    name: "Kuulosuojaimet",
    categoryIDs: ["clhrvq7p80007ml0863ni1rmi"],
  },
  {
    id: "cl4p94acu00370ip7rxdmlfkw",
    name: "Kuumailmapuhallin",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h", "clg630lj30003l0084cwhvsv7"],
  },
  {
    id: "cl4p94acu00380ip7ayskc97c",
    name: "Kympin salkosarja",
    categoryIDs: ["cli5tpviz00351vqhk93ohylk"],
  },
  {
    id: "cl4p94acu00390ip7h1frrofq",
    name: "Kymppi",
    categoryIDs: ["cli5tpvfz00001vqht7ywplrh"],
  },
  {
    id: "cl4p94acu00400ip7korj83qg",
    name: "Kärkisarja",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h"],
  },
  {
    id: "cl4p94acu00410ip7gx8snxhk",
    name: "Käsisaha",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h"],
  },
  {
    id: "cl4p94acu00420ip7iwv9s33d",
    name: "Köysiä ja naruja",
    categoryIDs: ["clhz34csz0003l409nfpy1b1g"],
  },
  {
    id: "cl4p94acu00430ip7wfhzwte7",
    name: "Laavun kepit",
    categoryIDs: ["cli5tpviz00351vqhk93ohylk"],
  },
  {
    id: "cl4p94acu00440ip7bewiu42j",
    name: "Lapio",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h"],
  },
  {
    id: "cl4p94acu00450ip7t6hgulu5",
    name: "Laskeutumisvaljaat",
    categoryIDs: ["cli5tpvj200421vqhrv503nif"],
  },
  {
    id: "cl4p94acu00460ip7z1ihwsge",
    name: "Leimaisin",
    categoryIDs: ["cli5tpvj700561vqhnkhcx1dv"],
  },
  {
    id: "cl4p94acu00470ip78x8kig16",
    name: "Leka",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h"],
  },
  {
    id: "cl4p94acu00480ip7irezidc5",
    name: "Leka pieni",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h"],
  },
  {
    id: "cl4p94acu00490ip7ff1ehe03",
    name: "Lumilapio",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h"],
  },
  {
    id: "cl4p94acu00510ip7940hujuv",
    name: "Marssitanko",
    categoryIDs: ["cli5tpviu00211vqhgbibwh58"],
  },
  {
    id: "cl4p94acu00520ip77q605oo9",
    name: "Metsurikypärä",
    categoryIDs: ["clhrvq7p80007ml0863ni1rmi"],
  },
  {
    id: "cl4p94acu00530ip712yg0qgj",
    name: "Metsäsuksien varasiteet (pari)",
    categoryIDs: ["cli5tpvje00631vqh1c60ro74"],
  },
  {
    id: "cl4p94acu00540ip7bg3ddima",
    name: "Mitta",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h"],
  },
  {
    id: "cl4p94acu00550ip7bm14s2mh",
    name: "Myrskylyhty",
    categoryIDs: ["cli5tpvji00701vqh8yijinv8"],
  },
  {
    id: "cl4p94acu00560ip7eyx2ss6f",
    name: "Naiger keppi",
    categoryIDs: ["cli5tpviz00351vqhk93ohylk"],
  },
  {
    id: "cl4p94acu00570ip7hf5i0o11",
    name: "Naiger maavaate",
    categoryIDs: ["cli5tpviz00351vqhk93ohylk"],
  },
  {
    id: "cl4p94acu00580ip7qto3k4zz",
    name: "Naiger teltta",
    categoryIDs: ["cli5tpvfz00001vqht7ywplrh"],
  },
  {
    id: "cl4p94acu00590ip7qz876u87",
    name: "Naulalaatikko",
    categoryIDs: ["cli5tpvjo00771vqhk4n2iqp9"],
  },
  {
    id: "cl4p94acu00600ip7vxkcurab",
    name: "Nokipannu",
    categoryIDs: ["cli5tpviw00281vqh0vhjq2og"],
  },
  {
    id: "cl4p94acu00610ip7pvmv39tg",
    name: "Nuotiopannu",
    categoryIDs: ["cli5tpviw00281vqh0vhjq2og"],
  },
  {
    id: "cl4p94acu00620ip7c9w49cgd",
    name: "Nuuskateltta",
    categoryIDs: ["cli5tpvfz00001vqht7ywplrh"],
  },
  {
    id: "cl4p94acu00630ip7v8z98ok9",
    name: "Onki",
    categoryIDs: ["clen2neea0003kz08d59t0k8m"],
  },
  {
    id: "cl4p94acu00640ip7z22f7rfd",
    name: "Partio Scout banneri",
    categoryIDs: ["cli5tpviu00211vqhgbibwh58"],
  },
  {
    id: "cl4p94acu00650ip7umld2g4h",
    name: "Pelastusliivit",
    categoryIDs: ["clhrvq7p80007ml0863ni1rmi"],
  },
  {
    id: "cl4p94acu00660ip7i60l7t1y",
    name: "Pelipaidat",
    categoryIDs: ["clhrvq7p80007ml0863ni1rmi"],
  },
  {
    id: "cl4p94acu00670ip77ov5cxsw",
    name: "Piippurassi",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h"],
  },
  {
    id: "cl4p94acu00680ip7ml5qxm4s",
    name: "Pistosaha",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h"],
  },
  {
    id: "cl4p94acu00690ip7tpjve99j",
    name: "Pitva banneri iso",
    categoryIDs: ["cli5tpviu00211vqhgbibwh58"],
  },
  {
    id: "cl4p94acu00700ip7brz6e2gd",
    name: "Pitva banneri jalalla",
    categoryIDs: ["cli5tpviu00211vqhgbibwh58"],
  },
  {
    id: "cl4p94acu00710ip7tv6i03hp",
    name: "Pitva kyltti",
    categoryIDs: ["cli5tpviu00211vqhgbibwh58"],
  },
  {
    id: "cl4p94acu00720ip79atz4auc",
    name: "Pitva lippu",
    categoryIDs: ["cli5tpviu00211vqhgbibwh58"],
  },
  {
    id: "cl4p94acu00730ip7sr2b0595",
    name: "Pj",
    categoryIDs: ["cli5tpvfz00001vqht7ywplrh"],
  },
  {
    id: "cl4p94acu00740ip7pqp3bqs4",
    name: "Pj salkosarja",
    categoryIDs: ["cli5tpviz00351vqhk93ohylk"],
  },
  {
    id: "cl4p94acu00750ip73wos887d",
    name: "Pj:n maavaate",
    categoryIDs: ["cli5tpviz00351vqhk93ohylk"],
  },
  {
    id: "cl4p94acu00760ip7irryd4uj",
    name: "Pocket rocket",
    categoryIDs: ["cli5tpvjr00841vqhqd062x6p"],
  },
  {
    id: "cl4p94acu00770ip7l7jgawkx",
    name: "Porakone Bosch",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h", "clg630lj30003l0084cwhvsv7"],
  },
  {
    id: "cl4p94acu00780ip7a4dm1fh4",
    name: "Porakone Makita",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h", "clg630lj30003l0084cwhvsv7"],
  },
  {
    id: "cl4p94acu00790ip7g4pggyge",
    name: "Primus",
    categoryIDs: ["cli5tpvjr00841vqhqd062x6p"],
  },
  {
    id: "cl4p94acu00800ip7du2pzr4o",
    name: "Pukkiasuja",
    categoryIDs: ["clhrvq7p80007ml0863ni1rmi"],
  },
  {
    id: "cl4p94acu00810ip77dbqsj7e",
    name: "Pumppu",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h"],
  },
  {
    id: "cl4p94acu00830ip7vdhq2s9r",
    name: "Rastilippu",
    categoryIDs: ["cli5tpvj700561vqhnkhcx1dv"],
  },
  {
    id: "cl4p94acu00840ip77sw4qmzx",
    name: "Rautakanki",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h"],
  },
  {
    id: "cl4p94acu00850ip70pk0we1r",
    name: "Rautasaha",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h"],
  },
  {
    id: "cl4p94acu00860ip7tzygna4e",
    name: "Rengaspoltin",
    categoryIDs: ["cli5tpvjr00841vqhqd062x6p", "cli5tpviw00281vqh0vhjq2og"],
  },
  {
    id: "cl4p94acu00870ip7c9z9mkn4",
    name: "Retkisaha",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h"],
  },
  {
    id: "cl4p94acu00880ip7otk2j3o7",
    name: "Retkituoli halpa",
    categoryIDs: ["cli5tpvjt00911vqh61lzjw71"],
  },
  {
    id: "cl4p94acu00890ip785u4pb58",
    name: "Retkituoli laatu",
    categoryIDs: ["cli5tpvjt00911vqh61lzjw71"],
  },
  {
    id: "cl4p94acu00900ip7euc1e4zm",
    name: "Ruuvilaatikko",
    categoryIDs: ["cli5tpvjo00771vqhk4n2iqp9"],
  },
  {
    id: "cl4p94acu00910ip71swqoj9f",
    name: "Siivilä",
    categoryIDs: ["cli5tpviw00281vqh0vhjq2og"],
  },
  {
    id: "cl4p94acu00920ip7b1q31s3t",
    name: "Silja Line lippu",
    categoryIDs: ["cli5tpviu00211vqhgbibwh58"],
  },
  {
    id: "cl4p94acx00930ip70se3mtas",
    name: "Sirkkeli",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h"],
  },
  {
    id: "cl4p94acx00940ip765hxdk3d",
    name: "Sorkkarauta",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h"],
  },
  {
    id: "cl4p94acx00950ip79luu42pt",
    name: "Suomen lippu",
    categoryIDs: ["cli5tpviu00211vqhgbibwh58"],
  },
  {
    id: "cl4p94acx00960ip7dir08rsa",
    name: "Tavaraverkko",
    categoryIDs: ["clhz2kuzx0003ms08rtyoclgj"],
  },
  {
    id: "cl4p94acx00970ip73rmk4290",
    name: "Termospullo",
    categoryIDs: ["cli5tpvim00071vqhu9sv4aeh"],
  },
  {
    id: "cl4p94acx00980ip7i40f9tho",
    name: "Teroituskivi",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h"],
  },
  {
    id: "cl4p94acx00990ip719il65tq",
    name: "Teroituskone",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h"],
  },
  {
    id: "cl4p94acx01000ip7kq6qk7sg",
    name: "Tikkataulu",
    categoryIDs: ["clg632hlb0007l008v6h8s4uz"],
  },
  {
    id: "cl4p94acx01010ip7jy9bei6s",
    name: "Tiskivati",
    categoryIDs: ["cli5tpvim00071vqhu9sv4aeh"],
  },
  {
    id: "cl4p94acx01020ip75hzkjtj8",
    name: "Tolppakengät",
    categoryIDs: ["cli5tpvj200421vqhrv503nif"],
  },
  {
    id: "cl4p94acx01030ip7uur26bs8",
    name: "Trangia",
    categoryIDs: ["cli5tpvjr00841vqhqd062x6p"],
  },
  {
    id: "cl4p94acx01040ip7k5fjiybq",
    name: "Trangian multidisc",
    categoryIDs: ["cli5tpvjw00981vqhli2655x7"],
  },
  {
    id: "cl4p94acx01050ip7okztdc6q",
    name: "Turvasaappaat",
    categoryIDs: ["clhrvq7p80007ml0863ni1rmi"],
  },
  {
    id: "cl4p94acx01060ip7b21x6oze",
    name: "Työkalubox harmaa",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h"],
  },
  {
    id: "cl4p94acx01070ip70sdap5ou",
    name: "Työkalubox musta salkku",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h"],
  },
  {
    id: "cl4p94acx01080ip7yq8940il",
    name: "Työkalubox sinininen",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h"],
  },
  {
    id: "cl4p94acx01090ip7va5h60vh",
    name: "Töhö",
    categoryIDs: ["cli5tpvjr00841vqhqd062x6p"],
  },
  {
    id: "cl4p94acx01100ip7vpql73cl",
    name: "Töhöjakkara",
    categoryIDs: ["cli5tpvjw00981vqhli2655x7"],
  },
  {
    id: "cl4p94acx01110ip78tuzf5j1",
    name: "Valaisin",
    categoryIDs: ["cli5tpvji00701vqh8yijinv8"],
  },
  {
    id: "cl4p94acx01120ip7qt2iv43p",
    name: "Vasara",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h"],
  },
  {
    id: "cl4p94acx01130ip78pcln6lu",
    name: "Viiltosuojahousut",
    categoryIDs: ["clhrvq7p80007ml0863ni1rmi"],
  },
  {
    id: "cl4p94acx01140ip79zw1iejj",
    name: "Vintilä",
    categoryIDs: ["cli5tpvir00141vqhcji2nh1h"],
  },
  {
    id: "cl4p94acx01150ip70oq6di5r",
    name: "Ämpäri",
    categoryIDs: ["cli5tpvim00071vqhu9sv4aeh"],
  },
];

const newCategories = [
  "Majoitteet",
  "Nesteensäilytysvarusteet",
  "Työkalut",
  "Edustusvälineet",
  "Ruuanlaittovälineet",
  "Majoitetarvikkeet",
  "Kiipeilyvarusteet",
  "Kiipeilyvälineet",
  "Suunnistustarvikkeet",
  "Vaellusvarusteet",
  "Valaisimet",
  "Kiinnikkeet",
  "Keittimet",
  "Huonekalut",
  "Keitintarvikkeet",
];

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // First create all categories
  for (const category of newCategories) {
    const newCategory = await prisma.category.create({
      data: {
        name: category,
      },
    });
    console.log(
      `Created category with name ${newCategory.name} and id: ${newCategory.id}`
    );
  }

  // Then create all items with their basic data
  for (const item of items) {
    const newItem = await prisma.item.create({
      data: {
        name: item.name,
        amount: item.amount,
      },
    });
    console.log(`Created item with name ${newItem.name} and id: ${newItem.id}`);
  }

  // Finally update items with their category connections
  for (const item of itemsWithCategories) {
    try {
      const updatedItem = await prisma.item.update({
        where: {
          id: item.id,
        },
        data: {
          categories: {
            connect: item.categoryIDs.map((id) => ({ id })),
          },
        },
      });
      console.log(
        `Updated item with name ${updatedItem.name} and id: ${updatedItem.id}`
      );
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Failed to update item ${item.name}: ${error.message}`);
      } else {
        console.error(`Failed to update item ${item.name}: Unknown error`);
      }
    }
  }

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
