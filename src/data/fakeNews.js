// Base de données des fausses actualités amusantes
export const fakeNewsData = [
  {
    title: "Un homme découvre que son chat est en réalité un extraterrestre",
    content: "Pierre Dupont, habitant de Brest, a découvert que son chat Minou possédait des pouvoirs télépathiques après l'avoir vu commander des croquettes sur Amazon avec ses pattes. L'animal aurait également été vu en train de dessiner des crop circles dans le jardin.",
    category: "Insolite"
  },
  {
    title: "La tour Eiffel se déplace de 3 cm vers l'ouest chaque année",
    content: "Selon une étude fictive de l'université de Sorbonne-Imaginaire, la célèbre tour parisienne se rapprocherait lentement de l'océan Atlantique à cause du réchauffement climatique et de l'attraction lunaire. Les autorités envisagent d'installer des roulettes.",
    category: "Science Fiction"
  },
  {
    title: "Un village français adopte le fromage comme monnaie officielle",
    content: "Le petit village de Camenbert-sur-Loire a décidé de remplacer l'euro par des portions de camembert pour stimuler l'économie locale. Le maire précise que les transactions en roquefort bénéficient d'un taux de change avantageux.",
    category: "Économie"
  },
  {
    title: "Les escargots deviennent le nouveau moyen de transport écologique",
    content: "Une startup bordelaise développe des escargots génétiquement modifiés capables de transporter des humains à une vitesse record de 5 km/h sans émissions de CO2. Les premiers tests ont été concluants, malgré quelques problèmes de ponctualité.",
    category: "Transport"
  },
  {
    title: "Un chercheur invente des nuages carrés pour optimiser la pluie",
    content: "Le professeur Martin Nimbus de l'université de Météopolis a breveté une technique révolutionnaire pour transformer les nuages en formes géométriques parfaites, permettant une distribution plus équitable des précipitations sur le territoire français.",
    category: "Météorologie"
  },
  {
    title: "Les baguettes françaises élues patrimoine de l'humanité par les martiens",
    content: "Une délégation extraterrestre aurait atterri discrètement à Paris pour déclarer officiellement la baguette française comme 'chef-d'œuvre culinaire intergalactique'. L'UNESCO galactique envisage de créer une nouvelle catégorie spéciale.",
    category: "Gastronomie"
  },
  {
    title: "Un algorithme prédit l'humeur des nuages avec 99% de précision",
    content: "Des scientifiques de Toulouse ont développé une intelligence artificielle révolutionnaire capable de déterminer si les nuages sont tristes, joyeux ou en colère, révolutionnant ainsi la météorologie émotionnelle et les prévisions de moral.",
    category: "Tech"
  },
  {
    title: "Les croissants deviennent officiellement un fruit selon l'UE",
    content: "Suite à un lobbying intensif des boulangers et après 47 heures de débat, l'Union Européenne a officiellement reclassé les croissants dans la catégorie des fruits pour des raisons fiscales complexes liées à leur forme en croissant de lune.",
    category: "Politique"
  },
  {
    title: "Un pigeon parisien apprend à utiliser le métro et obtient un pass Navigo",
    content: "Gertrude, un pigeon femelle de 3 ans, a surpris la RATP en maîtrisant parfaitement le système de transport parisien. Elle possède désormais son propre pass Navigo et effectue quotidiennement le trajet République-Nation pour son travail de facteur.",
    category: "Transport"
  },
  {
    title: "Les vaches normandes produisent désormais du lait déjà transformé en camembert",
    content: "Grâce à une mutation génétique naturelle observée en Normandie, certaines vaches produisent directement du camembert liquide. Les producteurs locaux s'interrogent sur l'impact économique de cette révolution laitière sur l'industrie fromagère.",
    category: "Agriculture"
  },
  {
    title: "Un mime français brise accidentellement sa boîte invisible, provoquant un incident diplomatique",
    content: "Marcel Marceau Jr. a causé un incident international en brisant sa prison de verre invisible place de la République. L'ambassade du Mime a dû intervenir pour expliquer que l'objet n'existait pas réellement, créant une crise existentielle majeure.",
    category: "Culture"
  },
  {
    title: "Les accordéons deviennent obligatoires dans tous les ascenseurs français",
    content: "Le gouvernement français a voté une loi rendant obligatoire la présence d'un accordéoniste dans chaque ascenseur du territoire. Cette mesure vise à promouvoir la culture française et à réduire le stress des utilisateurs lors des montées.",
    category: "Législation"
  },
  {
    title: "Un château de sable obtient le statut de monument historique",
    content: "Le château de sable construit par le petit Timothée, 8 ans, sur la plage de Deauville a été classé monument historique après avoir résisté mystérieusement à 47 marées consécutives. Les archéologues étudient ce phénomène inexpliqué.",
    category: "Patrimoine"
  },
  {
    title: "Les poissons rouges français apprennent collectivement l'anglais",
    content: "Une étude surprenante révèle que 73% des poissons rouges domestiques français ont développé des compétences linguistiques en anglais. Les propriétaires rapportent des conversations nocturnes sur la politique internationale et le Brexit.",
    category: "Éducation"
  },
  {
    title: "Un nouveau département français découvert entre Paris et Lyon",
    content: "Les géographes ont confirmé l'existence d'un 102ème département français, situé dans une dimension parallèle accessible uniquement les mardis pluvieux entre 14h17 et 14h23. La préfecture se trouve dans la ville imaginaire de Bourg-en-Nulle-Part.",
    category: "Géographie"
  },
  {
    title: "Les réveils français se synchronisent spontanément sur l'heure du coq",
    content: "Phénomène inexpliqué : tous les réveils de France se règlent automatiquement sur le chant du coq le plus proche. Cette synchronisation naturelle inquiète les horlogers mais ravit les défenseurs de la tradition rurale française.",
    category: "Technologie"
  },
  {
    title: "Un GPS français refuse de calculer d'itinéraires sans pause déjeuner",
    content: "La dernière mise à jour des GPS français inclut une fonction 'pause déjeuner obligatoire'. L'appareil refuse désormais de calculer un trajet de plus de 2h sans prévoir un arrêt dans un restaurant traditionnel français entre 12h et 14h.",
    category: "Tech"
  },
  {
    title: "Les escargots de Bourgogne organisent une grève pour de meilleures conditions de travail",
    content: "Les escargots de Bourgogne ont cessé leur production de bave et refusent de sortir de leur coquille pour protester contre leurs conditions de travail. Ils revendiquent plus de temps libre et des jardins bio pour leur alimentation.",
    category: "Social"
  }
];

// Fonctions utilitaires pour gérer les fausses news
export const getRandomFakeNews = () => {
  const randomIndex = Math.floor(Math.random() * fakeNewsData.length);
  return fakeNewsData[randomIndex];
};

export const getFakeNewsByCategory = (category) => {
  return fakeNewsData.filter(news => news.category.toLowerCase() === category.toLowerCase());
};

export const getAllCategories = () => {
  return [...new Set(fakeNewsData.map(news => news.category))];
};