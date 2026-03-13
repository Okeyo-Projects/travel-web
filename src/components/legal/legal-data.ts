export type LegalBullet = {
  text: string;
  children?: LegalBullet[];
};

export type LegalSection = {
  id: string;
  title: string;
  intro?: string;
  paragraphs?: string[];
  bullets?: LegalBullet[];
};

export const LEGAL_LAST_UPDATED = "13 mars 2026";

export const termsSections: LegalSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    paragraphs: [
      "Les présentes Conditions d'utilisation encadrent l'accès et l'usage de la plateforme okeyo travel pour la réservation d'hébergements, d'activités et de voyages.",
      "En créant un compte, en publiant une offre ou en effectuant une réservation, vous acceptez ces conditions en tant qu'utilisateur ou prestataire.",
    ],
  },
  {
    id: "definitions",
    title: "Définitions",
    bullets: [
      {
        text: "Utilisateur : toute personne qui consulte, réserve ou paie une offre via la plateforme.",
      },
      {
        text: "Prestataire : toute personne ou structure qui publie une offre d'hébergement, d'activité ou de voyage.",
      },
      {
        text: "Réservation : toute commande validée après confirmation du paiement ou selon le mode affiché lors du checkout.",
      },
      {
        text: "Contenu : les textes, photos, vidéos, avis, calendriers et autres éléments mis en ligne sur okeyo travel.",
      },
      {
        text: "Plateforme : le site web, l'application mobile et les services associés exploités sous la marque okeyo travel.",
      },
    ],
  },
  {
    id: "account-registration",
    title: "Inscription et Compte",
    intro:
      "L'accès à certaines fonctionnalités suppose la création d'un compte.",
    bullets: [
      {
        text: "Vous devez fournir des informations exactes, complètes et mises à jour.",
      },
      {
        text: "Vous êtes responsable de la confidentialité de vos identifiants et des actions réalisées depuis votre compte.",
      },
      {
        text: "Vous devez être légalement autorisé à publier une offre ou à effectuer une réservation.",
      },
      {
        text: "Nous pouvons suspendre ou supprimer un compte en cas de fraude, d'abus ou de violation grave des présentes conditions.",
      },
    ],
  },
  {
    id: "booking-payments",
    title: "Réservations et Paiements",
    bullets: [
      {
        text: "Les réservations sont effectuées via la plateforme selon les disponibilités, prix et conditions affichés au moment de la commande.",
      },
      {
        text: "Les utilisateurs acceptent le prix affiché, les éventuels frais de service et les conditions particulières du prestataire.",
      },
      {
        text: "Les paiements sont traités via nos partenaires de paiement sécurisés. Les informations bancaires complètes ne sont pas stockées sur nos serveurs.",
      },
      {
        text: "Le prestataire reste responsable de la bonne exécution de la prestation réservée.",
      },
    ],
  },
  {
    id: "cancellation-policy",
    title: "Annulation et Remboursement",
    bullets: [
      {
        text: "Chaque offre peut comporter ses propres conditions d'annulation, clairement affichées avant confirmation de la réservation.",
      },
      {
        text: "En cas d'annulation par le prestataire, l'utilisateur peut prétendre au remboursement intégral du montant payé.",
      },
      {
        text: "Les délais de remboursement dépendent également du prestataire de paiement utilisé.",
      },
      {
        text: "Les annulations abusives, répétées ou contraires aux règles de la plateforme peuvent entraîner des restrictions de compte.",
      },
    ],
  },
  {
    id: "user-conduct",
    title: "Conduite de l'Utilisateur",
    intro: "L'utilisateur s'engage à utiliser la plateforme de manière loyale et conforme à la loi.",
    bullets: [
      {
        text: "Sont notamment interdits :",
        children: [
          { text: "les fausses réservations ou les paiements frauduleux" },
          { text: "les commentaires insultants, diffamatoires ou mensongers" },
          { text: "le contournement du système de réservation, de paiement ou de commissions" },
          { text: "toute utilisation illégale, nuisible ou trompeuse de la plateforme" },
        ],
      },
      {
        text: "L'utilisateur doit respecter les règles du lieu, les horaires, les consignes de sécurité et les instructions du prestataire.",
      },
    ],
  },
  {
    id: "host-obligations",
    title: "Obligations du Prestataire",
    intro:
      "Le prestataire reste seul responsable du contenu de son offre et de l'exécution du service proposé.",
    bullets: [
      {
        text: "Publier des informations exactes, transparentes et à jour sur les offres, tarifs, disponibilités et restrictions.",
      },
      {
        text: "Disposer des autorisations, licences, assurances et droits nécessaires pour proposer l'offre publiée.",
      },
      {
        text: "Fournir des photos et vidéos fidèles, réelles et libres de droits.",
      },
      {
        text: "Honorer les réservations confirmées et assurer un niveau de sécurité, de propreté et de qualité conforme à la description.",
      },
      {
        text: "Collaborer avec okeyo travel en cas de litige, réclamation ou incident lié à une réservation.",
      },
    ],
  },
  {
    id: "intellectual-property",
    title: "Propriété Intellectuelle",
    bullets: [
      {
        text: "Les éléments graphiques, marques, logos, textes et interfaces de la plateforme restent la propriété d'okeyo travel ou de ses concédants.",
      },
      {
        text: "Vous conservez les droits sur les contenus que vous publiez, mais vous accordez à okeyo travel une licence nécessaire pour les héberger, afficher et promouvoir les offres sur ses supports.",
      },
      {
        text: "Il est interdit de copier, reproduire, extraire ou exploiter les contenus ou la marque sans autorisation préalable.",
      },
    ],
  },
  {
    id: "limitation-of-liability",
    title: "Limitation de Responsabilité",
    bullets: [
      {
        text: "okeyo travel agit comme intermédiaire entre utilisateurs et prestataires et ne remplace pas leurs obligations respectives.",
      },
      {
        text: "Nous ne pouvons être tenus responsables des retards, annulations, accidents, pertes ou dommages causés par un prestataire ou par un événement extérieur échappant à notre contrôle raisonnable.",
      },
      {
        text: "Chaque partie demeure responsable de ses déclarations, de son comportement et du respect des lois qui lui sont applicables.",
      },
    ],
  },
  {
    id: "dispute-resolution",
    title: "Litiges et Droit Applicable",
    paragraphs: [
      "En cas de différend, les parties s'engagent à rechercher d'abord une solution amiable avec l'aide du support okeyo travel.",
      "À défaut d'accord amiable, le litige pourra être soumis aux juridictions compétentes du Maroc, sous réserve des règles impératives applicables au consommateur.",
    ],
  },
  {
    id: "changes-to-terms",
    title: "Modifications des Conditions",
    paragraphs: [
      "Nous pouvons mettre à jour ces conditions pour refléter l'évolution de la plateforme, des obligations légales ou de notre modèle de service.",
      "En cas de modification importante, nous publierons une version mise à jour sur cette page et pourrons vous en informer par e-mail ou via l'application.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    bullets: [
      { text: "Support général : support@okeyo.ma" },
      { text: "Questions juridiques : legal@okeyo.ma" },
      { text: "Adresse de contact : okeyo travel, Maroc" },
    ],
  },
];

export const privacySections: LegalSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    paragraphs: [
      "La présente Politique de confidentialité explique comment okeyo travel collecte, utilise, partage et protège vos données personnelles lorsque vous utilisez la plateforme.",
      "Nous nous engageons à traiter ces informations avec transparence, sécurité et conformément aux lois applicables.",
    ],
  },
  {
    id: "data-we-collect",
    title: "Données que Nous Collectons",
    intro:
      "Nous collectons les informations nécessaires pour créer un compte, gérer les réservations et améliorer l'expérience utilisateur.",
    bullets: [
      {
        text: "Informations de compte :",
        children: [
          { text: "nom, prénom, e-mail et numéro de téléphone" },
          { text: "photo de profil et préférences de compte si vous les renseignez" },
        ],
      },
      {
        text: "Informations de réservation :",
        children: [
          { text: "dates, nombre de voyageurs, options sélectionnées et historique des transactions" },
          { text: "coordonnées nécessaires au traitement de la réservation" },
        ],
      },
      {
        text: "Données prestataire :",
        children: [
          { text: "informations professionnelles et détails des offres publiées" },
          { text: "calendriers, photos, descriptions et informations de versement" },
        ],
      },
      {
        text: "Données techniques et d'usage :",
        children: [
          { text: "adresse IP, type d'appareil, système d'exploitation et journaux techniques" },
          { text: "pages consultées, recherches, favoris et interactions avec la plateforme" },
        ],
      },
    ],
  },
  {
    id: "how-we-use-data",
    title: "Comment Nous Utilisons les Données",
    bullets: [
      {
        text: "Fournir nos services :",
        children: [
          { text: "créer et gérer votre compte" },
          { text: "traiter les réservations et paiements" },
          { text: "faciliter les échanges entre utilisateurs, prestataires et support" },
        ],
      },
      {
        text: "Améliorer l'expérience :",
        children: [
          { text: "personnaliser les résultats et recommandations" },
          { text: "mesurer l'utilisation de la plateforme et développer de nouvelles fonctionnalités" },
        ],
      },
      {
        text: "Sécurité et conformité :",
        children: [
          { text: "prévenir la fraude, les abus et les activités illégales" },
          { text: "respecter nos obligations légales, comptables et réglementaires" },
        ],
      },
    ],
  },
  {
    id: "data-sharing",
    title: "Partage des Données",
    bullets: [
      {
        text: "Avec les prestataires : nous partageons les informations nécessaires à l'exécution de la réservation.",
      },
      {
        text: "Avec nos sous-traitants : hébergement cloud, analyse, support client, notifications et prestataires de paiement.",
      },
      {
        text: "Avec les autorités compétentes lorsque la loi l'exige ou pour protéger nos droits, nos utilisateurs ou la sécurité de la plateforme.",
      },
      {
        text: "Avec votre consentement lorsque vous choisissez explicitement une intégration ou un partage spécifique.",
      },
    ],
    paragraphs: [
      "Nous ne vendons pas vos données personnelles à des tiers à des fins commerciales.",
    ],
  },
  {
    id: "cookies",
    title: "Cookies et Technologies Similaires",
    bullets: [
      {
        text: "Cookies essentiels pour maintenir la session, sécuriser la connexion et mémoriser certaines préférences.",
      },
      {
        text: "Outils de mesure d'audience et de performance pour comprendre l'usage du produit et améliorer nos interfaces.",
      },
      {
        text: "Technologies de personnalisation et de communication, sous réserve des réglages disponibles sur votre appareil ou navigateur.",
      },
    ],
  },
  {
    id: "data-retention",
    title: "Conservation des Données",
    bullets: [
      {
        text: "Les données de compte sont conservées tant que votre compte reste actif, puis pendant une durée raisonnable pour gérer les obligations légales ou les litiges.",
      },
      {
        text: "Les données de réservation et de paiement peuvent être conservées plus longtemps pour répondre aux obligations comptables, fiscales ou réglementaires.",
      },
      {
        text: "Les journaux techniques sont conservés pendant une période limitée nécessaire à la sécurité, au support et à l'analyse produit.",
      },
    ],
  },
  {
    id: "your-rights",
    title: "Vos Droits",
    intro:
      "Selon la loi applicable, vous pouvez exercer plusieurs droits sur vos données personnelles.",
    bullets: [
      {
        text: "Demander l'accès aux données que nous détenons à votre sujet.",
      },
      {
        text: "Demander la correction ou la mise à jour des informations inexactes.",
      },
      {
        text: "Demander l'effacement, la limitation du traitement ou la portabilité de vos données lorsque ces droits s'appliquent.",
      },
      {
        text: "Vous opposer à certains traitements, notamment liés au marketing direct.",
      },
      {
        text: "Retirer votre consentement lorsque le traitement repose sur ce fondement.",
      },
    ],
    paragraphs: [
      "Pour exercer ces droits, contactez-nous à privacy@okeyo.ma. Nous répondrons dans les délais requis par la réglementation applicable.",
    ],
  },
  {
    id: "security",
    title: "Sécurité",
    bullets: [
      {
        text: "Nous mettons en place des mesures techniques et organisationnelles destinées à protéger les données contre l'accès non autorisé, la perte, l'altération ou la divulgation.",
      },
      {
        text: "Les données sensibles sont protégées par des contrôles d'accès, du chiffrement en transit et des pratiques de surveillance adaptées.",
      },
      {
        text: "Les paiements sont traités par des partenaires spécialisés conformes aux standards de sécurité applicables.",
      },
    ],
  },
  {
    id: "childrens-privacy",
    title: "Données des Mineurs",
    paragraphs: [
      "okeyo travel n'est pas destiné aux personnes de moins de 18 ans. Nous ne collectons pas sciemment de données personnelles de mineurs.",
      "Si vous pensez qu'un mineur nous a transmis des informations personnelles, contactez-nous afin que nous puissions examiner et supprimer ces données si nécessaire.",
    ],
  },
  {
    id: "changes-to-policy",
    title: "Modifications de la Politique",
    paragraphs: [
      "Cette politique peut être mise à jour pour refléter des évolutions légales, techniques ou opérationnelles.",
      "La version la plus récente est toujours publiée sur cette page avec sa date de mise à jour.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    bullets: [
      { text: "Confidentialité : privacy@okeyo.ma" },
      { text: "Support : support@okeyo.ma" },
      { text: "Adresse de contact : okeyo travel, Maroc" },
    ],
  },
];
